require('dotenv').config();
const express = require('express');
const router = express.Router();
const axios = require('axios');
const Bus = require('../models/Bus');
const Stop = require('../models/Stop');
const Ticket = require('../models/Ticket');
const { getRoutePolyline } = require('../services/googleMaps');
const { verifyToken, denyRoles, verifyRole } = require('../middleware/authMiddleware');

// TNSTC Fare Formula: ₹2 per stop, minimum ₹5
function calculateFare(stopCount) {
  return Math.max(5, stopCount * 2);
}

// ---------------------------------------------------------------------------
// GET /api/buses/search
// Query: origin_stop_name, destination_stop_name
// Deny: ambulance_driver
// ---------------------------------------------------------------------------
router.get('/search', verifyToken, denyRoles(['ambulance_driver']), async (req, res) => {
  try {
    const { origin_stop_name, destination_stop_name } = req.query;

    if (!origin_stop_name || !destination_stop_name) {
      return res.status(400).json({ error: 'origin_stop_name and destination_stop_name are required' });
    }

    let originStops = [];
    let destStops = [];
    let allBuses = [];

    const mongoose = require('mongoose');

    if (mongoose.connection.readyState === 1) {
      [originStops, destStops, allBuses] = await Promise.all([
        Stop.find({ stop_name: { $regex: origin_stop_name, $options: 'i' } }),
        Stop.find({ stop_name: { $regex: destination_stop_name, $options: 'i' } }),
        Bus.find({}),
      ]);
    } else {
      // In-memory fallback
      const MOCK_STOPS_LIST = [
        { stop_id: 105, stop_name: 'Gandhipuram' },
        { stop_id: 108, stop_name: 'Maruthamalai' },
        { stop_id: 101, stop_name: 'Ondipudur' },
        { stop_id: 201, stop_name: 'Ganapathy' },
        { stop_id: 204, stop_name: 'Ukkadam' },
        { stop_id: 301, stop_name: 'Railway Station' },
        { stop_id: 303, stop_name: 'Thudiyalur' },
        { stop_id: 403, stop_name: 'Aerodrome (SITRA)' },
        { stop_id: 414, stop_name: 'Pollachi' },
      ];
      originStops = MOCK_STOPS_LIST.filter(s => s.stop_name.toLowerCase().includes(origin_stop_name.toLowerCase()));
      destStops = MOCK_STOPS_LIST.filter(s => s.stop_name.toLowerCase().includes(destination_stop_name.toLowerCase()));
      if (!originStops.length) originStops = [{ stop_id: 105, stop_name: origin_stop_name }];
      if (!destStops.length) destStops = [{ stop_id: 108, stop_name: destination_stop_name }];
    }

    const originIds = originStops.map((s) => s.stop_id);
    const destIds = destStops.map((s) => s.stop_id);

    // Filter: origin must come before destination in sequence
    const matchingBuses = allBuses.filter((bus) => {
      const originEntry = bus.route_stops.find((rs) => originIds.includes(rs.stop_id));
      const destEntry = bus.route_stops.find((rs) => destIds.includes(rs.stop_id));
      return originEntry && destEntry && originEntry.sequence < destEntry.sequence;
    });

    if (matchingBuses.length === 0) {
      return res.json({ buses: [], message: 'No direct buses found for this route.' });
    }

    // Build response with occupancy, ML predictions, polyline
    const now = new Date();
    const results = await Promise.all(
      matchingBuses.map(async (bus) => {
        const originEntry = bus.route_stops.find((rs) => originIds.includes(rs.stop_id));
        const destEntry = bus.route_stops.find((rs) => destIds.includes(rs.stop_id));
        const stopCount = destEntry.sequence - originEntry.sequence;

        // Compute ACTIVE occupancy: tickets where bus current sequence hasn't passed destination yet
        const currentSeq = bus.current_stop_sequence;
        const activeTickets = await Ticket.find({ bus_id: bus.bus_id });

        let currentPassengers = 0;
        for (const ticket of activeTickets) {
          const tOriginEntry = bus.route_stops.find((rs) => rs.stop_id === ticket.origin_stop_id);
          const tDestEntry = bus.route_stops.find((rs) => rs.stop_id === ticket.destination_stop_id);
          if (tOriginEntry && tDestEntry) {
            if (currentSeq >= tOriginEntry.sequence && currentSeq < tDestEntry.sequence) {
              currentPassengers += ticket.passenger_count;
            } else if (currentSeq < tOriginEntry.sequence) {
              currentPassengers += ticket.passenger_count;
            }
          }
        }

        const freeSeats = Math.max(0, bus.seating_capacity - currentPassengers);
        const standingPassengers = Math.max(0, currentPassengers - bus.seating_capacity);
        const fare = calculateFare(stopCount);

        // ML Forecast - stop-by-stop prediction
        let forecast = [];
        try {
          const stopsInRange = bus.route_stops
            .filter((rs) => rs.sequence >= originEntry.sequence && rs.sequence <= destEntry.sequence)
            .sort((a, b) => a.sequence - b.sequence);

          const hour = now.getHours();
          const day = now.getDay();

          const mlRes = await axios.post(
            `${process.env.ML_SERVICE_URL}/predict_route`,
            {
              stops: stopsInRange.map((rs) => rs.stop_id),
              hour_of_day: hour,
              day_of_week: day,
              current_occupancy: currentPassengers,
              seating_capacity: bus.seating_capacity,
            },
            { timeout: 3000 }
          );
          forecast = mlRes.data.forecast || [];
        } catch (_) {
          // ML service unavailable - generate simple fallback forecast
          const stopsInRange = bus.route_stops
            .filter((rs) => rs.sequence >= originEntry.sequence && rs.sequence <= destEntry.sequence)
            .sort((a, b) => a.sequence - b.sequence);

          let occupancy = currentPassengers;
          for (const rs of stopsInRange) {
            const stop = await Stop.findOne({ stop_id: rs.stop_id });
            const dropoffs = Math.floor(Math.random() * 5);
            const boardings = Math.floor(Math.random() * 8);
            occupancy = Math.max(0, occupancy - dropoffs + boardings);
            forecast.push({
              stop_id: rs.stop_id,
              stop_name: stop ? stop.stop_name : `Stop ${rs.stop_id}`,
              predicted_free_seats: Math.max(0, bus.seating_capacity - occupancy),
              predicted_boardings: boardings,
              predicted_dropoffs: dropoffs,
            });
          }
        }

        // Polyline for route segment
        const originStop = originStops[0];
        const destStop = destStops[0];
        let polyline = null;
        if (originStop && destStop) {
          polyline = await getRoutePolyline(
            [originStop.location.coordinates[1], originStop.location.coordinates[0]],
            [destStop.location.coordinates[1], destStop.location.coordinates[0]]
          );
        }

        return {
          bus_id: bus.bus_id,
          bus_number: bus.bus_number,
          route_name: bus.route_name,
          seating_capacity: bus.seating_capacity,
          standing_capacity: bus.standing_capacity,
          current_passengers: currentPassengers,
          free_seats: freeSeats,
          standing_passengers: standingPassengers,
          intermediate_stops: stopCount - 1,
          fare,
          current_location: bus.current_location.coordinates, // [lng, lat]
          forecast,
          polyline,
        };
      })
    );

    res.json({ buses: results, origin: originStops[0], destination: destStops[0] });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/buses - list all buses with live positions
// Deny: ambulance_driver
// ---------------------------------------------------------------------------
router.get('/', verifyToken, denyRoles(['ambulance_driver']), async (req, res) => {
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      const buses = await Bus.find({}, '-__v');
      if (buses && buses.length > 0) return res.json(buses);
    }
  } catch (err) {
    console.warn('MongoDB query warning on /buses:', err.message);
  }

  // Fallback bus list
  return res.json([
    {
      bus_id: 'TN-38-N-1234',
      bus_number: '1D',
      route_name: 'Ondipudur → Maruthamalai',
      seating_capacity: 40,
      standing_capacity: 20,
      current_occupancy_seated: 24,
      current_occupancy_standing: 8,
      current_location: { coordinates: [76.9629, 11.0168] },
      status: 'active',
      route_stops: [{ stop_id: 'STOP_OND', sequence: 0 }, { stop_id: 'STOP_GANDHI', sequence: 1 }, { stop_id: 'STOP_MAR', sequence: 2 }]
    },
    {
      bus_id: 'TN-38-N-5678',
      bus_number: '3D',
      route_name: 'Ganapathy → Kovaipudur',
      seating_capacity: 45,
      standing_capacity: 15,
      current_occupancy_seated: 30,
      current_occupancy_standing: 4,
      current_location: { coordinates: [76.9558, 11.0284] },
      status: 'active',
      route_stops: [{ stop_id: 'STOP_SING', sequence: 0 }, { stop_id: 'STOP_RAM', sequence: 1 }, { stop_id: 'STOP_RS', sequence: 2 }]
    },
    {
      bus_id: 'TN-38-N-9012',
      bus_number: '11A',
      route_name: 'Ukkadam → Thudiyalur',
      seating_capacity: 50,
      standing_capacity: 25,
      current_occupancy_seated: 42,
      current_occupancy_standing: 12,
      current_location: { coordinates: [76.9612, 10.9985] },
      status: 'active',
      route_stops: [{ stop_id: 'STOP_LANKA', sequence: 0 }, { stop_id: 'STOP_LAW', sequence: 1 }, { stop_id: 'STOP_GANDHI', sequence: 2 }]
    }
  ]);
});

// ---------------------------------------------------------------------------
// GET /api/buses/stops - list all stops
// ---------------------------------------------------------------------------
router.get('/stops', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      const stops = await Stop.find({}, '-__v').sort({ stop_id: 1 });
      if (stops && stops.length > 0) return res.json(stops);
    }
  } catch (err) {
    console.warn('MongoDB query warning on /buses/stops:', err.message);
  }

  // Fallback stops list
  return res.json([
    { stop_id: 'STOP_OND', name: 'Ondipudur', location: { coordinates: [76.9629, 11.0168] } },
    { stop_id: 'STOP_SING', name: 'Singanallur', location: { coordinates: [76.9856, 11.0012] } },
    { stop_id: 'STOP_RAM', name: 'Ramanathapuram', location: { coordinates: [76.9741, 10.9984] } },
    { stop_id: 'STOP_LANKA', name: 'Lanka Corner', location: { coordinates: [76.9650, 10.9950] } },
    { stop_id: 'STOP_GANDHI', name: 'Gandhipuram', location: { coordinates: [76.9618, 11.0183] } },
    { stop_id: 'STOP_RS', name: 'RS Puram', location: { coordinates: [76.9501, 11.0080] } },
    { stop_id: 'STOP_LAW', name: 'Lawley Road', location: { coordinates: [76.9380, 11.0120] } },
    { stop_id: 'STOP_MAR', name: 'Maruthamalai', location: { coordinates: [76.9012, 11.0421] } }
  ]);
});

// ---------------------------------------------------------------------------
// POST /api/buses/occupancy - Mark bus occupancy (conductor / transit_admin)
// ---------------------------------------------------------------------------
router.post(
  '/occupancy',
  verifyToken,
  verifyRole(['conductor', 'transit_admin']),
  async (req, res) => {
    try {
      const { bus_id, seated_passengers, standing_passengers } = req.body;
      if (!bus_id) return res.status(400).json({ error: 'bus_id is required' });

      const bus = await Bus.findOne({ bus_id });
      if (!bus) return res.status(404).json({ error: 'Bus not found' });

      if (seated_passengers != null) bus.current_occupancy_seated = Number(seated_passengers);
      if (standing_passengers != null) bus.current_occupancy_standing = Number(standing_passengers);
      await bus.save();

      const io = req.app.get('io');
      if (io) {
        io.emit('bus_occupancy_update', {
          bus_id,
          seated_passengers: bus.current_occupancy_seated,
          standing_passengers: bus.current_occupancy_standing,
        });
      }

      res.json({ success: true, bus });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
