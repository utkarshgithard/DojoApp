import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
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
