"""
Chat API routes for AfterCare AI.

Powers the Gemini-driven patient chat interface.
All messages are scoped to the authenticated patient's discharge context.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from middleware.auth import get_current_uid
from services.chat_engine import ChatEngine
from services.patient_service import PatientService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["chat"])


# ──────────────────────────── Pydantic schemas ────────────────────────────

class ChatMessage(BaseModel):
    role: str  # "user" or "model"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []


class ChatResponse(BaseModel):
    reply: str
    is_urgent: bool = False


# ──────────────────────────── Routes ──────────────────────────────────────

@router.post("/send", response_model=ChatResponse, summary="Send a message to AfterCare AI")
async def send_message(
    body: ChatRequest,
    request: Request,
    uid: str = Depends(get_current_uid),
) -> ChatResponse:
    """
    Process a patient's chat message through Gemini with discharge context.

    Returns AI response text and a flag if the message indicates urgency.
    """
    patient_service: PatientService = request.app.state.patient_service
    gemini_api_key: str = request.app.state.gemini_api_key

    patient = patient_service.get_patient(uid)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found. Please complete onboarding.",
        )

    summary = patient.latest_summary()
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No discharge summary found. Please upload your summary first.",
        )

    engine = ChatEngine(patient, summary, gemini_api_key)

    history_dicts = [
        {"role": msg.role, "content": msg.content}
        for msg in body.history
    ]

    reply = engine.chat(body.message, history_dicts)

    # Detect urgency in the reply (engine already prepends ⚠️ for urgent cases)
    is_urgent = reply.startswith("⚠️")

    return ChatResponse(reply=reply, is_urgent=is_urgent)


@router.get("/greeting", summary="Get personalized AI greeting for the patient")
async def get_greeting(
    request: Request,
    uid: str = Depends(get_current_uid),
) -> Dict[str, Any]:
    """Return a personalized greeting from AfterCare AI based on the patient's context."""
    patient_service: PatientService = request.app.state.patient_service
    gemini_api_key: str = request.app.state.gemini_api_key

    patient = patient_service.get_patient(uid)
    if not patient:
        return {"greeting": "Welcome to AfterCare AI! Let's get you set up."}

    summary = patient.latest_summary()
    if not summary:
        return {"greeting": f"Hello {patient.name}! Please upload your discharge summary to get started."}

    engine = ChatEngine(patient, summary, gemini_api_key)
    greeting = engine.get_greeting()

    return {"greeting": greeting, "patient_name": patient.name}
