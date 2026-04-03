import React from 'react';
import { CheckCircle, AlertCircle, ChevronRight, FileText } from 'lucide-react';
import { DischargeSummary } from '../types/models';

interface SummaryCardProps {
  summary: DischargeSummary;
}

/**
 * SummaryCard — displays the AI-simplified discharge summary.
 *
 * Shows the diagnosis, AI-plain-text explanation, and care instruction checklist.
 * Uses glassmorphism design from the Ethereal Clinic design system.
 */
const SummaryCard: React.FC<SummaryCardProps> = ({ summary }) => {
  const displayText = summary.simplifiedText || summary.plainText;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Diagnosis Hero */}
      <div className="glass-card p-6 border border-sky-500/20 bg-gradient-to-br from-sky-900/30 to-teal-900/20">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-sky-500/20 flex-shrink-0">
            <FileText className="w-6 h-6 text-sky-400" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-400 mb-1">
              Primary Diagnosis
            </p>
            <h2 className="text-2xl font-bold text-white leading-tight">
              {summary.diagnosis}
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Discharge summary from {new Date(summary.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>

      {/* AI Plain-Language Summary */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" aria-hidden="true" />
          <h3 className="font-semibold text-white text-sm uppercase tracking-wide">
            AI-Simplified Explanation
          </h3>
          <span className="ml-auto text-xs text-teal-400 bg-teal-400/10 px-2 py-0.5 rounded-full">
            Powered by Gemini
          </span>
        </div>
        <div className="prose prose-invert max-w-none">
          <p className="text-slate-300 leading-relaxed whitespace-pre-wrap text-sm">
            {displayText || 'Your summary is being processed…'}
          </p>
        </div>
      </div>

      {/* Care Instructions */}
      <div className="glass-card p-6">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-400" aria-hidden="true" />
          Care Instructions
        </h3>
        <ul className="space-y-3" role="list" aria-label="Care instructions">
          {summary.instructions.length > 0 ? (
            summary.instructions.map((instruction, idx) => (
              <li key={idx} className="flex items-start gap-3 group">
                <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500/30 transition-colors">
                  <ChevronRight className="w-3 h-3 text-emerald-400" aria-hidden="true" />
                </div>
                <span className="text-slate-300 text-sm leading-relaxed">{instruction}</span>
              </li>
            ))
          ) : (
            <li className="text-slate-400 text-sm">Follow your doctor's guidance as provided.</li>
          )}
        </ul>
      </div>

      {/* Urgent Warning */}
      <div className="glass-card p-4 border border-rose-500/30 bg-rose-900/10">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-rose-300">When to seek emergency care</p>
            <p className="text-xs text-rose-400/80 mt-1">
              Call 112 immediately if you experience chest pain, difficulty breathing,
              severe headache, or loss of consciousness.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryCard;
