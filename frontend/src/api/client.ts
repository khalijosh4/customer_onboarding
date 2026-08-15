import axios from 'axios';

// Requests go to the SAME origin the page is served from ('/api'), which the
// dev server proxies to the backend (see vite.config.ts). This makes the app
// work when opened from a phone on the same network (e.g. http://10.x.x.x:5175)
// where 'localhost' would point at the phone itself. For a production build,
// set VITE_API_BASE_URL to your real API URL.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

export function getApiErrorMessage(error: any, fallback = 'Something went wrong') {
  const message = error?.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  if (message && typeof message === 'object') return message.message || message.error || JSON.stringify(message);
  if (typeof message === 'string') return message;
  return error?.message || fallback;
}

// Attach the admin JWT (if present) to every request so admin-only
// endpoints work without repeating this in every call site.
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('fortune_admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If an admin API call returns 401 the stored session is stale or expired
// (the JWT has an 8h TTL). Clear it and bounce to the login screen instead
// of leaving a wall of uncaught "401 Unauthorized" errors on the dashboard.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && error?.config?.url?.startsWith('/admin')) {
      const onLoginPage = window.location.pathname.endsWith('/login');
      localStorage.removeItem('fortune_admin_token');
      localStorage.removeItem('fortune_admin_name');
      if (window.location.pathname.startsWith('/admin') && !onLoginPage) {
        window.location.assign('/admin/login');
      }
    }
    return Promise.reject(error);
  },
);
