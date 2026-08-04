import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// Add a request interceptor to attach JWT token if present
api.interceptors.request.use(
  (config) => {
    // Both passenger_token and admin_token / conductor_token / driver_token are stored.
    // Let's check passenger_token first, then fallback to others to be universal.
    const token = localStorage.getItem('passenger_token') || 
                  localStorage.getItem('admin_token') || 
                  localStorage.getItem('conductor_token') ||
                  localStorage.getItem('driver_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Commuter / Citizen Search & Info
 */
export const searchBuses = (origin, destination) =>
  api.get('/buses/search', {
    params: { origin_stop_name: origin, destination_stop_name: destination },
  });

export const fetchAllBuses = () => api.get('/buses');
export const fetchStops = () => api.get('/buses/stops');

/**
 * Ticket POS and logs (Conductor / Driver app)
 */
export const issueTicket = (payload) => api.post('/tickets/issue', payload);
export const fetchTickets = () => api.get('/tickets');

/**
 * Occupancy Updates (Conductor / Driver app)
 */
export const updateBusOccupancy = (payload) => api.post('/buses/occupancy', payload);

/**
 * Ambulance & Emergency Response (Driver & Client)
 */
export const fetchAmbulances = () => api.get('/ambulances');
export const fetchHospitals = () => api.get('/ambulances/hospitals');
export const createEmergencyRequest = (payload) => api.post('/ambulances/request', payload);
export const fetchEmergencyRequests = () => api.get('/ambulances/requests');
export const updateEmergencyStatus = (requestId, payload) =>
  api.patch(`/ambulances/request/${requestId}/status`, payload);

// Driver specific
export const registerAmbulance = (payload) => api.post('/ambulances/register', payload);
export const updateAmbulanceStatus = (payload) => api.patch('/driver/status', payload);
export const toggleGreenCorridor = (payload) => api.post('/driver/green-corridor', payload);
export const getMyDispatches = () => api.get('/driver/my-dispatches');
export const getTurnByTurn = (params) => api.get('/driver/turn-by-turn', { params });

/**
 * Bookings (Commuter, Admin)
 */
export const createBooking = (payload) => api.post('/bookings', payload);
export const fetchMyBookings = () => api.get('/bookings/mine');
export const fetchAllBookings = (params) => api.get('/bookings', { params });
export const cancelBooking = (bookingId, reason) => api.delete(`/bookings/${bookingId}`, { data: { reason } });
export const modifyBooking = (bookingId, payload) => api.patch(`/bookings/${bookingId}`, payload);

// Alias matchers for admin components
export const getBookings = (params) => api.get('/bookings', { params });
export const deleteBooking = (bookingId, reason) => api.delete(`/bookings/${bookingId}`, { data: { reason } });
export const patchBooking = (bookingId, data) => api.patch(`/bookings/${bookingId}`, data);

/**
 * Traffic Control overrides (Admin & Driver)
 */
export const fetchIntersections = () => api.get('/traffic/intersections');
export const getIntersections = () => api.get('/traffic/intersections');
export const overrideSignal = (payload) => api.post('/traffic/signal-override', payload);
export const resetSignal = (intersectionId) => api.post(`/traffic/signal-reset/${intersectionId}`);
export const fetchGreenCorridors = () => api.get('/traffic/green-corridors');
export const getGreenCorridors = () => api.get('/traffic/green-corridors');

/**
 * Admin Panel specific calls (/api/admin/...)
 */
export const getMe = () => api.get('/admin/me');
export const getUsers = () => api.get('/admin/users');
export const createUser = (data) => api.post('/admin/users', data);
export const updateUser = (id, data) => api.put(`/admin/users/${id}`, data);
export const getOverviewStats = () => api.get('/admin/stats/overview');
export const getStops = () => api.get('/buses/stops'); // Reuse bus stops
export const getBuses = () => api.get('/buses'); // Reuse fetchAllBuses
export const createBus = (data) => api.post('/admin/buses', data);
export const updateBus = (bus_id, data) => api.put(`/admin/buses/${bus_id}`, data);
export const deleteBus = (bus_id) => api.delete(`/admin/buses/${bus_id}`);

export const getConductors = () => api.get('/admin/conductors');
export const createConductor = (data) => api.post('/admin/conductors', data);
export const updateConductor = (id, data) => api.put(`/admin/conductors/${id}`, data);
export const deleteConductor = (id) => api.delete(`/admin/conductors/${id}`);

export const getRevenueStats = (from, to) => {
  const params = {};
  if (from) params.from = from;
  if (to) params.to = to;
  return api.get('/admin/stats/revenue', { params });
};

// Ambulance emergency stats & status updates for admin components
export const getAmbulances = () => api.get('/ambulances');
export const getEmergencyRequests = () => api.get('/ambulances/requests');
export const getHospitals = () => api.get('/ambulances/hospitals');

export default api;
