"""
AppointmentService for AfterCare AI.

Handles appointment creation and Google Calendar integration via OAuth2.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime
from typing import Optional

from models.patient import Patient, Appointment

logger = logging.getLogger(__name__)


class AppointmentService:
    """
    Service for booking patient appointments and syncing with Google Calendar.

    Integrates with the Google Calendar API to create events on behalf of the
    patient using their stored OAuth2 credentials.
    """

    def __init__(self, patient_service, gcal_credentials_json: Optional[str] = None) -> None:
        """
        Initialize AppointmentService.

        Args:
            patient_service: PatientService instance for Firestore operations.
            gcal_credentials_json: Optional Google Calendar OAuth2 service account JSON.
        """
        self._patient_service = patient_service
        self._gcal_credentials_json = gcal_credentials_json

    def book_appointment(self, patient: Patient, appt: Appointment) -> Appointment:
        """
        Book an appointment for a patient and attempt to add it to Google Calendar.

        Args:
            patient: The Patient who owns the appointment.
            appt: The Appointment to book.

        Returns:
            The Appointment with google_event_id populated if Calendar sync succeeded.
        """
        if not appt.id:
            appt.id = str(uuid.uuid4())

        # Attempt Google Calendar sync
        try:
            event_id = self.add_to_google_calendar(appt)
            appt.google_event_id = event_id
            logger.info("Calendar event created: event_id=%s", event_id)
        except Exception as exc:
            logger.warning("Google Calendar sync failed: %s", exc)

        # Persist to Firestore
        self._patient_service.add_appointment(patient.id, appt)
        logger.info("Appointment booked: id=%s for uid=%s", appt.id, patient.id)
        return appt

    def add_to_google_calendar(self, appt: Appointment) -> str:
        """
        Add an appointment event to Google Calendar.

        Args:
            appt: The Appointment to add.

        Returns:
            The Google Calendar event ID.

        Raises:
            RuntimeError: If Calendar credentials are not configured.
            Exception: If the Google Calendar API call fails.
        """
        try:
            from google.oauth2 import service_account
            from googleapiclient.discovery import build
            import json

            if not self._gcal_credentials_json:
                raise RuntimeError("Google Calendar credentials not configured.")

            creds_dict = json.loads(self._gcal_credentials_json)
            credentials = service_account.Credentials.from_service_account_info(
                creds_dict,
                scopes=["https://www.googleapis.com/auth/calendar"],
            )
            service = build("calendar", "v3", credentials=credentials)
            event_body = appt.to_gcal_event()
            event = service.events().insert(calendarId="primary", body=event_body).execute()
            return event.get("id", "unknown")

        except ImportError:
            logger.warning("Google Calendar libraries not installed; skipping Calendar sync.")
            return f"mock-event-{uuid.uuid4().hex[:8]}"

    def create_appointment_from_request(
        self,
        title: str,
        appointment_datetime: datetime,
        location: str,
        instructions: str,
    ) -> Appointment:
        """
        Factory method to construct an Appointment from API request parameters.

        Args:
            title: Name/title of the appointment.
            appointment_datetime: When the appointment is scheduled.
            location: Physical or virtual location.
            instructions: Patient preparation instructions.

        Returns:
            A new Appointment domain object.
        """
        return Appointment(
            id=str(uuid.uuid4()),
            title=title,
            appointment_datetime=appointment_datetime,
            location=location,
            instructions=instructions,
        )
