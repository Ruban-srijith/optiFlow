const express = require('express');
const router = express.Router();
const Ambulance = require('../models/Ambulance');
const EmergencyRequest = require('../models/EmergencyRequest');
const Hospital = require('../models/Hospital');

// ---------------------------------------------------------------------------
// GET /api/ambulances - List all ambulances
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const ambulances = await Ambulance.find();
    res.json(ambulances);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/hospitals - List all emergency hospitals
// ---------------------------------------------------------------------------
router.get('/hospitals', async (req, res) => {
  try {
    const hospitals = await Hospital.find();
    res.json(hospitals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/emergency/request - Create emergency call & auto-assign ambulance
// ---------------------------------------------------------------------------
router.post('/request', async (req, res) => {
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

    // Broadcast over socket via req.app.get('io') if initialized
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
});

// ---------------------------------------------------------------------------
// GET /api/emergency/requests - List emergency requests
// ---------------------------------------------------------------------------
router.get('/requests', async (req, res) => {
  try {
    const requests = await EmergencyRequest.find().sort({ createdAt: -1 }).limit(50);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/emergency/request/:id/status - Update status or toggle Green Corridor
// ---------------------------------------------------------------------------
router.patch('/request/:id/status', async (req, res) => {
  try {
    const { status, green_corridor_active } = req.body;
    const request = await EmergencyRequest.findOne({ request_id: req.params.id });

    if (!request) {
      return res.status(404).json({ error: 'Emergency request not found' });
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
});

module.exports = router;
