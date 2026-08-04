import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('conductor_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally — force logout
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('conductor_token');
      localStorage.removeItem('conductor_info');
      window.location.reload();
    }
    return Promise.reject(err);
  }
);

export const login = (username, password) =>
  api.post('/auth/login', { username, password });

export const sendOtp = (phone_number, requested_role = 'conductor') =>
  api.post('/auth/send-otp', { phone_number, requested_role });

export const verifyOtp = (phone_number, otp) =>
  api.post('/auth/verify-otp', { phone_number, otp });

export const getMe = () => api.get('/auth/me');

export const fetchAllBuses = () => api.get('/buses');

export const issueTicket = (payload) => api.post('/tickets/issue', payload);

export const fetchTickets = () => api.get('/tickets');

export default api;
