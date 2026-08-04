const axios = require('axios');

const GMAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const DIRECTIONS_BASE = 'https://maps.googleapis.com/maps/api/directions/json';

/**
 * Fetch encoded polyline for a route between two lat/lng points.
 * @param {[number, number]} origin      [lat, lng]
 * @param {[number, number]} destination [lat, lng]
 * @returns {string|null} encoded polyline string or null on failure
 */
async function getRoutePolyline(origin, destination) {
  if (!GMAPS_API_KEY || GMAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY') {
    console.warn('⚠️  Google Maps API key not set — returning null polyline');
    return null;
  }
  try {
    const res = await axios.get(DIRECTIONS_BASE, {
      params: {
        origin: `${origin[0]},${origin[1]}`,
        destination: `${destination[0]},${destination[1]}`,
        mode: 'driving',
        key: GMAPS_API_KEY,
      },
      timeout: 5000,
    });
    const routes = res.data.routes;
    if (!routes || routes.length === 0) return null;
    return routes[0].overview_polyline.points;
  } catch (err) {
    console.error('Google Directions API error:', err.message);
    return null;
  }
}

module.exports = { getRoutePolyline };
