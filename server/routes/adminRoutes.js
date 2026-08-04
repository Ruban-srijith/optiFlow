const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const Conductor = require('../models/Conductor');
const Bus = require('../models/Bus');
const Stop = require('../models/Stop');
const Ticket = require('../models/Ticket');

// ─── Middleware: verify admin JWT ───────────────────────────────────────────
function verifyAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    if (decoded.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
    req.admin = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ─── POST /api/admin/login ──────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const admin = await Admin.findOne({ username: username.toLowerCase(), is_active: true });
    if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await admin.comparePassword(password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: admin._id, username: admin.username, full_name: admin.full_name, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ success: true, token, admin: { username: admin.username, full_name: admin.full_name, role: admin.role } });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/admin/me ──────────────────────────────────────────────────────
router.get('/me', verifyAdmin, async (req, res) => {
  const admin = await Admin.findById(req.admin.id, '-password_hash -__v');
  if (!admin) return res.status(404).json({ error: 'Not found' });
  res.json(admin);
});

// ════════════════════════════════════════════════════════════════════════════
// STOPS
// ════════════════════════════════════════════════════════════════════════════
router.get('/stops', verifyAdmin, async (req, res) => {
  const stops = await Stop.find().sort({ stop_id: 1 });
  res.json(stops);
});

// ════════════════════════════════════════════════════════════════════════════
// ROUTES (Buses)
// ════════════════════════════════════════════════════════════════════════════
router.get('/buses', verifyAdmin, async (req, res) => {
  const buses = await Bus.find().sort({ bus_number: 1 });
  res.json(buses);
});

router.post('/buses', verifyAdmin, async (req, res) => {
  try {
    const { bus_id, bus_number, route_name, seating_capacity, standing_capacity, route_stops } = req.body;
    if (!bus_id || !bus_number || !route_name || !route_stops?.length) {
      return res.status(400).json({ error: 'bus_id, bus_number, route_name and route_stops are required' });
    }
    const existing = await Bus.findOne({ bus_id });
    if (existing) return res.status(409).json({ error: 'Bus with this ID already exists' });

    // Determine initial location from first stop
    const firstStop = await Stop.findOne({ stop_id: route_stops[0].stop_id });
    const initCoords = firstStop?.location?.coordinates || [76.9629, 11.0168];

    const bus = await Bus.create({
      bus_id, bus_number, route_name,
      seating_capacity: seating_capacity || 40,
      standing_capacity: standing_capacity || 20,
      route_stops,
      current_location: { type: 'Point', coordinates: initCoords },
      current_stop_sequence: 0,
    });
    res.status(201).json(bus);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/buses/:bus_id', verifyAdmin, async (req, res) => {
  try {
    const bus = await Bus.findOneAndUpdate(
      { bus_id: req.params.bus_id },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!bus) return res.status(404).json({ error: 'Bus not found' });
    res.json(bus);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/buses/:bus_id', verifyAdmin, async (req, res) => {
  try {
    const bus = await Bus.findOneAndDelete({ bus_id: req.params.bus_id });
    if (!bus) return res.status(404).json({ error: 'Bus not found' });
    // Unassign any conductors on this bus
    await Conductor.updateMany({ assigned_bus_id: req.params.bus_id }, { $set: { assigned_bus_id: null } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// CONDUCTORS
// ════════════════════════════════════════════════════════════════════════════
router.get('/conductors', verifyAdmin, async (req, res) => {
  const conductors = await Conductor.find({}, '-password_hash -__v').sort({ createdAt: -1 });
  res.json(conductors);
});

router.post('/conductors', verifyAdmin, async (req, res) => {
  try {
    const { username, password, full_name, employee_id, assigned_bus_id } = req.body;
    if (!username || !password || !full_name || !employee_id) {
      return res.status(400).json({ error: 'username, password, full_name and employee_id are required' });
    }
    const existing = await Conductor.findOne({ $or: [{ username }, { employee_id }] });
    if (existing) return res.status(409).json({ error: 'Username or Employee ID already exists' });

    const password_hash = await bcrypt.hash(password, 12);
    const conductor = await Conductor.create({ username: username.toLowerCase(), password_hash, full_name, employee_id, assigned_bus_id: assigned_bus_id || null });
    const { password_hash: _, ...safe } = conductor.toObject();
    res.status(201).json(safe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/conductors/:id', verifyAdmin, async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.password) {
      updates.password_hash = await bcrypt.hash(updates.password, 12);
      delete updates.password;
    }
    delete updates.password_hash; // don't allow direct hash overwrite
    if (updates.username) updates.username = updates.username.toLowerCase();

    const conductor = await Conductor.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true, select: '-password_hash -__v' });
    if (!conductor) return res.status(404).json({ error: 'Conductor not found' });
    res.json(conductor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/conductors/:id', verifyAdmin, async (req, res) => {
  try {
    const conductor = await Conductor.findByIdAndUpdate(req.params.id, { is_active: false }, { new: true, select: '-password_hash' });
    if (!conductor) return res.status(404).json({ error: 'Conductor not found' });
    res.json({ success: true, conductor });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// REVENUE STATS
// ════════════════════════════════════════════════════════════════════════════
router.get('/stats/revenue', verifyAdmin, async (req, res) => {
  try {
    const { from, to } = req.query;
    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));

    const match = Object.keys(dateFilter).length ? { issued_at: dateFilter } : {};

    const pipeline = [
      { $match: match },
      // Treat missing/null payment_mode as 'cash' (backward-compat for old tickets)
      { $addFields: { payment_mode: { $ifNull: ['$payment_mode', 'cash'] } } },
      {
        $group: {
          _id: { bus_id: '$bus_id', mode: '$payment_mode' },
          total: { $sum: '$fare_paid' },
          tickets: { $sum: 1 },
          passengers: { $sum: '$passenger_count' },
        },
      },
      {
        $group: {
          _id: '$_id.bus_id',
          breakdown: {
            $push: { mode: '$_id.mode', total: '$total', tickets: '$tickets', passengers: '$passengers' },
          },
          grand_total: { $sum: '$total' },
          total_tickets: { $sum: '$tickets' },
          total_passengers: { $sum: '$passengers' },
        },
      },
      { $sort: { grand_total: -1 } },
    ];

    const results = await Ticket.aggregate(pipeline);

    // Enrich with bus info
    const buses = await Bus.find({}, 'bus_id bus_number route_name');
    const busMap = Object.fromEntries(buses.map((b) => [b.bus_id, b]));

    const enriched = results.map((r) => ({
      bus_id: r._id,
      bus_number: busMap[r._id]?.bus_number || r._id,
      route_name: busMap[r._id]?.route_name || '—',
      grand_total: r.grand_total,
      total_tickets: r.total_tickets,
      total_passengers: r.total_passengers,
      cash: r.breakdown.find((b) => b.mode === 'cash') || { total: 0, tickets: 0, passengers: 0 },
      online: r.breakdown.find((b) => b.mode === 'online') || { total: 0, tickets: 0, passengers: 0 },
    }));

    // Overall totals
    const overall = enriched.reduce(
      (acc, r) => ({
        grand_total: acc.grand_total + r.grand_total,
        cash_total: acc.cash_total + (r.cash?.total || 0),
        online_total: acc.online_total + (r.online?.total || 0),
        total_tickets: acc.total_tickets + r.total_tickets,
      }),
      { grand_total: 0, cash_total: 0, online_total: 0, total_tickets: 0 }
    );

    res.json({ overall, routes: enriched });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
