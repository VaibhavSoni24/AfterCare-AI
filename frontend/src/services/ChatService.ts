/**
 * ChatService — AI Chat API client singleton.
 */
import { ChatMessage } from '../types/models';
import apiClient from './PatientService';

class ChatService {
  private static instance: ChatService;

  static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  /**
   * Send a message to the Gemini-powered chat endpoint.
   * @param message - The patient's current message
   * @param history - Prior conversation history
   * @returns AI reply and urgency flag
   */
  async sendMessage(
    message: string,
    history: ChatMessage[]
  ): Promise<{ reply: string; is_urgent: boolean }> {
    const response = await apiClient.post('/api/chat/send', {
      message,
      history: history.map((msg) => ({
        role: msg.role === 'ai' ? 'model' : 'user',
        content: msg.content,
      })),
    });
    return response.data;
  }

  /** Fetch personalized AI greeting for the patient */
  async getGreeting(): Promise<{ greeting: string; patient_name?: string }> {
    const response = await apiClient.get('/api/chat/greeting');
    return response.data;
  }
}

/**
 * AppointmentService — Appointment booking API client singleton.
 */
class AppointmentService {
  private static instance: AppointmentService;

  static getInstance(): AppointmentService {
    if (!AppointmentService.instance) {
      AppointmentService.instance = new AppointmentService();
    }
    return AppointmentService.instance;
  }

  /** Book a new appointment and sync to Google Calendar */
  async bookAppointment(
    title: string,
    appointmentDatetime: string,
    location: string,
    instructions: string
  ): Promise<any> {
    const response = await apiClient.post('/api/appointments/book', {
      title,
      appointment_datetime: appointmentDatetime,
      location,
      instructions,
    });
    return response.data;
  }

  /** List all upcoming appointments */
  async listAppointments(): Promise<any> {
    const response = await apiClient.get('/api/appointments/list');
    return response.data;
  }

  /** Generate Google Calendar deep link (no OAuth needed) */
  generateCalendarLink(
    title: string,
    datetimeStr: string,
    location: string,
    details: string
  ): string {
    const dt = new Date(datetimeStr);
    const pad = (n: number) => String(n).padStart(2, '0');
    const fmt = (d: Date) =>
      `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T` +
      `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;

    const end = new Date(dt.getTime() + 60 * 60 * 1000);
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      dates: `${fmt(dt)}/${fmt(end)}`,
      location,
      details,
    });
    return `https://calendar.google.com/calendar/render?${params}`;
  }
}

export const chatService = ChatService.getInstance();
export const appointmentService = AppointmentService.getInstance();
