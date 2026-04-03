"""
Appointments API routes for AfterCare AI.

Handles appointment creation, listing, and Google Calendar synchronization.
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from middleware.auth import get_current_uid
from models.patient import Appointment
from services.appointment_service import AppointmentService
from services.patient_service import PatientService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/appointments", tags=["appointments"])


# ──────────────────────────── Pydantic schemas ────────────────────────────

class AppointmentRequest(BaseModel):
    title: str
    appointment_datetime: str  # ISO 8601 format
    location: str
    instructions: str = ""


class AppointmentResponse(BaseModel):
    id: str
    title: str
    appointment_datetime: str
    location: str
    instructions: str
    google_event_id: str = ""


# ──────────────────────────── Routes ──────────────────────────────────────

@router.post("/book", summary="Book a new appointment")
async def book_appointment(
    body: AppointmentRequest,
    request: Request,
    uid: str = Depends(get_current_uid),
) -> Dict[str, Any]:
    """
    Create a new appointment and optionally sync it to Google Calendar.
    """
    patient_service: PatientService = request.app.state.patient_service
    appointment_service: AppointmentService = request.app.state.appointment_service

    patient = patient_service.get_patient(uid)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found.",
        )

    try:
        appt_dt = datetime.fromisoformat(body.appointment_datetime)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="appointment_datetime must be ISO 8601 format (e.g. 2026-05-14T09:00:00).",
        )

    appt = appointment_service.create_appointment_from_request(
        title=body.title,
        appointment_datetime=appt_dt,
        location=body.location,
        instructions=body.instructions,
    )

    booked = appointment_service.book_appointment(patient, appt)

    return {
        "message": "Appointment booked successfully.",
        "appointment": booked.to_dict(),
        "calendar_synced": booked.google_event_id is not None,
    }


@router.get("/list", summary="List all appointments for the authenticated patient")
async def list_appointments(
    request: Request,
    uid: str = Depends(get_current_uid),
) -> Dict[str, Any]:
    """Return all appointments for the authenticated patient, sorted by date."""
    patient_service: PatientService = request.app.state.patient_service

    patient = patient_service.get_patient(uid)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found.",
        )

    upcoming = patient.upcoming_appointments()

    return {
        "appointments": [a.to_dict() for a in upcoming],
        "total": len(upcoming),
    }
