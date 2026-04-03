import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import AuthService from './services/AuthService';
import OnboardingFlow from './components/OnboardingFlow';
import PatientDashboard from './components/PatientDashboard';
import { ErrorBoundary } from './components/ErrorBoundary';

/**
 * App — Root component managing authentication state routing.
 *
 * Renders OnboardingFlow for unauthenticated users and
 * PatientDashboard for authenticated users.
 */
const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0A0F1E] flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center mb-4 shadow-xl shadow-sky-500/30">
            <span className="text-3xl" role="img" aria-label="Loading">🏥</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <div className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" aria-hidden />
            <span>Initializing AfterCare AI…</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      {user ? (
        <PatientDashboard />
      ) : (
        <OnboardingFlow onSignIn={setUser} />
      )}
    </ErrorBoundary>
  );
};

export default App;
