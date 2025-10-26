import axios from 'axios';

// Get API base URL from environment variables with fallback
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

/**
 * Create axios instance with default configuration
 */
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000, // 10 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor to add authentication token
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor to handle common errors
 */
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common HTTP errors
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          // Token expired or invalid - redirect to login
          localStorage.removeItem('token');
          if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
            window.location.href = '/login';
          }
          break;
        case 403:
          console.error('Access forbidden:', data.message);
          break;
        case 404:
          console.error('Resource not found:', data.message);
          break;
        case 500:
          console.error('Server error:', data.message);
          break;
        default:
          console.error('API Error:', data.message || 'Unknown error occurred');
      }
      
      // Return a standardized error format
      const errorMessage = data?.message || 'An unexpected error occurred';
      return Promise.reject(new Error(errorMessage));
    } else if (error.request) {
      // Network error
      console.error('Network error:', error.message);
      return Promise.reject(new Error('Network error. Please check your connection.'));
    } else {
      // Something else happened
      console.error('Error:', error.message);
      return Promise.reject(error);
    }
  }
);

/**
 * API service methods
 */
export const apiService = {
  // User endpoints
  user: {
    register: (userData) => apiClient.post('/users/register', userData),
    login: (credentials) => apiClient.post('/users/login', credentials),
    logout: () => apiClient.post('/users/logout'),
    getProfile: () => apiClient.get('/users/profile'),
  },
  
  // Service endpoints
  services: {
    getAll: (params = {}) => apiClient.get('/services', { params }),
    create: (serviceData) => apiClient.post('/services', serviceData),
    update: (id, serviceData) => apiClient.put(`/services/${id}`, serviceData),
    delete: (id) => apiClient.delete(`/services/${id}`),
  },
};

/**
 * Helper function to handle API errors consistently
 * @param {Error} error - The error object from API call
 * @returns {string} User-friendly error message
 */
export const handleApiError = (error) => {
  if (error.response?.data) {
    const { message, errors } = error.response.data;
    
    // If there are validation errors, format them nicely
    if (errors && Array.isArray(errors)) {
      const errorMessages = errors.map(err => err.message).join('. ');
      return `${message}: ${errorMessages}`;
    }
    
    // Return the main message
    if (message) {
      return message;
    }
  }
  
  if (error.message) {
    return error.message;
  }
  
  return 'An unexpected error occurred. Please try again.';
};

export default apiClient;