const express = require('express');
const router = express.Router();
const Ambulance = require('../models/Ambulance');
const EmergencyRequest = require('../models/EmergencyRequest');
const Hospital = require('../models/Hospital');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

// ---------------------------------------------------------------------------
// GET /api/ambulances - List all ambulances
// Allow: ambulance_driver, ambulance_admin, superadmin
// ---------------------------------------------------------------------------
router.get(
  '/',
  verifyToken,
  verifyRole(['ambulance_driver', 'ambulance_admin']),
  async (req, res) => {
    try {
      const ambulances = await Ambulance.find();
      res.json(ambulances);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/ambulances/hospitals - List all emergency hospitals
// Allow: ambulance_driver, ambulance_admin, superadmin
// ---------------------------------------------------------------------------
router.get(
  '/hospitals',
  verifyToken,
  verifyRole(['ambulance_driver', 'ambulance_admin']),
  async (req, res) => {
    try {
      const hospitals = await Hospital.find();
      res.json(hospitals);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/ambulances/request - Create emergency call & auto-assign ambulance
// Allow: ambulance_driver only
// ---------------------------------------------------------------------------
router.post(
  '/request',
  verifyToken,
  verifyRole(['ambulance_driver']),
  async (req, res) => {
    try {
      const {
        patient_name,
        contact_phone,
        emergency_type,
        priority,
        pickup_location,
        destination_hospital,
        notes,
      } = req.body;

      if (!patient_name || !contact_phone || !pickup_location || !destination_hospital) {
        return res.status(400).json({ error: 'Missing required emergency details' });
      }

      const requestId = `EMG-${Date.now().toString().slice(-6)}`;

      // Try to find an available ambulance
      const availableAmbulance = await Ambulance.findOne({ status: 'available' });

      let assignedAmbulanceId = null;
      let newStatus = 'requested';

      if (availableAmbulance) {
        assignedAmbulanceId = availableAmbulance.ambulance_id;
        availableAmbulance.status = 'en_route';
        availableAmbulance.active_request_id = requestId;
        await availableAmbulance.save();
        newStatus = 'dispatched';
      }

      const emergencyRequest = new EmergencyRequest({
        request_id: requestId,
        patient_name,
        contact_phone,
        emergency_type: emergency_type || 'cardiac',
        priority: priority || 'critical',
        pickup_location,
        destination_hospital,
        status: newStatus,
        assigned_ambulance_id: assignedAmbulanceId,
        green_corridor_active: priority === 'critical',
        eta_minutes: Math.floor(Math.random() * 5) + 5,
        notes: notes || '',
      });

      await emergencyRequest.save();

      // Broadcast over socket
      const io = req.app.get('io');
      if (io) {
        io.emit('emergency_alert', emergencyRequest);
        if (availableAmbulance) {
          io.emit('ambulance_position_update', {
            ambulance_id: availableAmbulance.ambulance_id,
            status: availableAmbulance.status,
            current_location: availableAmbulance.current_location,
          });
        }
      }

      res.status(201).json(emergencyRequest);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/ambulances/requests - List emergency requests
// ambulance_driver: own requests; ambulance_admin/superadmin: all
// ---------------------------------------------------------------------------
router.get(
  '/requests',
  verifyToken,
  verifyRole(['ambulance_driver', 'ambulance_admin']),
  async (req, res) => {
    try {
      let filter = {};
      // Ambulance driver only sees requests assigned to their ambulance
      if (req.user.role === 'ambulance_driver' && req.user.assigned_ambulance_id) {
        filter.assigned_ambulance_id = req.user.assigned_ambulance_id;
      }

      const requests = await EmergencyRequest.find(filter).sort({ createdAt: -1 }).limit(50);
      res.json(requests);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// PATCH /api/ambulances/request/:id/status - Update status or toggle Green Corridor
// Allow: ambulance_driver (own), ambulance_admin (override), superadmin
// ---------------------------------------------------------------------------
router.patch(
  '/request/:id/status',
  verifyToken,
  verifyRole(['ambulance_driver', 'ambulance_admin']),
  async (req, res) => {
    try {
      const { status, green_corridor_active } = req.body;
      const request = await EmergencyRequest.findOne({ request_id: req.params.id });

      if (!request) {
        return res.status(404).json({ error: 'Emergency request not found' });
      }

      // Ambulance driver can only update their own assigned requests
      if (
        req.user.role === 'ambulance_driver' &&
        req.user.assigned_ambulance_id &&
        request.assigned_ambulance_id !== req.user.assigned_ambulance_id
      ) {
        return res.status(403).json({ error: 'You can only update your own assigned emergency requests.' });
      }

      if (status !== undefined) request.status = status;
      if (green_corridor_active !== undefined) request.green_corridor_active = green_corridor_active;

      await request.save();

      // If request completed or cancelled, release assigned ambulance
      if (['completed', 'cancelled'].includes(status) && request.assigned_ambulance_id) {
        await Ambulance.findOneAndUpdate(
          { ambulance_id: request.assigned_ambulance_id },
          { status: 'available', active_request_id: null }
        );
      }

      const io = req.app.get('io');
      if (io) {
        io.emit('emergency_status_update', request);
      }

      res.json(request);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/ambulances/register - Self-register as verified ambulance
// Allow: ambulance_driver only
// ---------------------------------------------------------------------------
router.post(
  '/register',
  verifyToken,
  verifyRole(['ambulance_driver']),
  async (req, res) => {
    try {
      const { vehicle_number, vehicle_type, hospital_name } = req.body;

      if (!vehicle_number) {
        return res.status(400).json({ error: 'Vehicle number is required' });
      }

      // Check if already registered
      const existing = await Ambulance.findOne({ vehicle_number: vehicle_number.toUpperCase() });
      if (existing) {
        return res.status(409).json({ error: 'This vehicle is already registered', ambulance: existing });
      }

      const ambulanceId = `AMB-${Date.now().toString().slice(-6)}`;

      const ambulance = new Ambulance({
        ambulance_id: ambulanceId,
        vehicle_number: vehicle_number.toUpperCase(),
        vehicle_type: vehicle_type || 'ALS',
        hospital_name: hospital_name || '',
        status: 'available',
        driver_id: req.user.id,
        driver_name: req.user.full_name || '',
        current_location: {
          type: 'Point',
          coordinates: [76.9558, 11.0168], // Default: Coimbatore center
        },
      });

      await ambulance.save();

      // Update user's assigned_ambulance_id
      const User = require('../models/User');
      await User.findByIdAndUpdate(req.user.id, { assigned_ambulance_id: ambulanceId });

      res.status(201).json({ success: true, ambulance });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
