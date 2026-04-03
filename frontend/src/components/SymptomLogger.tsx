import React, { useState } from 'react';
import { Activity, AlertTriangle, Send } from 'lucide-react';
import PatientService from '../services/PatientService';

const SYMPTOM_PRESETS = [
  'Headache', 'Nausea', 'Dizziness', 'Fatigue',
  'Chest tightness', 'High blood sugar reading', 'Swollen feet',
];

/**
 * SymptomLogger — patient symptom reporting form.
 *
 * Captures symptom text, severity (1–10), and optional notes.
 * Shows an urgent alert for potentially serious symptoms.
 */
const SymptomLogger: React.FC = () => {
  const [symptom, setSymptom] = useState('');
  const [severity, setSeverity] = useState(5);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUrgent, setIsUrgent] = useState(false);

  const urgentKeywords = ['chest pain', 'can\'t breathe', 'stroke', 'bleeding', 'unconscious'];
  const detectUrgency = (text: string) =>
    urgentKeywords.some((k) => text.toLowerCase().includes(k));

  const handleSymptomChange = (value: string) => {
    setSymptom(value);
    setIsUrgent(detectUrgency(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptom.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await PatientService.addSymptomLog(symptom, severity, note);
      setSubmitted(true);
      setIsUrgent(result.is_urgent);
      setTimeout(() => {
        setSubmitted(false);
        setSymptom('');
        setSeverity(5);
        setNote('');
        setIsUrgent(false);
      }, 3000);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to log symptom.');
    } finally {
      setLoading(false);
    }
  };

  const severityColor =
    severity <= 3 ? 'text-emerald-400' : severity <= 6 ? 'text-amber-400' : 'text-rose-400';

  const severityLabel =
    severity <= 3 ? 'Mild' : severity <= 6 ? 'Moderate' : 'Severe';

  return (
    <div className="glass-card p-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-rose-500/20">
          <Activity className="w-5 h-5 text-rose-400" aria-hidden />
        </div>
        <div>
          <h2 className="font-bold text-white">Log a Symptom</h2>
          <p className="text-xs text-slate-400">Track how you're feeling today</p>
        </div>
      </div>

      {submitted ? (
        <div className="text-center py-8 animate-fade-in">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-emerald-400 font-semibold">Symptom logged successfully!</p>
          {isUrgent && (
            <p className="text-rose-300 text-sm mt-2">
              ⚠️ If symptoms worsen, please call 112 immediately.
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Urgent Alert */}
          {isUrgent && (
            <div
              className="flex items-start gap-3 p-4 rounded-xl bg-rose-900/30 border border-rose-500/40"
              role="alert"
            >
              <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" aria-hidden />
              <div>
                <p className="text-sm font-semibold text-rose-300">Potentially urgent!</p>
                <p className="text-xs text-rose-400/80 mt-0.5">
                  If you're experiencing chest pain, difficulty breathing, or other severe symptoms,
                  call <strong>112</strong> immediately. Don't wait.
                </p>
              </div>
            </div>
          )}

          {/* Presets */}
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wide mb-2 block">
              Quick select
            </label>
            <div className="flex flex-wrap gap-2">
              {SYMPTOM_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSymptomChange(preset)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all focus-ring ${
                    symptom === preset
                      ? 'bg-sky-500/30 border-sky-500/60 text-sky-300'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Symptom Input */}
          <div>
            <label htmlFor="symptom-input" className="text-xs text-slate-400 uppercase tracking-wide mb-2 block">
              Describe your symptom *
            </label>
            <input
              id="symptom-input"
              type="text"
              value={symptom}
              onChange={(e) => handleSymptomChange(e.target.value)}
              placeholder="e.g. Mild headache after meals"
              className="w-full bg-white/5 border border-white/10 focus:border-sky-500/50 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all focus-ring"
              required
              maxLength={200}
              aria-required="true"
            />
          </div>

          {/* Severity Slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="severity-slider" className="text-xs text-slate-400 uppercase tracking-wide">
                Severity
              </label>
              <span className={`text-sm font-bold ${severityColor}`}>
                {severity}/10 — {severityLabel}
              </span>
            </div>
            <input
              id="severity-slider"
              type="range"
              min={1}
              max={10}
              value={severity}
              onChange={(e) => setSeverity(Number(e.target.value))}
              className="w-full h-2 appearance-none rounded-full cursor-pointer severity-slider"
              aria-label={`Severity: ${severity} out of 10, ${severityLabel}`}
              aria-valuemin={1}
              aria-valuemax={10}
              aria-valuenow={severity}
            />
            <div className="flex justify-between text-[10px] text-slate-600 mt-1">
              <span>Mild (1)</span>
              <span>Moderate (5)</span>
              <span>Severe (10)</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="symptom-note" className="text-xs text-slate-400 uppercase tracking-wide mb-2 block">
              Additional notes (optional)
            </label>
            <textarea
              id="symptom-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Started after breakfast, lasted 30 minutes…"
              rows={3}
              className="w-full bg-white/5 border border-white/10 focus:border-sky-500/50 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none resize-none transition-all focus-ring"
              maxLength={500}
            />
          </div>

          {error && (
            <p className="text-rose-400 text-sm" role="alert">{error}</p>
          )}

          <button
            type="submit"
            disabled={!symptom.trim() || loading}
            className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-40 focus-ring"
            aria-label="Submit symptom log"
          >
            <Send className="w-4 h-4" aria-hidden />
            {loading ? 'Logging…' : 'Log Symptom'}
          </button>
        </form>
      )}
    </div>
  );
};

export default SymptomLogger;
