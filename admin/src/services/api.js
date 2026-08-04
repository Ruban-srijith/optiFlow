import axios from 'axios';

const api = axios.create({ baseURL: '/api/admin' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const adminLogin = (username, password) => api.post('/login', { username, password });
export const getMe = () => api.get('/me');

export const getStops = () => api.get('/stops');

export const getBuses = () => api.get('/buses');
export const createBus = (data) => api.post('/buses', data);
export const updateBus = (bus_id, data) => api.put(`/buses/${bus_id}`, data);
export const deleteBus = (bus_id) => api.delete(`/buses/${bus_id}`);

export const getConductors = () => api.get('/conductors');
export const createConductor = (data) => api.post('/conductors', data);
export const updateConductor = (id, data) => api.put(`/conductors/${id}`, data);
export const deleteConductor = (id) => api.delete(`/conductors/${id}`);

export const getRevenueStats = (from, to) => {
  const params = {};
  if (from) params.from = from;
  if (to) params.to = to;
  return api.get('/stats/revenue', { params });
};
