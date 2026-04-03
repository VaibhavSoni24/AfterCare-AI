"""
Patient domain models for AfterCare AI.

All domain objects follow strict OOP principles with dataclasses and validation.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional, Any, Dict, ClassVar
import uuid


@dataclass
class DischargeSummary:
    """Represents a patient's discharge summary, parsed from FHIR or uploaded text."""

    id: str
    raw_fhir: Dict[str, Any]
    plain_text: str
    diagnosis: str
    instructions: List[str]
    created_at: datetime
    simplified_text: Optional[str] = None

    FHIR_RESOURCE_TYPE: ClassVar[str] = "Composition"

    @classmethod
    def parse_from_fhir(cls, fhir_json: Dict[str, Any]) -> "DischargeSummary":
        """
        Parse a DischargeSummary from a FHIR JSON bundle.

        Args:
            fhir_json: A FHIR R4 Bundle or Composition resource dict.

        Returns:
            A populated DischargeSummary instance.
        """
        # Extract diagnosis from Condition or Composition narrative
        diagnosis = "Not specified"
        instructions: List[str] = []
        plain_text = ""

        resources = fhir_json.get("entry", [])
        for entry in resources:
            resource = entry.get("resource", {})
            rtype = resource.get("resourceType", "")

            if rtype == "Condition":
                coding = resource.get("code", {}).get("coding", [{}])
                diagnosis = coding[0].get("display", diagnosis) if coding else diagnosis

            elif rtype == "Composition":
                plain_text = resource.get("text", {}).get("div", "")
                for section in resource.get("section", []):
                    title = section.get("title", "")
                    text_div = section.get("text", {}).get("div", "")
                    if title.lower() in ("instructions", "discharge instructions", "follow-up"):
                        if text_div:
                            instructions.append(f"{title}: {text_div}")

            elif rtype == "CarePlan":
                for activity in resource.get("activity", []):
                    detail = activity.get("detail", {})
                    desc = detail.get("description", "")
                    if desc:
                        instructions.append(desc)

        if not plain_text:
            plain_text = fhir_json.get("text", {}).get("div", "")

        return cls(
            id=str(uuid.uuid4()),
            raw_fhir=fhir_json,
            plain_text=plain_text,
            diagnosis=diagnosis,
            instructions=instructions,
            created_at=datetime.utcnow(),
        )

    def to_dict(self) -> Dict[str, Any]:
        """Serialize to Firestore-compatible dict."""
        return {
            "id": self.id,
            "diagnosis": self.diagnosis,
            "plain_text": self.plain_text,
            "simplified_text": self.simplified_text,
            "instructions": self.instructions,
            "created_at": self.created_at.isoformat(),
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "DischargeSummary":
        """Deserialize from Firestore dict."""
        return cls(
            id=data["id"],
            raw_fhir=data.get("raw_fhir", {}),
            plain_text=data.get("plain_text", ""),
            diagnosis=data.get("diagnosis", ""),
            instructions=data.get("instructions", []),
            created_at=datetime.fromisoformat(data.get("created_at", datetime.utcnow().isoformat())),
            simplified_text=data.get("simplified_text"),
        )


@dataclass
class Medication:
    """Represents a single medication in a patient's regimen."""

    id: str
    name: str
    dose: str
    frequency: str
    times: List[str]
    taken_today: int = 0
    plain_explanation: str = ""

    def mark_taken(self, time: str) -> None:
        """
        Mark a dose as taken at the given time.

        Args:
            time: The scheduled time string, e.g. "08:00".
        """
        if self.taken_today < len(self.times):
            self.taken_today += 1

    def is_fully_taken(self) -> bool:
        """Return True if all doses for today have been taken."""
        return self.taken_today >= len(self.times)

    def adherence_pct(self) -> float:
        """Return percentage of today's doses taken (0–100)."""
        if not self.times:
            return 100.0
        return (self.taken_today / len(self.times)) * 100

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "dose": self.dose,
            "frequency": self.frequency,
            "times": self.times,
            "taken_today": self.taken_today,
            "plain_explanation": self.plain_explanation,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Medication":
        return cls(
            id=data.get("id", str(uuid.uuid4())),
            name=data["name"],
            dose=data["dose"],
            frequency=data["frequency"],
            times=data.get("times", []),
            taken_today=data.get("taken_today", 0),
            plain_explanation=data.get("plain_explanation", ""),
        )


@dataclass
class Appointment:
    """Represents a follow-up appointment for a patient."""

    id: str
    title: str
    appointment_datetime: datetime
    location: str
    instructions: str
    google_event_id: Optional[str] = None

    def to_gcal_event(self) -> Dict[str, Any]:
        """
        Convert to a Google Calendar API event dict.

        Returns:
            A dict compatible with the Google Calendar Events.insert API.
        """
        return {
            "summary": self.title,
            "location": self.location,
            "description": self.instructions,
            "start": {
                "dateTime": self.appointment_datetime.isoformat(),
                "timeZone": "Asia/Kolkata",
            },
            "end": {
                "dateTime": self.appointment_datetime.replace(
                    hour=self.appointment_datetime.hour + 1
                ).isoformat(),
                "timeZone": "Asia/Kolkata",
            },
            "reminders": {
                "useDefault": False,
                "overrides": [
                    {"method": "email", "minutes": 24 * 60},
                    {"method": "popup", "minutes": 60},
                ],
            },
        }

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "appointment_datetime": self.appointment_datetime.isoformat(),
            "location": self.location,
            "instructions": self.instructions,
            "google_event_id": self.google_event_id,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Appointment":
        return cls(
            id=data.get("id", str(uuid.uuid4())),
            title=data["title"],
            appointment_datetime=datetime.fromisoformat(data["appointment_datetime"]),
            location=data.get("location", ""),
            instructions=data.get("instructions", ""),
            google_event_id=data.get("google_event_id"),
        )


@dataclass
class SymptomLog:
    """A single symptom log entry reported by the patient."""

    id: str
    symptom: str
    severity: int  # 1–10
    timestamp: datetime
    note: str = ""

    URGENT_SYMPTOMS: ClassVar[List[str]] = [
        "chest pain", "difficulty breathing", "shortness of breath",
        "severe bleeding", "unconscious", "stroke", "heart attack",
    ]

    def is_urgent(self) -> bool:
        """Return True if the symptom matches known urgent conditions."""
        symptom_lower = self.symptom.lower()
        return any(urgent in symptom_lower for urgent in self.URGENT_SYMPTOMS)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "symptom": self.symptom,
            "severity": self.severity,
            "timestamp": self.timestamp.isoformat(),
            "note": self.note,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SymptomLog":
        return cls(
            id=data.get("id", str(uuid.uuid4())),
            symptom=data["symptom"],
            severity=int(data.get("severity", 5)),
            timestamp=datetime.fromisoformat(data.get("timestamp", datetime.utcnow().isoformat())),
            note=data.get("note", ""),
        )


@dataclass
class Patient:
    """
    Core patient aggregate root.

    Holds all related domain objects and provides business logic for
    adherence calculations and data aggregation.
    """

    id: str
    name: str
    dob: str
    email: str
    summaries: List[DischargeSummary] = field(default_factory=list)
    medications: List[Medication] = field(default_factory=list)
    appointments: List[Appointment] = field(default_factory=list)
    symptom_logs: List[SymptomLog] = field(default_factory=list)

    def latest_summary(self) -> Optional[DischargeSummary]:
        """Return the most recently created discharge summary."""
        if not self.summaries:
            return None
        return max(self.summaries, key=lambda s: s.created_at)

    def overall_adherence(self) -> float:
        """Return overall medication adherence as a percentage (0–100)."""
        if not self.medications:
            return 100.0
        total = sum(m.adherence_pct() for m in self.medications)
        return total / len(self.medications)

    def upcoming_appointments(self) -> List[Appointment]:
        """Return appointments that have not yet occurred, sorted by date."""
        now = datetime.utcnow()
        future = [a for a in self.appointments if a.appointment_datetime > now]
        return sorted(future, key=lambda a: a.appointment_datetime)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "dob": self.dob,
            "email": self.email,
            "summaries": [s.to_dict() for s in self.summaries],
            "medications": [m.to_dict() for m in self.medications],
            "appointments": [a.to_dict() for a in self.appointments],
            "symptom_logs": [sl.to_dict() for sl in self.symptom_logs],
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Patient":
        return cls(
            id=data["id"],
            name=data.get("name", ""),
            dob=data.get("dob", ""),
            email=data.get("email", ""),
            summaries=[DischargeSummary.from_dict(s) for s in data.get("summaries", [])],
            medications=[Medication.from_dict(m) for m in data.get("medications", [])],
            appointments=[Appointment.from_dict(a) for a in data.get("appointments", [])],
            symptom_logs=[SymptomLog.from_dict(sl) for sl in data.get("symptom_logs", [])],
        )

    @classmethod
    def create_demo(cls, uid: str, email: str) -> "Patient":
        """Seed a demo patient (Arjun Mehta) for hackathon demonstration."""
        summary = DischargeSummary(
            id="demo-summary-001",
            raw_fhir={},
            plain_text="Patient was treated for Type 2 Diabetes Mellitus. Blood sugar levels were elevated.",
            diagnosis="Type 2 Diabetes Mellitus",
            instructions=[
                "Monitor blood sugar levels daily (target: 80-130 mg/dL before meals)",
                "Follow a low-sugar, low-carbohydrate diet",
                "Engage in at least 30 minutes of moderate exercise daily",
                "Get HbA1c test in 6 weeks to assess long-term glucose control",
                "Schedule follow-up with endocrinologist within 4 weeks",
            ],
            created_at=datetime.utcnow(),
            simplified_text=(
                "You were seen for Type 2 Diabetes, which means your body has trouble "
                "managing blood sugar. Your doctor has started you on medications to help. "
                "Follow the steps below to keep your blood sugar in a safe range."
            ),
        )

        metformin = Medication(
            id="med-001",
            name="Metformin",
            dose="500mg",
            frequency="Twice daily",
            times=["08:00", "20:00"],
            taken_today=0,
            plain_explanation=(
                "Metformin helps your liver produce less sugar and helps your body use "
                "insulin more effectively. Take with food to avoid stomach upset."
            ),
        )

        lisinopril = Medication(
            id="med-002",
            name="Lisinopril",
            dose="10mg",
            frequency="Once daily",
            times=["08:00"],
            taken_today=0,
            plain_explanation=(
                "Lisinopril protects your kidneys and heart, which can be affected by "
                "diabetes over time. Take it at the same time each day."
            ),
        )

        appointment = Appointment(
            id="appt-001",
            title="HbA1c Lab Test",
            appointment_datetime=datetime(2026, 5, 14, 9, 0),
            location="City Diagnostics, MG Road, Bangalore",
            instructions="Fast for 8 hours before the test. Drink water only. Bring your medication list.",
        )

        return cls(
            id=uid,
            name="Arjun Mehta",
            dob="1985-03-15",
            email=email,
            summaries=[summary],
            medications=[metformin, lisinopril],
            appointments=[appointment],
            symptom_logs=[],
        )
