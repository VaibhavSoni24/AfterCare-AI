import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import AuthService from '../services/AuthService';
import { ErrorBoundary } from './ErrorBoundary';

/**
 * OnboardingFlow — Google Sign-In landing screen.
 *
 * Shows the AfterCare AI branding, feature highlights, and Google OAuth button.
 * Transitions to PatientDashboard after successful authentication.
 */
const OnboardingFlow: React.FC<{ onSignIn: (user: User) => void }> = ({ onSignIn }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await AuthService.signInWithGoogle();
      onSignIn(result.user);
    } catch (err: any) {
      setError(err?.message || 'Sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: '📋', title: 'Understand Your Summary', desc: 'AI converts complex medical discharge papers into plain language.' },
    { icon: '💬', title: 'AI Care Assistant', desc: "Ask questions about your diagnosis, medications, and recovery 24/7." },
    { icon: '💊', title: 'Medication Reminders', desc: 'Track your full schedule and mark doses taken from your phone.' },
    { icon: '📅', title: 'Appointment Booking', desc: 'Schedule follow-ups and sync directly to Google Calendar.' },
  ];

  return (
    <div className="min-h-screen bg-[#0A0F1E] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg w-full text-center">
        {/* Logo */}
        <div className="mx-auto w-20 h-20 rounded-3xl bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center mb-6 shadow-2xl shadow-sky-500/30 transform hover:scale-105 transition-transform">
          <span className="text-4xl" role="img" aria-label="Hospital">🏥</span>
        </div>

        <h1 className="text-4xl font-bold text-white mb-2">
          Aftercare <span className="bg-gradient-to-r from-sky-400 to-teal-400 bg-clip-text text-transparent">AI</span>
        </h1>
        <p className="text-slate-400 mb-10 text-lg">
          Your compassionate post-visit companion
        </p>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3 mb-10 text-left">
          {features.map((f, idx) => (
            <div key={idx} className="glass-card p-4 hover:border-sky-500/30 transition-colors">
              <span className="text-2xl mb-2 block" role="img" aria-hidden>{f.icon}</span>
              <h3 className="text-white text-sm font-semibold mb-1">{f.title}</h3>
              <p className="text-slate-400 text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Sign In Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white text-slate-800 font-semibold py-4 px-8 rounded-2xl hover:bg-slate-50 transition-all shadow-2xl hover:shadow-xl focus-ring disabled:opacity-70 transform hover:scale-[1.02] active:scale-[0.98]"
          aria-label="Sign in with Google"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-slate-400 border-t-slate-800 rounded-full animate-spin" aria-hidden />
          ) : (
            <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
              <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
              <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
            </svg>
          )}
          {loading ? 'Signing in…' : 'Continue with Google'}
        </button>

        {error && (
          <p className="mt-4 text-rose-400 text-sm" role="alert">{error}</p>
        )}

        <p className="mt-6 text-xs text-slate-600">
          Built for AMD Slingshot Hackathon · Powered by Gemini 1.5 Flash + Firebase
        </p>
      </div>
    </div>
  );
};

export default OnboardingFlow;
