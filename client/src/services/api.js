import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

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

export default api;
