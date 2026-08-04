import axios from 'axios';

const api = axios.create({ baseURL: '/api/admin' });
const authApi = axios.create({ baseURL: '/api/auth' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Admin Username/Password Auth
export const adminLogin = (username, password) => api.post('/login', { username, password });
export const getMe = () => api.get('/me');

// Phone OTP Auth
export const sendOtp = (phone_number, requested_role) => authApi.post('/send-otp', { phone_number, requested_role });
export const verifyOtp = (phone_number, otp) => authApi.post('/verify-otp', { phone_number, otp });

// System & User Management
export const getUsers = () => api.get('/users');
export const createUser = (data) => api.post('/users', data);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const getOverviewStats = () => api.get('/stats/overview');

// Stops & Routes
export const getStops = () => api.get('/stops');
export const getBuses = () => api.get('/buses');
export const createBus = (data) => api.post('/buses', data);
export const updateBus = (bus_id, data) => api.put(`/buses/${bus_id}`, data);
export const deleteBus = (bus_id) => api.delete(`/buses/${bus_id}`);

// Conductors
export const getConductors = () => api.get('/conductors');
export const createConductor = (data) => api.post('/conductors', data);
export const updateConductor = (id, data) => api.put(`/conductors/${id}`, data);
export const deleteConductor = (id) => api.delete(`/conductors/${id}`);

// Revenue
export const getRevenueStats = (from, to) => {
  const params = {};
  if (from) params.from = from;
  if (to) params.to = to;
  return api.get('/stats/revenue', { params });
};
