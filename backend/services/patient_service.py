"""
PatientService for AfterCare AI.

Manages all Firestore read/write operations for the Patient domain,
ensuring every operation is scoped to the authenticated user's UID.
"""
from __future__ import annotations

import logging
import uuid
from typing import Optional

from firebase_admin import firestore

from models.patient import Patient, Medication, SymptomLog, DischargeSummary, Appointment

logger = logging.getLogger(__name__)


class PatientService:
    """
    Service layer for patient data persistence in Firestore.

    All operations are gated by the Firebase Auth UID to ensure
    each patient can only access their own data.
    """

    COLLECTION = "patients"

    def __init__(self, db: firestore.Client) -> None:
        """
        Initialize PatientService with a Firestore client.

        Args:
            db: An authenticated Firebase Admin Firestore client.
        """
        self._db = db

    def get_patient(self, uid: str) -> Optional[Patient]:
        """
        Retrieve a Patient by their Firebase Auth UID.

        Args:
            uid: Firebase Auth UID of the patient.

        Returns:
            Patient instance if found, None otherwise.
        """
        doc_ref = self._db.collection(self.COLLECTION).document(uid)
        doc = doc_ref.get()

        if not doc.exists:
            logger.info("No patient found for uid=%s", uid)
            return None

        patient = Patient.from_dict(doc.to_dict())
        logger.info("Loaded patient uid=%s name=%s", uid, patient.name)
        return patient

    def create_patient(self, patient: Patient) -> Patient:
        """
        Create a new patient document in Firestore.

        Args:
            patient: The Patient object to persist.

        Returns:
            The persisted Patient with populated id.
        """
        doc_ref = self._db.collection(self.COLLECTION).document(patient.id)
        doc_ref.set(patient.to_dict())
        logger.info("Created patient uid=%s", patient.id)
        return patient

    def update_medication_taken(self, uid: str, med_id: str, time: str) -> bool:
        """
        Mark a single medication dose as taken.

        Args:
            uid: Patient's Firebase Auth UID.
            med_id: The medication ID to update.
            time: The scheduled time string (e.g. "08:00").

        Returns:
            True if successfully updated, False if medication not found.
        """
        patient = self.get_patient(uid)
        if not patient:
            return False

        for med in patient.medications:
            if med.id == med_id:
                med.mark_taken(time)
                doc_ref = self._db.collection(self.COLLECTION).document(uid)
                doc_ref.update({
                    "medications": [m.to_dict() for m in patient.medications]
                })
                logger.info("Marked %s as taken for uid=%s", med.name, uid)
                return True

        logger.warning("Medication id=%s not found for uid=%s", med_id, uid)
        return False

    def add_symptom_log(self, uid: str, log: SymptomLog) -> SymptomLog:
        """
        Append a new symptom log to the patient's record.

        Args:
            uid: Patient Firebase Auth UID.
            log: The SymptomLog to add.

        Returns:
            The appended SymptomLog (with assigned id).
        """
        if not log.id:
            log.id = str(uuid.uuid4())

        doc_ref = self._db.collection(self.COLLECTION).document(uid)
        doc_ref.update({
            "symptom_logs": firestore.ArrayUnion([log.to_dict()])
        })
        logger.info("Added symptom log id=%s for uid=%s", log.id, uid)
        return log

    def save_summary(self, uid: str, summary: DischargeSummary) -> DischargeSummary:
        """
        Add or update a DischargeSummary in the patient's record.

        Args:
            uid: Patient Firebase Auth UID.
            summary: DischargeSummary to save.

        Returns:
            The saved DischargeSummary.
        """
        patient = self.get_patient(uid)
        if not patient:
            raise ValueError(f"Patient {uid} not found.")

        # Replace existing or append
        existing_ids = {s.id for s in patient.summaries}
        if summary.id in existing_ids:
            patient.summaries = [s if s.id != summary.id else summary for s in patient.summaries]
        else:
            patient.summaries.append(summary)

        doc_ref = self._db.collection(self.COLLECTION).document(uid)
        doc_ref.update({
            "summaries": [s.to_dict() for s in patient.summaries]
        })
        logger.info("Saved summary id=%s for uid=%s", summary.id, uid)
        return summary

    def add_appointment(self, uid: str, appointment: Appointment) -> Appointment:
        """
        Add a new appointment to the patient's record.

        Args:
            uid: Patient Firebase Auth UID.
            appointment: Appointment to persist.

        Returns:
            The saved Appointment.
        """
        doc_ref = self._db.collection(self.COLLECTION).document(uid)
        doc_ref.update({
            "appointments": firestore.ArrayUnion([appointment.to_dict()])
        })
        logger.info("Added appointment id=%s for uid=%s", appointment.id, uid)
        return appointment

    def reset_daily_medications(self, uid: str) -> None:
        """Reset taken_today=0 for all medications (called by Cloud Tasks at midnight)."""
        patient = self.get_patient(uid)
        if not patient:
            return
        for med in patient.medications:
            med.taken_today = 0
        doc_ref = self._db.collection(self.COLLECTION).document(uid)
        doc_ref.update({
            "medications": [m.to_dict() for m in patient.medications]
        })
        logger.info("Reset daily medications for uid=%s", uid)
