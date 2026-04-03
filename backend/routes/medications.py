"""
Medications API routes for AfterCare AI.

Handles medication schedule retrieval, dose marking, and reminder scheduling.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from middleware.auth import get_current_uid
from services.patient_service import PatientService
from services.reminder_service import ReminderService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/medications", tags=["medications"])


# ──────────────────────────── Pydantic schemas ────────────────────────────

class MarkTakenRequest(BaseModel):
    med_id: str
    time: str


# ──────────────────────────── Routes ──────────────────────────────────────

@router.get("/list", summary="List all medications for the authenticated patient")
async def list_medications(
    request: Request,
    uid: str = Depends(get_current_uid),
) -> Dict[str, Any]:
    """Return all current medications with today's adherence status."""
    patient_service: PatientService = request.app.state.patient_service

    patient = patient_service.get_patient(uid)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found.",
        )

    meds_data = [m.to_dict() for m in patient.medications]
    adherence = patient.overall_adherence()

    return {
        "medications": meds_data,
        "overall_adherence_pct": round(adherence, 1),
        "count": len(meds_data),
    }


@router.post("/taken", summary="Mark a medication dose as taken")
async def mark_taken(
    body: MarkTakenRequest,
    request: Request,
    uid: str = Depends(get_current_uid),
) -> Dict[str, Any]:
    """Mark a specific dose taken for a given medication."""
    patient_service: PatientService = request.app.state.patient_service

    success = patient_service.update_medication_taken(uid, body.med_id, body.time)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Medication {body.med_id} not found.",
        )

    return {"message": f"Medication {body.med_id} marked as taken at {body.time}."}


@router.post("/schedule-reminders", summary="Schedule medication reminders via Cloud Tasks")
async def schedule_reminders(
    request: Request,
    uid: str = Depends(get_current_uid),
) -> Dict[str, Any]:
    """Schedule Cloud Tasks push notification reminders for all of today's medications."""
    patient_service: PatientService = request.app.state.patient_service
    reminder_service: ReminderService = request.app.state.reminder_service

    patient = patient_service.get_patient(uid)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found.",
        )

    count = reminder_service.schedule_medication_reminders(patient)

    return {
        "message": f"Scheduled {count} medication reminder(s) for today.",
        "reminders_scheduled": count,
    }
