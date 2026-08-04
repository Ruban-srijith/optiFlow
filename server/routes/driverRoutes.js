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
// Allow: ambulance_driver (own), ambulance_admin (all), superadmin
// ---------------------------------------------------------------------------
router.get('/my-dispatches', async (req, res) => {
  try {
    const ambulanceId = req.user.assigned_ambulance_id;
    let query = {};

    // Ambulance driver only sees own dispatches
    if (req.user.role === 'ambulance_driver' && ambulanceId) {
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
// Allow: ambulance_driver only (own ambulance)
// ---------------------------------------------------------------------------
router.patch('/status', verifyRole(['ambulance_driver']), async (req, res) => {
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
// POST /api/driver/green-corridor - Toggle Green Corridor
// Allow: ambulance_driver (auto-trigger), ambulance_admin (override)
// ---------------------------------------------------------------------------
router.post('/green-corridor', async (req, res) => {
  try {
    const { request_id, active } = req.body;
    const request = await EmergencyRequest.findOne({ request_id });
    if (!request) return res.status(404).json({ error: 'Emergency request not found' });

    // Ambulance driver can only toggle for own assigned requests
    if (
      req.user.role === 'ambulance_driver' &&
      req.user.assigned_ambulance_id &&
      request.assigned_ambulance_id !== req.user.assigned_ambulance_id
    ) {
      return res.status(403).json({ error: 'You can only toggle green corridor for your own emergency requests.' });
    }

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

// ---------------------------------------------------------------------------
// GET /api/driver/turn-by-turn - Get emergency turn-by-turn route
// Allow: ambulance_driver only
// ---------------------------------------------------------------------------
router.get('/turn-by-turn', verifyRole(['ambulance_driver']), async (req, res) => {
  try {
    const { pickup_lat, pickup_lng, dest_lat, dest_lng } = req.query;

    if (!pickup_lat || !pickup_lng || !dest_lat || !dest_lng) {
      return res.status(400).json({ error: 'pickup_lat, pickup_lng, dest_lat, dest_lng are required' });
    }

    // Call OSRM API for real routing steps
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${pickup_lng},${pickup_lat};${dest_lng},${dest_lat}?overview=false&steps=true`;
    
    const response = await fetch(osrmUrl);
    const data = await response.json();
    
    let steps = [];
    let total_distance = '0 km';
    let total_duration = '0 min';
    
    if (data.routes && data.routes.length > 0) {
      const leg = data.routes[0].legs[0];
      
      total_distance = (leg.distance / 1000).toFixed(1) + ' km';
      total_duration = Math.ceil(leg.duration / 60) + ' min';
      
      steps = leg.steps.map(step => {
        const maneuver = step.maneuver;
        let instruction = maneuver.type;
        if (maneuver.modifier) instruction += ' ' + maneuver.modifier;
        if (step.name) instruction += ' onto ' + step.name;
        
        // Capitalize first letter
        instruction = instruction.charAt(0).toUpperCase() + instruction.slice(1);
        
        let distStr = step.distance > 1000 
          ? (step.distance / 1000).toFixed(1) + ' km'
          : Math.round(step.distance) + ' m';
          
        let durStr = Math.ceil(step.duration / 60) + ' min';
        
        return {
          instruction,
          distance: distStr,
          duration: durStr
        };
      });
    }

    const route = {
      origin: { lat: Number(pickup_lat), lng: Number(pickup_lng) },
      destination: { lat: Number(dest_lat), lng: Number(dest_lng) },
      steps,
      total_distance,
      total_duration,
      green_corridor_active: true,
    };

    res.json(route);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
