# AfterCare AI — Environment Variables Reference

This document details every environment variable required to run AfterCare AI locally and in production.

---

## Frontend Variables (VITE_ prefix — included in browser bundle)

> ⚠️ These are safe to include in the browser. They are your Firebase **Web** configuration (not admin secrets).

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `VITE_FIREBASE_API_KEY` | Firebase Web API Key | Firebase Console → Project Settings → General → Web API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain | Firebase Console → Project Settings → `projectId.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID | Firebase Console → Project Settings → Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket | Firebase Console → Storage → `projectId.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | FCM sender ID | Firebase Console → Project Settings → Cloud Messaging |
| `VITE_FIREBASE_APP_ID` | Firebase App ID | Firebase Console → Project Settings → Your Apps → App ID |
| `VITE_API_BASE_URL` | FastAPI backend URL | `http://localhost:8000` for dev, Cloud Run URL for prod |

---

## Backend Variables (Server-Side — NEVER expose to browser)

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `GEMINI_API_KEY` | Google Gemini 1.5 Flash API key | [Google AI Studio](https://aistudio.google.com) → API Keys |
| `FIREBASE_SERVICE_ACCOUNT_KEY_PATH` | Path to Firebase Admin SDK JSON file | Firebase Console → Project Settings → Service Accounts → Generate new private key |
| `FIREBASE_PROJECT_ID` | Same as frontend project ID | Firebase Console |
| `FIREBASE_STORAGE_BUCKET` | Same as frontend storage bucket | Firebase Console |

---

## Google Cloud Variables

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `GCP_PROJECT_ID` | Google Cloud Project ID | [GCP Console](https://console.cloud.google.com) → Project selector |
| `CLOUD_TASKS_QUEUE_NAME` | Cloud Tasks queue name | GCP Console → Cloud Tasks → Create Queue → `medication-reminders` |
| `CLOUD_RUN_SERVICE_URL` | Deployed Cloud Run URL | After `gcloud run deploy` → copy the service URL |

---

## Google Calendar (Optional — for server-side Calendar API)

| Variable | Description | How to configure |
|----------|-------------|-----------------|
| `GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON` | Service account JSON (escaped) | GCP Console → IAM → Service Accounts → Create key → JSON. Paste escaped JSON or leave empty to use Calendar deep-links only |

---

## CORS

| Variable | Description | Value |
|----------|-------------|-------|
| `FRONTEND_URL` | Allowed CORS origin for the frontend | `http://localhost:5173` for dev, Firebase Hosting URL for prod |

---

## Quick Setup Checklist

- [ ] Create Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
- [ ] Enable Google Sign-In under Authentication → Sign-in method
- [ ] Enable Firestore Database in production mode
- [ ] Enable Storage
- [ ] Download service account JSON → save as `backend/firebase-service-account.json`
- [ ] Get Gemini API key at [aistudio.google.com](https://aistudio.google.com)
- [ ] Fill in all values in `.env`
- [ ] Run `firebase deploy --only firestore:rules` to deploy security rules
- [ ] Run `firebase deploy --only storage` to deploy storage rules
- [ ] Deploy backend to Cloud Run and update `CLOUD_RUN_SERVICE_URL`
- [ ] Update `VITE_API_BASE_URL` to point to your Cloud Run service

---

## Notes

- **Never commit `.env` or `firebase-service-account.json`** — both are in `.gitignore`
- The Gemini API free tier supports 15 requests/minute and 1 million tokens/day — sufficient for demo
- Cloud Tasks requires enabling the Cloud Tasks API in GCP Console
- For production, set all env vars in Cloud Run → Edit Revision → Variables & Secrets
