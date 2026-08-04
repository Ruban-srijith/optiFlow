import axios from 'axios';

const api = axios.create({ baseURL: '/api/admin' });
const authApi = axios.create({ baseURL: '/api/auth' });
const generalApi = axios.create({ baseURL: '/api' });

const attachToken = (config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
};

api.interceptors.request.use(attachToken);
generalApi.interceptors.request.use(attachToken);

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

// Bookings
export const getBookings = (params) => generalApi.get('/bookings', { params });
export const deleteBooking = (bookingId, reason) => generalApi.delete(`/bookings/${bookingId}`, { data: { reason } });
export const patchBooking = (bookingId, data) => generalApi.patch(`/bookings/${bookingId}`, data);

// Traffic Control
export const getIntersections = () => generalApi.get('/traffic/intersections');
export const overrideSignal = (data) => generalApi.post('/traffic/signal-override', data);
export const resetSignal = (intersectionId) => generalApi.post(`/traffic/signal-reset/${intersectionId}`);
export const getGreenCorridors = () => generalApi.get('/traffic/green-corridors');

// Ambulance Emergency
export const getAmbulances = () => generalApi.get('/ambulances');
export const getEmergencyRequests = () => generalApi.get('/ambulances/requests');
export const updateEmergencyStatus = (requestId, data) => generalApi.patch(`/ambulances/request/${requestId}/status`, data);
export const getHospitals = () => generalApi.get('/ambulances/hospitals');
