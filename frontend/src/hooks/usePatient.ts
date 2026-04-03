/**
 * usePatient — custom hook for loading patient data with real-time Firestore updates.
 */
import { useState, useEffect, useCallback } from 'react';
import { Patient } from '../types/models';
import PatientService from '../services/PatientService';
import AuthService from '../services/AuthService';

export function usePatient() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPatient = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await PatientService.getPatient();
      setPatient(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load patient data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChanged((user) => {
      if (user) fetchPatient();
      else {
        setPatient(null);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, [fetchPatient]);

  const markMedTaken = useCallback(
    async (medId: string, time: string) => {
      await PatientService.updateMed(medId, time);
      await fetchPatient(); // Refresh to get updated takenToday
    },
    [fetchPatient]
  );

  return { patient, loading, error, refetch: fetchPatient, markMedTaken };
}

/**
 * useMedications — real-time medication state with mark-taken action.
 */
import { Medication } from '../types/models';

export function useMedications(patient: Patient | null) {
  const medications = patient?.medications ?? [];
  const overallAdherence =
    medications.length > 0
      ? medications.reduce(
          (sum, m) => sum + (m.takenToday / Math.max(m.times.length, 1)) * 100,
          0
        ) / medications.length
      : 100;

  return { medications, overallAdherence: Math.round(overallAdherence) };
}

/**
 * useAppointments — appointment list and upcoming filter.
 */
import { Appointment } from '../types/models';

export function useAppointments(patient: Patient | null) {
  const now = new Date();
  const upcoming = (patient?.appointments ?? [])
    .filter((a) => new Date(a.appointmentDatetime) > now)
    .sort(
      (a, b) =>
        new Date(a.appointmentDatetime).getTime() -
        new Date(b.appointmentDatetime).getTime()
    );

  return { appointments: patient?.appointments ?? [], upcoming };
}
