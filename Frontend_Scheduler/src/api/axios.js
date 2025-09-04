import axios from 'axios';

const API = axios.create({
  baseURL: `${import.meta.env.VITE_BACKEND_URL}/api`,
});

// Add token to every request (if exists)
API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  
  if (token) {
    req.headers.Authorization = `${token}`;
    console.log(req.headers.Authorization)
  }
  return req;
});

export default API;
