import axios from 'axios';

// Get API URL from environment variable (root only)
let API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, '');
// If someone set NEXT_PUBLIC_API_URL to include '/api' or '/api/', strip it to keep root only
API_URL = API_URL.replace(/\/api\/?$/, '');

// Create axios instance with base URL
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    // Get token from cookies or sessionStorage
    const token = 
      typeof window !== 'undefined' 
        ? (document.cookie.split('; ').find(row => row.startsWith('authToken='))?.split('=')[1] || 
           sessionStorage.getItem('authToken'))
        : null;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    
    if (error.response?.status === 401) {
      // Unauthorized - clear tokens and redirect to login
      if (typeof window !== 'undefined') {
        document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        sessionStorage.removeItem('authToken');
        window.location.href = '/login';
      }
    } else if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
      // Network error - likely CORS or backend not accessible
      console.error('Network error - check backend availability and CORS configuration');
    } else if (error.response?.status === 0) {
      // CORS error or backend not accessible
      console.error('CORS error or backend not accessible');
    }
    
    return Promise.reject(error);
  }
);

export default api;
