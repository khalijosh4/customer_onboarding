import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiClient } from '../api/client';
import { Application } from '../types';

interface OnboardingContextValue {
  application: Application | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setApplication: (app: Application) => void;
  startNewApplication: () => Promise<Application>;
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

const STORAGE_KEY = 'fortune_sacco_application_id';

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [application, setApplicationState] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);

  const setApplication = (app: Application) => {
    setApplicationState(app);
    localStorage.setItem(STORAGE_KEY, app.id);
  };

  const startNewApplication = async () => {
    const { data } = await apiClient.post<Application>('/applications');
    setApplication(data);
    return data;
  };

  const refresh = async () => {
    const id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await apiClient.get<Application>(`/applications/${id}`);
      setApplicationState(data);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <OnboardingContext.Provider
      value={{ application, loading, refresh, setApplication, startNewApplication }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}
