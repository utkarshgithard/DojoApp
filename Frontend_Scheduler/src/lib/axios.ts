import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { auth } from './firebase';

const configuredApiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const apiBaseUrl = configuredApiUrl.replace(/\/+$/, '').endsWith('/api')
  ? configuredApiUrl.replace(/\/+$/, '')
  : `${configuredApiUrl.replace(/\/+$/, '')}/api`;

const API = axios.create({
  baseURL: apiBaseUrl,
});

// Wait for Firebase to emit the first auth state (resolves once initialization is complete)
const firebaseReady: Promise<void> = new Promise((resolve) => {
  const unsubscribe = auth.onAuthStateChanged(() => {
    unsubscribe();
    resolve();
  });
});

// Add token to every request — try cached token first to avoid blocking on Firebase
API.interceptors.request.use(async (req) => {
  if (typeof window !== 'undefined') {
    const cachedToken = localStorage.getItem('token');
    if (cachedToken) {
      req.headers.Authorization = cachedToken;
    } else {
      // No cached token, block the request until Firebase has finished initializing
      await firebaseReady;
      const currentUser = auth.currentUser;
      if (currentUser) {
        const token = await currentUser.getIdToken();
        localStorage.setItem('token', token);
        req.headers.Authorization = token;
      }
    }
  }
  return req;
});

// Automatically handle expired tokens by refreshing via Firebase and retrying
API.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;
    const method = originalRequest?.method?.toUpperCase();
    const retryCount = Number((originalRequest as (InternalAxiosRequestConfig & { _getRetryCount?: number }) | undefined)?._getRetryCount || 0);

    // GET requests are safe to retry during brief backend/database reconnects.
    if (originalRequest && method === 'GET' && retryCount < 2 && (!error.response || error.response.status >= 500)) {
      const retryRequest = originalRequest as InternalAxiosRequestConfig & { _getRetryCount?: number };
      retryRequest._getRetryCount = retryCount + 1;
      await new Promise((resolve) => setTimeout(resolve, 300 * 2 ** retryCount));
      return API(retryRequest);
    }

    const authRetryRequest = originalRequest as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (error.response?.status === 401 && authRetryRequest && !authRetryRequest._retry) {
      authRetryRequest._retry = true;
      try {
        // Wait for Firebase to be ready before calling auth.currentUser
        await firebaseReady;
        const currentUser = auth.currentUser;
        if (currentUser) {
          console.log('🔄 Axios Interceptor: Token expired (401). Refreshing ID token...');
          const newToken = await currentUser.getIdToken(true);
          localStorage.setItem('token', newToken);
          authRetryRequest.headers.Authorization = newToken;
          console.log('✅ Token refreshed successfully. Retrying request:', authRetryRequest.url);
          return API(authRetryRequest);
        }
      } catch (refreshError) {
        console.error('❌ Token refresh failed in interceptor:', refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default API;
