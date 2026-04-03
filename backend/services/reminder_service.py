"""
ReminderService for AfterCare AI.

Uses Google Cloud Tasks to schedule medication reminder push notifications
delivered via Firebase Cloud Messaging (FCM).
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta
from typing import Optional

from models.patient import Patient, Medication

logger = logging.getLogger(__name__)


class ReminderService:
    """
    Schedules and delivers medication reminders using Cloud Tasks + FCM.

    Each medication's scheduled times are converted into Cloud Tasks
    that trigger the /api/reminders/send endpoint, which then sends
    an FCM push notification to the patient's device.
    """

    REMINDER_ENDPOINT: str = "/api/reminders/send"

    def __init__(
        self,
        project_id: str,
        queue_name: str,
        service_url: str,
        tasks_client=None,
    ) -> None:
        """
        Initialize ReminderService with Cloud Tasks configuration.

        Args:
            project_id: GCP project ID.
            queue_name: Cloud Tasks queue name (e.g. "medication-reminders").
            service_url: Base URL of the Cloud Run service.
            tasks_client: Optional pre-constructed Cloud Tasks client (for testing).
        """
        self._project_id = project_id
        self._queue_name = queue_name
        self._service_url = service_url
        self._tasks_client = tasks_client

    def _get_tasks_client(self):
        """Lazy-initialize the Cloud Tasks client."""
        if self._tasks_client:
            return self._tasks_client
        try:
            from google.cloud import tasks_v2
            self._tasks_client = tasks_v2.CloudTasksClient()
        except ImportError:
            logger.warning("google-cloud-tasks not installed; reminders will be simulated.")
            self._tasks_client = None
        return self._tasks_client

    def schedule_medication_reminders(self, patient: Patient) -> int:
        """
        Schedule Cloud Tasks for all of a patient's upcoming medication doses.

        Args:
            patient: The Patient whose medications need reminders.

        Returns:
            Number of tasks successfully scheduled.
        """
        tasks_scheduled = 0
        today = datetime.utcnow().date()

        for medication in patient.medications:
            for time_str in medication.times:
                try:
                    hour, minute = map(int, time_str.split(":"))
                    scheduled_time = datetime(
                        today.year, today.month, today.day, hour, minute
                    )
                    # Only schedule future reminders
                    if scheduled_time > datetime.utcnow():
                        self._create_task(patient, medication, scheduled_time)
                        tasks_scheduled += 1
                except Exception as exc:
                    logger.error(
                        "Failed to schedule reminder for %s at %s: %s",
                        medication.name, time_str, exc
                    )

        logger.info(
            "Scheduled %d reminders for patient uid=%s",
            tasks_scheduled, patient.id
        )
        return tasks_scheduled

    def _create_task(
        self,
        patient: Patient,
        medication: Medication,
        scheduled_time: datetime,
    ) -> None:
        """
        Create a single Cloud Tasks task for a medication reminder.

        Args:
            patient: The Patient to remind.
            medication: The Medication dose to remind about.
            scheduled_time: When to deliver the reminder (UTC).
        """
        client = self._get_tasks_client()
        if not client:
            logger.info(
                "[SIMULATED] Reminder for %s %s at %s",
                patient.name, medication.name, scheduled_time.isoformat()
            )
            return

        try:
            from google.cloud import tasks_v2
            from google.protobuf import timestamp_pb2
            import google.protobuf.timestamp_pb2

            parent = client.queue_path(
                self._project_id, "us-central1", self._queue_name
            )
            payload = json.dumps({
                "patient_id": patient.id,
                "medication_id": medication.id,
                "medication_name": medication.name,
                "dose": medication.dose,
            })

            ts = timestamp_pb2.Timestamp()
            ts.FromDatetime(scheduled_time)

            task = {
                "http_request": {
                    "http_method": tasks_v2.HttpMethod.POST,
                    "url": f"{self._service_url}{self.REMINDER_ENDPOINT}",
                    "headers": {"Content-Type": "application/json"},
                    "body": payload.encode(),
                },
                "schedule_time": ts,
            }

            response = client.create_task(request={"parent": parent, "task": task})
            logger.info("Cloud Task created: %s", response.name)

        except Exception as exc:
            logger.error("Cloud Tasks error: %s", exc)

    def send_reminder(self, patient_id: str, medication: Medication) -> bool:
        """
        Send an FCM push notification for a medication reminder.

        This method is called by the Cloud Tasks HTTP handler endpoint.

        Args:
            patient_id: Firebase Auth UID of the patient.
            medication: The Medication object to remind about.

        Returns:
            True if FCM message was sent, False on failure.
        """
        try:
            from firebase_admin import messaging

            message = messaging.Message(
                notification=messaging.Notification(
                    title=f"💊 Time for your {medication.name}",
                    body=f"Take {medication.dose} now. Stay on track with your recovery!",
                ),
                topic=f"reminders_{patient_id}",
            )
            messaging.send(message)
            logger.info(
                "FCM reminder sent for patient_id=%s medication=%s",
                patient_id, medication.name
            )
            return True
        except Exception as exc:
            logger.error("FCM send failed: %s", exc)
            return False
