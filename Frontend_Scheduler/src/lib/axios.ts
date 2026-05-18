import axios from 'axios';
import { auth } from './firebase';

const API = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api`,
});

// Add token to every request (if exists)
API.interceptors.request.use((req) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      req.headers.Authorization = `${token}`;
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
        const user = auth.currentUser;
        if (user) {
          console.log('🔄 Axios Interceptor: Token expired (401). Refreshing ID token...');
          const newToken = await user.getIdToken(true); // Force refresh token
          localStorage.setItem('token', newToken);
          originalRequest.headers.Authorization = `${newToken}`;
          console.log('✅ Token refreshed successfully. Retrying request:', originalRequest.url);
          return API(originalRequest); // Retry the original request
        }
      } catch (refreshError) {
        console.error('❌ Token refresh failed in interceptor:', refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default API;

