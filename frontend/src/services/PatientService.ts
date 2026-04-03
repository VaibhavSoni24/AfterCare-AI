/**
 * API base client with Firebase Auth token injection.
 */
import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import AuthService from './AuthService';
import { Patient } from '../types/models';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Inject Firebase ID token into every request
apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await AuthService.getIdToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * PatientService — API client for patient data operations.
 */
class PatientService {
  private static instance: PatientService;

  static getInstance(): PatientService {
    if (!PatientService.instance) {
      PatientService.instance = new PatientService();
    }
    return PatientService.instance;
  }

  /** Load full patient profile (auto-seeds demo data on first login) */
  async getPatient(): Promise<Patient> {
    const response = await apiClient.get<any>('/api/patient/me');
    return this.mapPatient(response.data);
  }

  /** Upload a FHIR JSON file and get AI-simplified summary */
  async uploadFHIR(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/api/patient/fhir-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  /** Mark a medication dose as taken */
  async updateMed(medId: string, time: string): Promise<void> {
    await apiClient.post('/api/medications/taken', { med_id: medId, time });
  }

  /** Add a symptom log entry */
  async addSymptomLog(symptom: string, severity: number, note: string): Promise<any> {
    const response = await apiClient.post('/api/patient/symptoms', {
      symptom,
      severity,
      note,
    });
    return response.data;
  }

  /** Schedule today's medication reminders via Cloud Tasks */
  async scheduleReminders(): Promise<any> {
    const response = await apiClient.post('/api/medications/schedule-reminders');
    return response.data;
  }

  private mapPatient(data: any): Patient {
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      dob: data.dob,
      summaries: (data.summaries || []).map((s: any) => ({
        id: s.id,
        diagnosis: s.diagnosis,
        plainText: s.plain_text,
        simplifiedText: s.simplified_text,
        instructions: s.instructions || [],
        createdAt: s.created_at,
      })),
      medications: (data.medications || []).map((m: any) => ({
        id: m.id,
        name: m.name,
        dose: m.dose,
        frequency: m.frequency,
        times: m.times || [],
        takenToday: m.taken_today || 0,
        plainExplanation: m.plain_explanation || '',
      })),
      appointments: (data.appointments || []).map((a: any) => ({
        id: a.id,
        title: a.title,
        appointmentDatetime: a.appointment_datetime,
        location: a.location,
        instructions: a.instructions,
        googleEventId: a.google_event_id,
      })),
      symptomLogs: (data.symptom_logs || []).map((sl: any) => ({
        id: sl.id,
        symptom: sl.symptom,
        severity: sl.severity,
        timestamp: sl.timestamp,
        note: sl.note,
      })),
    };
  }
}

export default PatientService.getInstance();
