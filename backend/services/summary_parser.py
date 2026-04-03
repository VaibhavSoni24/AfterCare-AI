"""
SummaryParser service for AfterCare AI.

Parses FHIR R4 JSON bundles into DischargeSummary domain objects and
uses Gemini 1.5 Flash to convert clinical text into plain language.
"""
from __future__ import annotations

import logging
from typing import Any, Dict

import google.generativeai as genai

from models.patient import DischargeSummary

logger = logging.getLogger(__name__)


class SummaryParser:
    """
    Handles FHIR parsing and Gemini-powered simplification of discharge summaries.

    Responsibilities:
    - Parse raw FHIR R4 JSON into DischargeSummary domain objects.
    - Use Gemini 1.5 Flash to produce grade-8 reading level plain language.
    """

    SIMPLIFY_PROMPT_TEMPLATE: str = """
You are a medical translator helping patients understand their discharge summary.

Convert the following clinical discharge summary to plain, simple English that anyone can understand (grade 8 reading level). 

Requirements:
- Use short sentences and common words
- Explain medical terms in simple language (in parentheses if needed)
- Organize into sections: What happened, What you need to do, Your medications, When to call the doctor
- Be warm and reassuring while being accurate
- Keep it under 400 words

Clinical Summary:
{clinical_text}

Diagnosis: {diagnosis}

Instructions:
{instructions}
""".strip()

    def __init__(self, api_key: str) -> None:
        """
        Initialize SummaryParser with a Gemini API key.

        Args:
            api_key: Google Gemini API key for text generation.
        """
        self._api_key = api_key
        genai.configure(api_key=api_key)
        self._model = genai.GenerativeModel("gemini-1.5-flash")

    def parse_fhir(self, fhir_json: Dict[str, Any]) -> DischargeSummary:
        """
        Parse a FHIR R4 Bundle into a DischargeSummary domain object.

        Args:
            fhir_json: The FHIR R4 JSON bundle as a Python dict.

        Returns:
            A fully populated DischargeSummary.

        Raises:
            ValueError: If the FHIR JSON is malformed or missing required data.
        """
        if not isinstance(fhir_json, dict):
            raise ValueError("FHIR JSON must be a dictionary.")

        summary = DischargeSummary.parse_from_fhir(fhir_json)
        logger.info("Parsed FHIR summary: diagnosis=%s", summary.diagnosis)
        return summary

    def simplify_with_gemini(self, summary: DischargeSummary) -> str:
        """
        Use Gemini 1.5 Flash to generate a plain-language version of the summary.

        Args:
            summary: The DischargeSummary to simplify.

        Returns:
            A simplified plain-language string.
        """
        instructions_text = "\n".join(
            f"- {instr}" for instr in summary.instructions
        ) or "Follow up with your doctor as scheduled."

        prompt = self.SIMPLIFY_PROMPT_TEMPLATE.format(
            clinical_text=summary.plain_text or "No detailed clinical notes available.",
            diagnosis=summary.diagnosis,
            instructions=instructions_text,
        )

        try:
            response = self._model.generate_content(prompt)
            simplified = response.text.strip()
            logger.info("Gemini simplification successful, length=%d", len(simplified))
            return simplified
        except Exception as exc:
            logger.error("Gemini simplification failed: %s", exc)
            # Fallback: return a basic plain-language version
            return self._fallback_simplification(summary)

    def _fallback_simplification(self, summary: DischargeSummary) -> str:
        """Generate a basic plain-language text without AI when Gemini is unavailable."""
        instructions_text = "\n".join(
            f"• {instr}" for instr in summary.instructions
        )
        return (
            f"**What Happened**\n"
            f"You were treated for: {summary.diagnosis}.\n\n"
            f"**What You Need To Do**\n"
            f"{instructions_text or 'Follow your doctors guidance.'}\n\n"
            f"**Important**\n"
            f"If you feel worse or have new symptoms, contact your doctor or go to the emergency room."
        )

    def parse_and_simplify(self, fhir_json: Dict[str, Any]) -> DischargeSummary:
        """
        Convenience method: parse FHIR and immediately simplify with Gemini.

        Args:
            fhir_json: The FHIR R4 JSON bundle.

        Returns:
            A DischargeSummary with simplified_text populated.
        """
        summary = self.parse_fhir(fhir_json)
        summary.simplified_text = self.simplify_with_gemini(summary)
        return summary
