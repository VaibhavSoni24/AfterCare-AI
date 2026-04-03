import React, { useState } from 'react';
import { LogOut, Bell, Activity, User, Menu, X } from 'lucide-react';
import { Patient, TabId } from '../types/models';
import AuthService from '../services/AuthService';
import SummaryCard from './SummaryCard';
import ChatInterface from './ChatInterface';
import MedicationCard from './MedicationCard';
import AppointmentCard from './AppointmentCard';
import SymptomLogger from './SymptomLogger';
import { usePatient, useMedications, useAppointments } from '../hooks/usePatient';
import { ErrorBoundary } from './ErrorBoundary';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'summary', label: 'Summary', icon: '📋' },
  { id: 'chat', label: 'AI Chat', icon: '💬' },
  { id: 'medications', label: 'Medications', icon: '💊' },
  { id: 'appointments', label: 'Appointments', icon: '📅' },
  { id: 'symptoms', label: 'Symptoms', icon: '🩺' },
];

/**
 * PatientDashboard — top-level authenticated layout with tab routing.
 *
 * Renders the navigation bar, adherence hero, tab bar, and all feature tabs.
 * Uses ErrorBoundary on each tab panel for graceful isolated failures.
 */
const PatientDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('summary');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { patient, loading, error, markMedTaken } = usePatient();
  const { medications, overallAdherence } = useMedications(patient);
  const { upcoming } = useAppointments(patient);

  const handleSignOut = async () => {
    await AuthService.signOut();
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0A0F1E]">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center mb-4 animate-pulse">
            <span className="text-2xl">🏥</span>
          </div>
          <p className="text-slate-400 text-sm">Loading your care plan…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0A0F1E]">
        <div className="glass-card p-8 max-w-md text-center">
          <p className="text-rose-400 mb-4">{error}</p>
          <button className="btn-primary" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const nextAppt = upcoming[0];
  const summary = patient?.summaries?.[0];

  return (
    <div className="min-h-screen bg-[#0A0F1E]">
      {/* Navigation Bar */}
      <nav
        className="sticky top-0 z-50 glassmorphism border-b border-white/5 px-4 lg:px-8 py-3"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <span className="text-lg" role="img" aria-label="AfterCare AI">🏥</span>
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-white">AfterCare</span>
              <span className="font-bold bg-gradient-to-r from-sky-400 to-teal-400 bg-clip-text text-transparent"> AI</span>
            </div>
          </div>

          {/* Patient Info (desktop) */}
          <div className="hidden md:flex items-center gap-4">
            {nextAppt && (
              <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-400/10 border border-amber-400/20 px-3 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" aria-hidden />
                Next: {nextAppt.title} · {new Date(nextAppt.appointmentDatetime).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <User className="w-4 h-4 text-white" aria-hidden />
              </div>
              <div className="text-right hidden lg:block">
                <p className="text-sm font-medium text-white">{patient?.name || 'Patient'}</p>
                <p className="text-xs text-slate-400">{patient?.email}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors focus-ring"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" aria-hidden />
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-white/5 text-slate-400 focus-ring"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 pb-3 border-t border-white/5 pt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm text-white">{patient?.name}</span>
            </div>
            <button
              onClick={handleSignOut}
              className="text-sm text-rose-400 hover:text-rose-300 focus-ring"
              aria-label="Sign out"
            >
              Sign out
            </button>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6" id="main-content">
        {/* Hero Adherence Card */}
        <div className="glass-card p-6 mb-6 bg-gradient-to-br from-sky-900/30 to-teal-900/20 border border-sky-500/20">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">
                Welcome back, {patient?.name?.split(' ')[0]} 👋
              </h1>
              {summary && (
                <p className="text-slate-300 text-sm mt-1">
                  Managing <span className="text-sky-400 font-medium">{summary.diagnosis}</span>
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-white">{overallAdherence}%</p>
              <p className="text-xs text-slate-400">Medication Adherence</p>
            </div>
          </div>
          <div className="mt-4">
            <div
              className="h-3 bg-white/5 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={overallAdherence}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Overall medication adherence: ${overallAdherence}%`}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-teal-400 transition-all duration-1000 shadow-lg shadow-sky-500/30"
                style={{ width: `${overallAdherence}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              Your recovery is {overallAdherence >= 80 ? 'on track' : 'behind schedule'} — keep it up!
            </p>
          </div>
        </div>

        {/* Reminder Banner */}
        {nextAppt && (
          <div
            className="flex items-center gap-3 mb-6 p-4 rounded-xl bg-amber-900/20 border border-amber-500/30"
            role="alert"
            aria-label="Upcoming appointment reminder"
          >
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse flex-shrink-0" aria-hidden />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-200 truncate">
                📅 Upcoming: {nextAppt.title}
              </p>
              <p className="text-xs text-amber-400/70">
                {new Date(nextAppt.appointmentDatetime).toLocaleDateString('en-IN', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                })} · {nextAppt.location}
              </p>
            </div>
            <Bell className="w-4 h-4 text-amber-400 flex-shrink-0" aria-hidden />
          </div>
        )}

        {/* Tab Bar */}
        <div
          className="flex gap-1 mb-6 p-1 glass-card rounded-2xl overflow-x-auto"
          role="tablist"
          aria-label="Dashboard sections"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap focus-ring ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-sky-500/30 to-teal-500/20 text-white border border-sky-500/30 shadow-inner'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <span aria-hidden>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Panels */}
        <div className="animate-fade-in">
          {/* Summary Tab */}
          <div
            role="tabpanel"
            id="tabpanel-summary"
            aria-labelledby="tab-summary"
            hidden={activeTab !== 'summary'}
          >
            <ErrorBoundary>
              {summary ? (
                <SummaryCard summary={summary} />
              ) : (
                <div className="glass-card p-12 text-center">
                  <p className="text-4xl mb-4">📂</p>
                  <h3 className="text-white font-semibold mb-2">No Summary Yet</h3>
                  <p className="text-slate-400 text-sm">
                    Ask your doctor for a discharge summary FHIR JSON file to upload.
                  </p>
                </div>
              )}
            </ErrorBoundary>
          </div>

          {/* Chat Tab */}
          <div
            role="tabpanel"
            id="tabpanel-chat"
            aria-labelledby="tab-chat"
            hidden={activeTab !== 'chat'}
          >
            <ErrorBoundary>
              <ChatInterface />
            </ErrorBoundary>
          </div>

          {/* Medications Tab */}
          <div
            role="tabpanel"
            id="tabpanel-medications"
            aria-labelledby="tab-medications"
            hidden={activeTab !== 'medications'}
          >
            <ErrorBoundary>
              {medications.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {medications.map((med) => (
                    <MedicationCard
                      key={med.id}
                      medication={med}
                      onMarkTaken={markMedTaken}
                    />
                  ))}
                </div>
              ) : (
                <div className="glass-card p-12 text-center">
                  <p className="text-4xl mb-4">💊</p>
                  <p className="text-white font-semibold mb-2">No medications listed</p>
                  <p className="text-slate-400 text-sm">Your medications will appear here.</p>
                </div>
              )}
            </ErrorBoundary>
          </div>

          {/* Appointments Tab */}
          <div
            role="tabpanel"
            id="tabpanel-appointments"
            aria-labelledby="tab-appointments"
            hidden={activeTab !== 'appointments'}
          >
            <ErrorBoundary>
              {patient?.appointments && patient.appointments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {patient.appointments.map((appt) => (
                    <AppointmentCard key={appt.id} appointment={appt} />
                  ))}
                </div>
              ) : (
                <div className="glass-card p-12 text-center">
                  <p className="text-4xl mb-4">📅</p>
                  <p className="text-white font-semibold mb-2">No appointments scheduled</p>
                  <p className="text-slate-400 text-sm">Book follow-up appointments here.</p>
                </div>
              )}
            </ErrorBoundary>
          </div>

          {/* Symptoms Tab */}
          <div
            role="tabpanel"
            id="tabpanel-symptoms"
            aria-labelledby="tab-symptoms"
            hidden={activeTab !== 'symptoms'}
          >
            <ErrorBoundary>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SymptomLogger />
                {/* Symptom History */}
                <div className="glass-card p-6">
                  <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-rose-400" aria-hidden />
                    Recent Symptom Logs
                  </h3>
                  {patient?.symptomLogs && patient.symptomLogs.length > 0 ? (
                    <ul className="space-y-3" role="list">
                      {[...patient.symptomLogs].reverse().slice(0, 10).map((log) => (
                        <li key={log.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/5">
                          <div
                            className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${
                              log.severity >= 7 ? 'bg-rose-400' : log.severity >= 4 ? 'bg-amber-400' : 'bg-emerald-400'
                            }`}
                            aria-hidden
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white font-medium">{log.symptom}</p>
                            <p className="text-xs text-slate-400">
                              Severity {log.severity}/10 ·{' '}
                              {new Date(log.timestamp).toLocaleDateString('en-IN', {
                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                              })}
                            </p>
                            {log.note && (
                              <p className="text-xs text-slate-500 mt-0.5 truncate">{log.note}</p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-400 text-sm text-center py-8">No symptoms logged yet.</p>
                  )}
                </div>
              </div>
            </ErrorBoundary>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 px-4 border-t border-white/5 mt-12">
        <p className="text-xs text-slate-600">
          AfterCare AI · AMD Slingshot Hackathon · Not a substitute for professional medical advice
        </p>
      </footer>
    </div>
  );
};

export default PatientDashboard;
