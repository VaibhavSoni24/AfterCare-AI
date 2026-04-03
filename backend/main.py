"""
AfterCare AI — FastAPI Application Entry Point.

Wires together Firebase Admin SDK, Firestore, Gemini, Cloud Tasks,
and all API route handlers with proper dependency injection.
"""
from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager

import firebase_admin
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from firebase_admin import credentials, firestore

from routes.patient import router as patient_router
from routes.chat import router as chat_router
from routes.appointments import router as appointments_router
from routes.medications import router as medications_router
from services.patient_service import PatientService
from services.summary_parser import SummaryParser
from services.appointment_service import AppointmentService
from services.reminder_service import ReminderService

# ──────────────────────────── Logging ─────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger("aftercare_ai")

# Load local environment variables for development.
# In Cloud Run, runtime env vars are provided by the platform.
load_dotenv()


# ──────────────────────────── Lifespan ────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.

    Initializes Firebase Admin SDK, Firestore client, and all services
    on startup. Cleans up resources on shutdown.
    """
    logger.info("AfterCare AI backend starting...")

    # Firebase Admin SDK initialization
    firebase_creds_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY_PATH", "")
    if firebase_creds_path and os.path.exists(firebase_creds_path):
        cred = credentials.Certificate(firebase_creds_path)
    else:
        # Use Application Default Credentials (Cloud Run)
        cred = credentials.ApplicationDefault()

    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred, {
            "projectId": os.getenv("FIREBASE_PROJECT_ID", "aftercare-ai"),
            "storageBucket": os.getenv("FIREBASE_STORAGE_BUCKET", "aftercare-ai.appspot.com"),
        })

    db: firestore.Client = firestore.client()

    # Initialize all services (dependency injection via app.state)
    gemini_api_key = os.getenv("GEMINI_API_KEY", "")
    gcal_creds = os.getenv("GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON", "")
    gcp_project = os.getenv("GCP_PROJECT_ID", "aftercare-ai")
    tasks_queue = os.getenv("CLOUD_TASKS_QUEUE_NAME", "medication-reminders")
    service_url = os.getenv("CLOUD_RUN_SERVICE_URL", "http://localhost:8000")

    patient_svc = PatientService(db)
    summary_parser = SummaryParser(gemini_api_key)
    reminder_svc = ReminderService(gcp_project, tasks_queue, service_url)
    appointment_svc = AppointmentService(patient_svc, gcal_creds or None)

    # Attach to app state
    app.state.patient_service = patient_svc
    app.state.summary_parser = summary_parser
    app.state.reminder_service = reminder_svc
    app.state.appointment_service = appointment_svc
    app.state.gemini_api_key = gemini_api_key
    app.state.db = db

    logger.info("All services initialized successfully.")
    yield

    # Cleanup
    logger.info("AfterCare AI backend shutting down.")


# ──────────────────────────── FastAPI App ─────────────────────────────────

app = FastAPI(
    title="AfterCare AI API",
    description=(
        "Post-visit patient companion backend powering FHIR parsing, "
        "Gemini-based AI chat, medication tracking, and Google Calendar booking."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS — allow Firebase Hosting and localhost dev origins
ALLOWED_ORIGINS = [
    os.getenv("FRONTEND_URL", "http://localhost:5173"),
    "https://aftercare-ai.web.app",
    "https://aftercare-ai.firebaseapp.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(patient_router)
app.include_router(chat_router)
app.include_router(appointments_router)
app.include_router(medications_router)


# ──────────────────────────── Health Check ────────────────────────────────

@app.get("/health", tags=["health"])
async def health_check():
    """Service health check endpoint for Cloud Run."""
    return {
        "status": "healthy",
        "service": "AfterCare AI API",
        "version": "1.0.0",
    }


@app.get("/", tags=["health"])
async def root():
    """Root endpoint redirecting to API docs."""
    return {
        "message": "AfterCare AI API — Post-Visit Patient Companion",
        "docs": "/docs",
        "health": "/health",
    }


# ──────────────────────────── Reminders handler ───────────────────────────

@app.post("/api/reminders/send", tags=["reminders"])
async def handle_reminder_task(payload: dict):
    """
    Cloud Tasks HTTP target: triggered to send FCM medication reminder.

    This endpoint is called by Google Cloud Tasks — not by clients directly.
    """
    patient_id = payload.get("patient_id", "")
    med_id = payload.get("medication_id", "")
    med_name = payload.get("medication_name", "Medication")
    dose = payload.get("dose", "")

    from models.patient import Medication
    from datetime import datetime
    import uuid

    med = Medication(
        id=med_id,
        name=med_name,
        dose=dose,
        frequency="",
        times=[],
    )

    reminder_svc: ReminderService = app.state.reminder_service
    success = reminder_svc.send_reminder(patient_id, med)

    return {"sent": success, "medication": med_name, "patient_id": patient_id}
