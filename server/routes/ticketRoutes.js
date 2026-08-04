require('dotenv').config();
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Ticket = require('../models/Ticket');
const Bus = require('../models/Bus');
const Stop = require('../models/Stop');

// TNSTC Fare Formula
function calculateFare(stopCount) {
  return Math.max(5, stopCount * 2);
}

// Shared io instance - injected from server.js
let io;
router.setIO = (ioInstance) => {
  io = ioInstance;
};

// ---------------------------------------------------------------------------
// POST /api/tickets/issue
// Pine Labs POS terminal webhook
// ---------------------------------------------------------------------------
router.post('/issue', async (req, res) => {
  try {
    const { bus_id, origin_stop_id, destination_stop_id, passenger_count = 1, payment_mode = 'cash', timestamp } = req.body;

    if (!bus_id || !origin_stop_id || !destination_stop_id) {
      return res.status(400).json({ error: 'bus_id, origin_stop_id, destination_stop_id are required' });
    }

    // Verify bus exists
    const bus = await Bus.findOne({ bus_id });
    if (!bus) return res.status(404).json({ error: `Bus not found: ${bus_id}` });

    // Compute stop sequences for fare
    const originEntry = bus.route_stops.find((rs) => rs.stop_id === Number(origin_stop_id));
    const destEntry = bus.route_stops.find((rs) => rs.stop_id === Number(destination_stop_id));

    if (!originEntry || !destEntry || originEntry.sequence >= destEntry.sequence) {
      return res.status(400).json({ error: 'Invalid origin/destination for this bus route' });
    }

    const stopCount = destEntry.sequence - originEntry.sequence;
    const fare_paid = calculateFare(stopCount) * passenger_count;

    const ticket = new Ticket({
      ticket_id: uuidv4(),
      bus_id,
      origin_stop_id: Number(origin_stop_id),
      destination_stop_id: Number(destination_stop_id),
      passenger_count: Number(passenger_count),
      fare_paid,
      payment_mode: ['cash', 'online'].includes(payment_mode) ? payment_mode : 'cash',
      issued_at: timestamp ? new Date(timestamp) : new Date(),
    });

    await ticket.save();

    // Compute updated occupancy for currently active passengers on the bus
    const allTickets = await Ticket.find({ bus_id });
    let currentPassengers = 0;
    for (const t of allTickets) {
      const to = bus.route_stops.find((rs) => rs.stop_id === t.origin_stop_id);
      const td = bus.route_stops.find((rs) => rs.stop_id === t.destination_stop_id);
      // A ticket is currently active on the bus if the bus has reached or passed origin, and has not yet completed destination
      if (to && td) {
        if (bus.current_stop_sequence >= to.sequence && bus.current_stop_sequence < td.sequence) {
          currentPassengers += t.passenger_count;
        } else if (bus.current_stop_sequence < to.sequence) {
          // If bus is currently at/before origin when ticket is issued, include the newly issued passengers
          currentPassengers += t.passenger_count;
        }
      }
    }

    const freeSeats = Math.max(0, bus.seating_capacity - currentPassengers);

    // Emit real-time update via WebSocket
    if (io) {
      io.emit('bus_updated', {
        bus_id,
        bus_number: bus.bus_number,
        current_passengers: currentPassengers,
        free_seats: freeSeats,
        standing_passengers: Math.max(0, currentPassengers - bus.seating_capacity),
        current_location: bus.current_location.coordinates,
        ticket_id: ticket.ticket_id,
      });
    }

    res.status(201).json({
      success: true,
      ticket_id: ticket.ticket_id,
      fare_paid,
      free_seats: freeSeats,
      current_passengers: currentPassengers,
    });
  } catch (err) {
    console.error('Ticket issue error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/tickets - list recent tickets
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const tickets = await Ticket.find().sort({ issued_at: -1 }).limit(50);
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
