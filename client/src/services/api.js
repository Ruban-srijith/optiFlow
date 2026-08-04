import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// Add a request interceptor to attach JWT token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('passenger_token');
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
 * Search buses between two stops
 * @param {string} origin      stop name (partial match ok)
 * @param {string} destination stop name
 */
export const searchBuses = (origin, destination) =>
  api.get('/buses/search', {
    params: { origin_stop_name: origin, destination_stop_name: destination },
  });

/**
 * Fetch all buses with live positions
 */
export const fetchAllBuses = () => api.get('/buses');

/**
 * Fetch all stops
 */
export const fetchStops = () => api.get('/buses/stops');

/**
 * Issue a ticket (for testing purposes)
 */
export const issueTicket = (payload) => api.post('/tickets/issue', payload);

/**
 * Ambulance & Emergency API Endpoints
 */
export const fetchAmbulances = () => api.get('/ambulances');
export const fetchHospitals = () => api.get('/ambulances/hospitals');
export const createEmergencyRequest = (payload) => api.post('/ambulances/request', payload);
export const fetchEmergencyRequests = () => api.get('/ambulances/requests');
export const updateEmergencyStatus = (requestId, payload) =>
  api.patch(`/ambulances/request/${requestId}/status`, payload);

/**
 * Booking API Endpoints
 */
export const createBooking = (payload) => api.post('/bookings', payload);
export const fetchMyBookings = () => api.get('/bookings/mine');
export const fetchAllBookings = (params) => api.get('/bookings', { params });
export const cancelBooking = (bookingId, reason) => api.delete(`/bookings/${bookingId}`, { data: { reason } });
export const modifyBooking = (bookingId, payload) => api.patch(`/bookings/${bookingId}`, payload);

/**
 * Traffic Control API Endpoints
 */
export const fetchIntersections = () => api.get('/traffic/intersections');
export const overrideSignal = (payload) => api.post('/traffic/signal-override', payload);
export const resetSignal = (intersectionId) => api.post(`/traffic/signal-reset/${intersectionId}`);
export const fetchGreenCorridors = () => api.get('/traffic/green-corridors');

export default api;
