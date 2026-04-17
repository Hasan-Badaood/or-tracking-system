import axios from 'axios';
import { isEncryptedPayload, decryptPayload, encryptionEnabled } from '../lib/crypto';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  async (response) => {
    if (encryptionEnabled && isEncryptedPayload(response.data)) {
      response.data = await decryptPayload(response.data);
    }
    return response;
  },
  async (error) => {
    if (encryptionEnabled && isEncryptedPayload(error.response?.data)) {
      try {
        error.response.data = await decryptPayload(error.response.data);
      } catch {
        // ignore decryption failure on error responses
      }
    }
    const isLoginEndpoint = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginEndpoint) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
