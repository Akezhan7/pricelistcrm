import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { toast } from '../context/ToastContext';
import { buildRateLimitMessage } from './apiError';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let lastRateLimitToastAt = 0;

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    if (error.response?.status === 429) {
      const retryAfter = error.response.headers?.['retry-after'];
      const backendMessage = error.response.data?.message;
      const message = buildRateLimitMessage(retryAfter, backendMessage);

      error.message = message;
      if (error.response.data) {
        error.response.data.message = message;
      }

      const now = Date.now();
      if (now - lastRateLimitToastAt > 5000) {
        toast.warning(message, 8000);
        lastRateLimitToastAt = now;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
