/**
 * TypeScript domain models for AfterCare AI.
 * 
 * These interfaces mirror the backend Python dataclasses exactly,
 * ensuring type safety across the full stack.
 */

export interface DischargeSummary {
  id: string;
  diagnosis: string;
  plainText: string;
  simplifiedText?: string;
  instructions: string[];
  createdAt: string; // ISO 8601
}

export interface Medication {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  times: string[];
  takenToday: number;
  plainExplanation: string;
}

export interface Appointment {
  id: string;
  title: string;
  appointmentDatetime: string; // ISO 8601
  location: string;
  instructions: string;
  googleEventId?: string;
}

export interface SymptomLog {
  id: string;
  symptom: string;
  severity: number; // 1–10
  timestamp: string; // ISO 8601
  note: string;
}

export interface Patient {
  id: string;
  name: string;
  email: string;
  dob?: string;
  summaries: DischargeSummary[];
  medications: Medication[];
  appointments: Appointment[];
  symptomLogs: SymptomLog[];
}

export interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  timestamp: string; // ISO 8601
}

export type TabId = 'summary' | 'chat' | 'medications' | 'appointments' | 'symptoms';
