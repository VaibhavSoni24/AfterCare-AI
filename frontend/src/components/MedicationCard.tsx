import React, { useState } from 'react';
import { Pill, Clock, CheckCircle, Circle } from 'lucide-react';
import { Medication } from '../types/models';

interface MedicationCardProps {
  medication: Medication;
  onMarkTaken: (medId: string, time: string) => Promise<void>;
}

/**
 * MedicationCard — displays a medication with schedule and mark-taken actions.
 *
 * Color-coded by adherence status. Shows a progress bar and per-dose time chips.
 */
const MedicationCard: React.FC<MedicationCardProps> = ({ medication, onMarkTaken }) => {
  const [loading, setLoading] = useState(false);
  const [localTaken, setLocalTaken] = useState(medication.takenToday);

  const adherencePct = medication.times.length > 0
    ? (localTaken / medication.times.length) * 100
    : 100;

  const isFullyTaken = localTaken >= medication.times.length;
  const nextDoseTime = medication.times[localTaken]
    ? medication.times[localTaken]
    : null;

  const handleTake = async () => {
    if (isFullyTaken || loading) return;
    const nextTime = medication.times[localTaken];
    if (!nextTime) return;

    setLoading(true);
    try {
      await onMarkTaken(medication.id, nextTime);
      setLocalTaken((prev) => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`glass-card p-6 transition-all duration-300 hover:scale-[1.01] hover:-translate-y-0.5 ${
        isFullyTaken
          ? 'border border-emerald-500/30 bg-emerald-900/10'
          : 'border border-white/5 hover:border-sky-500/30'
      }`}
      role="article"
      aria-label={`Medication: ${medication.name} ${medication.dose}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl ${
              isFullyTaken ? 'bg-emerald-500/20' : 'bg-sky-500/20'
            }`}
          >
            <Pill
              className={`w-5 h-5 ${isFullyTaken ? 'text-emerald-400' : 'text-sky-400'}`}
              aria-hidden
            />
          </div>
          <div>
            <h3 className="font-bold text-white">{medication.name}</h3>
            <p className="text-sky-400 text-sm font-medium">{medication.dose}</p>
          </div>
        </div>
        <span
          className={`text-xs px-2 py-1 rounded-full font-medium ${
            isFullyTaken
              ? 'bg-emerald-400/20 text-emerald-300'
              : 'bg-amber-400/20 text-amber-300'
          }`}
        >
          {medication.frequency}
        </span>
      </div>

      {/* Schedule Times */}
      <div className="flex flex-wrap gap-2 mb-4" role="list" aria-label="Scheduled times">
        {medication.times.map((time, idx) => (
          <div
            key={idx}
            role="listitem"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              idx < localTaken
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : idx === localTaken
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 animate-pulse-subtle'
                : 'bg-white/5 text-slate-400 border border-white/10'
            }`}
          >
            {idx < localTaken ? (
              <CheckCircle className="w-3.5 h-3.5" aria-hidden />
            ) : (
              <Clock className="w-3.5 h-3.5" aria-hidden />
            )}
            {time}
          </div>
        ))}
      </div>

      {/* Adherence Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-400 mb-1.5">
          <span>Today's adherence</span>
          <span className={isFullyTaken ? 'text-emerald-400 font-medium' : 'text-sky-400'}>
            {localTaken}/{medication.times.length} doses
          </span>
        </div>
        <div
          className="h-1.5 bg-white/5 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={Math.round(adherencePct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${Math.round(adherencePct)}% of today's doses taken`}
        >
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              isFullyTaken
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                : 'bg-gradient-to-r from-sky-500 to-teal-400'
            }`}
            style={{ width: `${adherencePct}%` }}
          />
        </div>
      </div>

      {/* Plain explanation */}
      {medication.plainExplanation && (
        <p className="text-slate-400 text-xs leading-relaxed mb-4 border-t border-white/5 pt-3">
          {medication.plainExplanation}
        </p>
      )}

      {/* Mark Taken Button */}
      <button
        onClick={handleTake}
        disabled={isFullyTaken || loading}
        className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all focus-ring ${
          isFullyTaken
            ? 'bg-emerald-500/20 text-emerald-300 cursor-default'
            : loading
            ? 'bg-sky-500/40 text-sky-300 cursor-wait'
            : 'btn-primary hover:shadow-sky-500/20 hover:shadow-lg'
        }`}
        aria-label={
          isFullyTaken
            ? `All doses of ${medication.name} taken for today`
            : `Mark ${medication.name} ${nextDoseTime || ''} dose as taken`
        }
      >
        {isFullyTaken ? (
          <span className="flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4" aria-hidden /> All Doses Taken ✓
          </span>
        ) : loading ? (
          'Marking taken…'
        ) : (
          `Mark ${nextDoseTime || 'Next'} Dose Taken`
        )}
      </button>
    </div>
  );
};

export default MedicationCard;
