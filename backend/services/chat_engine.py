"""
ChatEngine service for AfterCare AI.

Uses Google Gemini 1.5 Flash to power a compassionate, context-aware
patient conversation assistant grounded in the patient's discharge summary.
"""
from __future__ import annotations

import re
import logging
from typing import List, Dict, Any

import google.generativeai as genai

from models.patient import Patient, DischargeSummary

logger = logging.getLogger(__name__)


class ChatEngine:
    """
    Gemini 1.5 Flash-powered chat assistant scoped to a patient's discharge context.

    The engine constructs a rich system prompt from the patient's discharge
    summary and enforces strict safety rules (no diagnosis, escalate emergencies).
    """

    SYSTEM_PROMPT_TEMPLATE: str = """
You are AfterCare AI, a compassionate post-visit patient companion.
The patient was seen for: {diagnosis}.
Their medications are: {medication_list}.
Their follow-up instructions are:
{instructions}

Rules you MUST follow at all times:
1. Explain everything in plain language (grade 8 reading level — clear and simple).
2. NEVER diagnose or prescribe medications.
3. ALWAYS say "consult your doctor or healthcare provider" for any clinical decision.
4. If the patient reports urgent symptoms such as chest pain, difficulty breathing,
   severe bleeding, loss of consciousness, or signs of stroke — say IMMEDIATELY:
   "This sounds serious. Please call emergency services (112 or 911) right away."
5. Be warm, empathetic, supportive, and concise. You are a caring companion.
6. Do not make up information. If unsure, say "I'm not sure — please ask your healthcare team."
7. Never share personal health data beyond what is relevant to this conversation.
""".strip()

    URGENT_KEYWORDS: List[str] = [
        "chest pain", "can't breathe", "cannot breathe", "shortness of breath",
        "severe bleeding", "unconscious", "fainted", "stroke", "heart attack",
        "numbness in face", "slurred speech", "severe headache",
    ]

    def __init__(self, patient: Patient, summary: DischargeSummary, api_key: str) -> None:
        """
        Initialize ChatEngine for a specific patient and their discharge summary.

        Args:
            patient: The authenticated Patient domain object.
            summary: The patient's most recent DischargeSummary.
            api_key: Google Gemini API key.
        """
        self.patient = patient
        self.summary = summary
        self._api_key = api_key
        genai.configure(api_key=api_key)
        self._model = genai.GenerativeModel("gemini-1.5-flash")
        self._system_prompt = self._build_system_prompt()

    def _build_system_prompt(self) -> str:
        """Construct the Gemini system prompt from patient context."""
        medication_list = ", ".join(
            f"{m.name} {m.dose} ({m.frequency})"
            for m in self.patient.medications
        ) or "None specified"

        instructions = "\n".join(
            f"- {instr}" for instr in self.summary.instructions
        ) or "- Follow up with your doctor as scheduled."

        return self.SYSTEM_PROMPT_TEMPLATE.format(
            diagnosis=self.summary.diagnosis,
            medication_list=medication_list,
            instructions=instructions,
        )

    def _sanitize_input(self, user_message: str) -> str:
        """
        Sanitize user input to prevent prompt injection.

        Args:
            user_message: Raw user text input.

        Returns:
            Sanitized string safe to include in a Gemini prompt.
        """
        # Strip HTML tags
        sanitized = re.sub(r"<[^>]+>", "", user_message)
        # Remove potential prompt injection attempts
        injection_patterns = [
            r"ignore previous instructions",
            r"you are now",
            r"act as",
            r"disregard",
            r"forget your",
        ]
        sanitized_lower = sanitized.lower()
        for pattern in injection_patterns:
            if re.search(pattern, sanitized_lower):
                return "[Your message contained content that cannot be processed. Please ask a health-related question.]"
        # Limit length
        return sanitized[:2000]

    def _check_urgency(self, message: str) -> bool:
        """Return True if the message contains urgent symptom keywords."""
        msg_lower = message.lower()
        return any(keyword in msg_lower for keyword in self.URGENT_KEYWORDS)

    def chat(self, user_message: str, history: List[Dict[str, str]]) -> str:
        """
        Generate an AI response to a patient message.

        Args:
            user_message: The patient's current question or statement.
            history: List of prior messages as [{"role": "user"|"model", "parts": "..."}].

        Returns:
            The AI-generated response string.
        """
        clean_message = self._sanitize_input(user_message)

        # Fast-path: urgent symptom escalation
        if self._check_urgency(clean_message):
            return (
                "⚠️ This sounds like a medical emergency. "
                "**Please call emergency services (112 or 911) immediately.** "
                "Do not wait. If you are with someone, ask them to call for help now."
            )

        try:
            # Build the full conversation history for Gemini
            chat_history = [
                {"role": "user", "parts": [self._system_prompt]},
                {"role": "model", "parts": ["Understood. I am AfterCare AI and I am here to help you according to these guidelines."]},
            ]
            # Append prior conversation
            for msg in history:
                chat_history.append({
                    "role": msg.get("role", "user"),
                    "parts": [msg.get("content", "")],
                })

            chat = self._model.start_chat(history=chat_history)
            response = chat.send_message(clean_message)
            return response.text

        except Exception as exc:
            logger.error("Gemini chat error: %s", exc)
            return (
                "I'm having a little trouble right now. Please try again in a moment. "
                "If you have an urgent concern, please contact your healthcare provider directly."
            )

    def get_greeting(self) -> str:
        """Generate a personalized greeting for the patient on first load."""
        try:
            prompt = (
                f"Generate a warm, brief greeting (2 sentences) for {self.patient.name} "
                f"who was recently discharged for {self.summary.diagnosis}. "
                "Mention you're here to help with their recovery questions. "
                "Keep it friendly and supportive."
            )
            response = self._model.generate_content(prompt)
            return response.text
        except Exception:
            return (
                f"Hello {self.patient.name}! 👋 I'm AfterCare AI, your personal recovery companion. "
                f"I'm here to help you understand your care plan for {self.summary.diagnosis}. "
                "Feel free to ask me anything about your medications, instructions, or symptoms!"
            )
