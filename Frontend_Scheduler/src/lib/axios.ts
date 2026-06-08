import axios from 'axios';
import { auth } from './firebase';

const API = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'}/api`,
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
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        // Wait for Firebase to be ready before calling auth.currentUser
        await firebaseReady;
        const currentUser = auth.currentUser;
        if (currentUser) {
          console.log('🔄 Axios Interceptor: Token expired (401). Refreshing ID token...');
          const newToken = await currentUser.getIdToken(true);
          localStorage.setItem('token', newToken);
          originalRequest.headers.Authorization = newToken;
          console.log('✅ Token refreshed successfully. Retrying request:', originalRequest.url);
          return API(originalRequest);
        }
      } catch (refreshError) {
        console.error('❌ Token refresh failed in interceptor:', refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default API;
