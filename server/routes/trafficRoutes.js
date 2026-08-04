const express = require('express');
const router = express.Router();
const Intersection = require('../models/Intersection');
const EmergencyRequest = require('../models/EmergencyRequest');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

// All traffic routes require auth
router.use(verifyToken);

// ---------------------------------------------------------------------------
// GET /api/traffic/intersections - View intersection traffic data
// Allow: ambulance_admin, superadmin
// ---------------------------------------------------------------------------
router.get(
  '/intersections',
  verifyRole(['ambulance_admin', 'superadmin']),
  async (req, res) => {
    try {
      let intersections = await Intersection.find().sort({ name: 1 });
      if (!intersections || intersections.length === 0) {
        intersections = [
          { intersection_id: 'INT-001', name: 'Gandhipuram Junction', location: { type: 'Point', coordinates: [76.9629, 11.0168] }, roads: ['Avinashi Road', 'Cross Cut Road', 'Oppanakara Street'], current_signal_state: 'normal', signal_phases: { north_south_green_sec: 45, east_west_green_sec: 40, yellow_sec: 5, all_red_sec: 3 } },
          { intersection_id: 'INT-002', name: 'Lakshmi Mills Junction', location: { type: 'Point', coordinates: [76.9706, 11.0152] }, roads: ['Avinashi Road', 'Mettupalayam Road'], current_signal_state: 'normal', signal_phases: { north_south_green_sec: 50, east_west_green_sec: 45, yellow_sec: 5, all_red_sec: 3 } },
          { intersection_id: 'INT-003', name: 'Singanallur Junction', location: { type: 'Point', coordinates: [77.0268, 11.0067] }, roads: ['Trichy Road', 'Kamaraj Road'], current_signal_state: 'normal', signal_phases: { north_south_green_sec: 40, east_west_green_sec: 35, yellow_sec: 5, all_red_sec: 3 } },
          { intersection_id: 'INT-004', name: 'Ukkadam Junction', location: { type: 'Point', coordinates: [76.9715, 10.9913] }, roads: ['Trichy Road', 'Sathy Road', 'Palakkad Road'], current_signal_state: 'manual_caution', signal_phases: { north_south_green_sec: 55, east_west_green_sec: 50, yellow_sec: 5, all_red_sec: 3 } },
          { intersection_id: 'INT-005', name: 'Peelamedu Junction', location: { type: 'Point', coordinates: [77.0084, 11.0264] }, roads: ['Avinashi Road', 'ESI Hospital Road'], current_signal_state: 'normal', signal_phases: { north_south_green_sec: 45, east_west_green_sec: 40, yellow_sec: 5, all_red_sec: 3 } },
        ];
      }
      res.json(intersections);
    } catch (err) {
      const mockIntersections = [
        { intersection_id: 'INT-001', name: 'Gandhipuram Junction', location: { type: 'Point', coordinates: [76.9629, 11.0168] }, roads: ['Avinashi Road', 'Cross Cut Road', 'Oppanakara Street'], current_signal_state: 'normal', signal_phases: { north_south_green_sec: 45, east_west_green_sec: 40, yellow_sec: 5, all_red_sec: 3 } },
        { intersection_id: 'INT-002', name: 'Lakshmi Mills Junction', location: { type: 'Point', coordinates: [76.9706, 11.0152] }, roads: ['Avinashi Road', 'Mettupalayam Road'], current_signal_state: 'normal', signal_phases: { north_south_green_sec: 50, east_west_green_sec: 45, yellow_sec: 5, all_red_sec: 3 } },
        { intersection_id: 'INT-003', name: 'Singanallur Junction', location: { type: 'Point', coordinates: [77.0268, 11.0067] }, roads: ['Trichy Road', 'Kamaraj Road'], current_signal_state: 'normal', signal_phases: { north_south_green_sec: 40, east_west_green_sec: 35, yellow_sec: 5, all_red_sec: 3 } },
        { intersection_id: 'INT-004', name: 'Ukkadam Junction', location: { type: 'Point', coordinates: [76.9715, 10.9913] }, roads: ['Trichy Road', 'Sathy Road', 'Palakkad Road'], current_signal_state: 'manual_caution', signal_phases: { north_south_green_sec: 55, east_west_green_sec: 50, yellow_sec: 5, all_red_sec: 3 } },
        { intersection_id: 'INT-005', name: 'Peelamedu Junction', location: { type: 'Point', coordinates: [77.0084, 11.0264] }, roads: ['Avinashi Road', 'ESI Hospital Road'], current_signal_state: 'normal', signal_phases: { north_south_green_sec: 45, east_west_green_sec: 40, yellow_sec: 5, all_red_sec: 3 } },
      ];
      res.json(mockIntersections);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/traffic/intersections/:id - Single intersection detail
// Allow: ambulance_admin, superadmin
// ---------------------------------------------------------------------------
router.get(
  '/intersections/:id',
  verifyRole(['ambulance_admin', 'superadmin']),
  async (req, res) => {
    try {
      const intersection = await Intersection.findOne({ intersection_id: req.params.id });
      if (!intersection) return res.status(404).json({ error: 'Intersection not found' });
      res.json(intersection);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/traffic/signal-override - Manually override signal timing
// Allow: ambulance_admin, superadmin ONLY
// ---------------------------------------------------------------------------
router.post(
  '/signal-override',
  verifyRole(['ambulance_admin', 'superadmin']),
  async (req, res) => {
    try {
      const { intersection_id, signal_state, reason, duration_minutes } = req.body;

      if (!intersection_id || !signal_state) {
        return res.status(400).json({ error: 'intersection_id and signal_state are required' });
      }

      const intersection = await Intersection.findOne({ intersection_id });
      if (!intersection) return res.status(404).json({ error: 'Intersection not found' });

      intersection.current_signal_state = signal_state;
      intersection.manual_override_active = signal_state !== 'normal';
      intersection.override_reason = reason || 'Admin manual override';
      intersection.override_by_admin_id = req.user.id;
      intersection.override_expires_at = duration_minutes
        ? new Date(Date.now() + duration_minutes * 60 * 1000)
        : new Date(Date.now() + 30 * 60 * 1000); // default 30 min

      await intersection.save();

      const io = req.app.get('io');
      if (io) {
        io.emit('signal_override', {
          intersection_id: intersection.intersection_id,
          name: intersection.name,
          signal_state: intersection.current_signal_state,
          override_by: req.user.full_name || req.user.username,
        });
      }

      res.json({ success: true, intersection });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/traffic/signal-reset/:id - Reset signal to normal
// Allow: ambulance_admin, superadmin
// ---------------------------------------------------------------------------
router.post(
  '/signal-reset/:id',
  verifyRole(['ambulance_admin', 'superadmin']),
  async (req, res) => {
    try {
      const intersection = await Intersection.findOne({ intersection_id: req.params.id });
      if (!intersection) return res.status(404).json({ error: 'Intersection not found' });

      intersection.current_signal_state = 'normal';
      intersection.manual_override_active = false;
      intersection.override_reason = null;
      intersection.override_by_admin_id = null;
      intersection.override_expires_at = null;
      intersection.green_corridor_request_id = null;

      await intersection.save();

      const io = req.app.get('io');
      if (io) {
        io.emit('signal_override', {
          intersection_id: intersection.intersection_id,
          name: intersection.name,
          signal_state: 'normal',
        });
      }

      res.json({ success: true, intersection });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/traffic/green-corridors - View active green corridors
// Allow: ambulance_driver, ambulance_admin, superadmin
// ---------------------------------------------------------------------------
router.get(
  '/green-corridors',
  verifyRole(['ambulance_driver', 'ambulance_admin', 'superadmin']),
  async (req, res) => {
    try {
      const activeCorridors = await EmergencyRequest.find({
        green_corridor_active: true,
        status: { $in: ['dispatched', 'on_scene', 'transporting'] },
      }).sort({ createdAt: -1 });

      res.json(activeCorridors);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
