import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { apiClient, getApiErrorMessage } from '../api/client';
import { Application } from '../types';

interface OnboardingContextValue {
  application: Application | null;
  loading: boolean;
  loadError: string | null;
  refresh: () => Promise<void>;
  retry: () => Promise<void>;
  setApplication: (app: Application) => void;
  startNewApplication: () => Promise<Application>;
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

const STORAGE_KEY = 'fortune_sacco_application_id';

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [application, setApplicationState] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const setApplication = (app: Application) => {
    setApplicationState(app);
    setLoadError(null);
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

  const initInFlight = useRef<Promise<void> | null>(null);

  // Loads the in-progress application (or creates a fresh one). If the backend
  // is unreachable the error is surfaced so the user sees *why* the screen was
  // stuck, instead of an infinite spinner. In dev, React StrictMode fires this
  // effect twice on mount, so guard against two concurrent init calls (which
  // otherwise both POST a blank application and race on the reference number).
  const init = useCallback(async () => {
    if (initInFlight.current) return initInFlight.current;
    const task = (async () => {
      setLoading(true);
      setLoadError(null);
      const id = localStorage.getItem(STORAGE_KEY);
      try {
        if (id) {
          try {
            const { data } = await apiClient.get<Application>(`/applications/${id}`);
            setApplicationState(data);
            return;
          } catch {
            // Stale id — fall through and create a new application.
            localStorage.removeItem(STORAGE_KEY);
          }
        }
        const { data } = await apiClient.post<Application>('/applications');
        setApplicationState(data);
        localStorage.setItem(STORAGE_KEY, data.id);
      } catch (err) {
        setLoadError(getApiErrorMessage(err, 'Could not reach the server. Make sure the backend is running and try again.'));
      } finally {
        setLoading(false);
      }
    })();
    initInFlight.current = task;
    try {
      return await task;
    } finally {
      if (initInFlight.current === task) initInFlight.current = null;
    }
  }, []);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <OnboardingContext.Provider
      value={{ application, loading, loadError, refresh, retry: init, setApplication, startNewApplication }}
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
