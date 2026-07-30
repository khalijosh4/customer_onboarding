import axios from 'axios';

// Point this at your backend's public URL in production (e.g. via a .env
// file consumed by Vite as VITE_API_BASE_URL).
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

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
