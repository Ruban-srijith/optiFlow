const express = require('express');
const router = express.Router();
const Ambulance = require('../models/Ambulance');
const EmergencyRequest = require('../models/EmergencyRequest');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

// Require authentication and driver or admin role
router.use(verifyToken);
router.use(verifyRole(['ambulance_driver', 'ambulance_admin', 'superadmin']));

// ---------------------------------------------------------------------------
// GET /api/driver/my-dispatches - Active emergency call for assigned ambulance
// ---------------------------------------------------------------------------
router.get('/my-dispatches', async (req, res) => {
  try {
    const ambulanceId = req.user.assigned_ambulance_id;
    let query = {};
    if (ambulanceId) {
      query.assigned_ambulance_id = ambulanceId;
    }

    const dispatches = await EmergencyRequest.find(query).sort({ createdAt: -1 }).limit(10);
    const activeDispatch = dispatches.find((d) => ['dispatched', 'on_scene', 'transporting'].includes(d.status)) || null;
    
    let ambulanceInfo = null;
    if (ambulanceId) {
      ambulanceInfo = await Ambulance.findOne({ ambulance_id: ambulanceId });
    }

    res.json({
      active_dispatch: activeDispatch,
      history: dispatches,
      ambulance: ambulanceInfo,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/driver/status - Update driver status and location
// ---------------------------------------------------------------------------
router.patch('/status', async (req, res) => {
  try {
    const { status, latitude, longitude, request_id, green_corridor_active } = req.body;
    const ambulanceId = req.user.assigned_ambulance_id || req.body.ambulance_id;

    if (!ambulanceId) {
      return res.status(400).json({ error: 'Assigned ambulance ID is required' });
    }

    const ambulance = await Ambulance.findOne({ ambulance_id: ambulanceId });
    if (!ambulance) {
      return res.status(404).json({ error: 'Ambulance not found' });
    }

    if (status) ambulance.status = status;
    if (latitude !== undefined && longitude !== undefined) {
      ambulance.current_location = {
        type: 'Point',
        coordinates: [Number(longitude), Number(latitude)],
      };
    }

    await ambulance.save();

    // If linked to emergency request, update request status too
    let updatedRequest = null;
    const reqId = request_id || ambulance.active_request_id;
    if (reqId) {
      updatedRequest = await EmergencyRequest.findOne({ request_id: reqId });
      if (updatedRequest) {
        if (status) {
          if (status === 'en_route') updatedRequest.status = 'dispatched';
          if (status === 'on_scene') updatedRequest.status = 'on_scene';
          if (status === 'transporting') updatedRequest.status = 'transporting';
          if (status === 'available') updatedRequest.status = 'completed';
        }
        if (green_corridor_active !== undefined) {
          updatedRequest.green_corridor_active = green_corridor_active;
        }
        await updatedRequest.save();
      }
    }

    // Broadcast WebSocket updates
    const io = req.app.get('io');
    if (io) {
      io.emit('ambulance_position_update', {
        ambulance_id: ambulance.ambulance_id,
        status: ambulance.status,
        current_location: ambulance.current_location,
      });
      if (updatedRequest) {
        io.emit('emergency_status_update', updatedRequest);
      }
    }

    res.json({
      success: true,
      ambulance,
      emergency_request: updatedRequest,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/driver/green-corridor - Toggle Green Corridor Override
// ---------------------------------------------------------------------------
router.post('/green-corridor', async (req, res) => {
  try {
    const { request_id, active } = req.body;
    const request = await EmergencyRequest.findOne({ request_id });
    if (!request) return res.status(404).json({ error: 'Emergency request not found' });

    request.green_corridor_active = !!active;
    await request.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('emergency_status_update', request);
    }

    res.json({ success: true, green_corridor_active: request.green_corridor_active });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
