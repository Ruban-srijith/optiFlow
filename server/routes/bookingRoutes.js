const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Bus = require('../models/Bus');
const { verifyToken, verifyRole, ownerOrAdmin } = require('../middleware/authMiddleware');

// All booking routes require authentication
router.use(verifyToken);

// ---------------------------------------------------------------------------
// POST /api/bookings - Book a seat (Commuter only)
// ---------------------------------------------------------------------------
router.post(
  '/',
  verifyRole(['passenger']),
  async (req, res) => {
    try {
      const {
        bus_id,
        origin_stop_id,
        origin_stop_name,
        destination_stop_id,
        destination_stop_name,
        seat_count,
      } = req.body;

      if (!bus_id || origin_stop_id == null || destination_stop_id == null) {
        return res.status(400).json({ error: 'bus_id, origin_stop_id, and destination_stop_id are required' });
      }

      // Lookup bus for route info
      const bus = await Bus.findOne({ bus_id });
      if (!bus) {
        return res.status(404).json({ error: 'Bus not found' });
      }

      // Calculate fare: ₹2 per stop, minimum ₹5
      const stopCount = Math.abs(destination_stop_id - origin_stop_id);
      const fare = Math.max(5, stopCount * 2) * (seat_count || 1);

      const booking = new Booking({
        booking_id: `BKG-${Date.now().toString().slice(-8)}`,
        user_id: req.user.id,
        user_phone: req.user.phone_number || '',
        user_name: req.user.full_name || 'Passenger',
        bus_id,
        bus_number: bus.bus_number || bus.bus_id,
        route_name: bus.route_name || '',
        origin_stop_id,
        origin_stop_name: origin_stop_name || '',
        destination_stop_id,
        destination_stop_name: destination_stop_name || '',
        seat_count: seat_count || 1,
        fare,
        status: 'booked',
      });

      await booking.save();

      const io = req.app.get('io');
      if (io) {
        io.emit('booking_created', { booking_id: booking.booking_id, bus_id, seat_count: booking.seat_count });
      }

      res.status(201).json(booking);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/bookings/mine - View own bookings (Commuter)
// ---------------------------------------------------------------------------
router.get('/mine', async (req, res) => {
  try {
    const bookings = await Booking.find({ user_id: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/bookings - View all bookings (Admin: transit_admin, superadmin)
// ---------------------------------------------------------------------------
router.get(
  '/',
  verifyRole(['transit_admin', 'superadmin']),
  async (req, res) => {
    try {
      const { status, bus_id, page = 1, limit = 50 } = req.query;
      const filter = {};
      if (status) filter.status = status;
      if (bus_id) filter.bus_id = bus_id;

      const bookings = await Booking.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));

      const total = await Booking.countDocuments(filter);

      res.json({ bookings, total, page: Number(page), limit: Number(limit) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// PATCH /api/bookings/:id - Modify booking (own or admin)
// ---------------------------------------------------------------------------
router.patch(
  '/:id',
  ownerOrAdmin(
    async (req) => {
      const booking = await Booking.findOne({ booking_id: req.params.id });
      return booking?.user_id;
    },
    ['transit_admin', 'superadmin']
  ),
  async (req, res) => {
    try {
      const booking = await Booking.findOne({ booking_id: req.params.id });
      if (!booking) return res.status(404).json({ error: 'Booking not found' });

      const { seat_count, status } = req.body;
      if (seat_count) booking.seat_count = seat_count;
      if (status) booking.status = status;

      await booking.save();
      res.json(booking);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// DELETE /api/bookings/:id - Cancel booking (own or admin)
// ---------------------------------------------------------------------------
router.delete(
  '/:id',
  ownerOrAdmin(
    async (req) => {
      const booking = await Booking.findOne({ booking_id: req.params.id });
      return booking?.user_id;
    },
    ['transit_admin', 'superadmin']
  ),
  async (req, res) => {
    try {
      const booking = await Booking.findOne({ booking_id: req.params.id });
      if (!booking) return res.status(404).json({ error: 'Booking not found' });

      booking.status = 'cancelled';
      booking.cancelled_by = req.user.id;
      booking.cancel_reason = req.body.reason || 'User cancelled';
      await booking.save();

      const io = req.app.get('io');
      if (io) {
        io.emit('booking_cancelled', { booking_id: booking.booking_id, bus_id: booking.bus_id });
      }

      res.json({ success: true, booking });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
