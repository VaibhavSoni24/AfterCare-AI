"""
Patient API routes for AfterCare AI.

Handles patient data retrieval, FHIR upload, medication tracking, and symptom logging.
All routes require a valid Firebase ID token.
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel

from middleware.auth import get_current_uid
from models.patient import Patient, SymptomLog
from services.patient_service import PatientService
from services.summary_parser import SummaryParser

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/patient", tags=["patient"])


# ──────────────────────────── Pydantic schemas ────────────────────────────

class SymptomLogRequest(BaseModel):
    symptom: str
    severity: int
    note: str = ""


class MedTakenRequest(BaseModel):
    med_id: str
    time: str


# ──────────────────────────── Dependency injection ────────────────────────

def get_services(request: Any):
    """Extract shared services from app state."""
    return request.app.state.patient_service, request.app.state.summary_parser


# ──────────────────────────── Routes ──────────────────────────────────────

@router.get("/me", summary="Get authenticated patient's full profile")
async def get_patient(
    uid: str = Depends(get_current_uid),
    request: Any = None,
) -> Dict[str, Any]:
    """
    Return the authenticated patient's full profile from Firestore.
    Creates a demo patient on first login.
    """
    from fastapi import Request
    patient_service: PatientService = request.app.state.patient_service

    patient = patient_service.get_patient(uid)

    if not patient:
        # Auto-seed demo patient on first login
        user_email = uid + "@demo.aftercareai.com"
        try:
            from firebase_admin import auth as firebase_auth
            fb_user = firebase_auth.get_user(uid)
            user_email = fb_user.email or user_email
        except Exception:
            pass

        patient = Patient.create_demo(uid, user_email)
        patient_service.create_patient(patient)
        logger.info("Seeded demo patient for uid=%s", uid)

    return patient.to_dict()


@router.post("/fhir-upload", summary="Upload a FHIR JSON discharge summary")
async def upload_fhir(
    file: UploadFile = File(...),
    uid: str = Depends(get_current_uid),
    request: Any = None,
) -> Dict[str, Any]:
    """
    Parse and simplify a FHIR R4 JSON discharge summary using Gemini.
    """
    import json
    from fastapi import Request

    patient_service: PatientService = request.app.state.patient_service
    summary_parser: SummaryParser = request.app.state.summary_parser

    if not file.filename.endswith(".json"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JSON files are accepted for FHIR upload.",
        )

    raw_bytes = await file.read()
    try:
        fhir_json = json.loads(raw_bytes)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid JSON: {exc}",
        )

    summary = summary_parser.parse_and_simplify(fhir_json)
    patient_service.save_summary(uid, summary)

    return {
        "message": "Summary parsed and simplified successfully.",
        "summary": summary.to_dict(),
    }


@router.post("/medications/taken", summary="Mark a medication dose as taken")
async def mark_medication_taken(
    body: MedTakenRequest,
    uid: str = Depends(get_current_uid),
    request: Any = None,
) -> Dict[str, Any]:
    """Mark a specific medication taken at the given scheduled time."""
    from fastapi import Request
    patient_service: PatientService = request.app.state.patient_service

    success = patient_service.update_medication_taken(uid, body.med_id, body.time)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Medication {body.med_id} not found for this patient.",
        )

    return {"message": "Medication marked as taken.", "med_id": body.med_id}


@router.post("/symptoms", summary="Log a symptom report")
async def log_symptom(
    body: SymptomLogRequest,
    uid: str = Depends(get_current_uid),
    request: Any = None,
) -> Dict[str, Any]:
    """Log a patient-reported symptom with severity rating."""
    from fastapi import Request
    patient_service: PatientService = request.app.state.patient_service

    if not 1 <= body.severity <= 10:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Severity must be between 1 and 10.",
        )

    import uuid
    log = SymptomLog(
        id=str(uuid.uuid4()),
        symptom=body.symptom,
        severity=body.severity,
        timestamp=datetime.utcnow(),
        note=body.note,
    )

    saved_log = patient_service.add_symptom_log(uid, log)

    return {
        "message": "Symptom logged successfully.",
        "log": saved_log.to_dict(),
        "is_urgent": saved_log.is_urgent(),
    }
