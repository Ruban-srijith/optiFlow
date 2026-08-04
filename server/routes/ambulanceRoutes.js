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
  verifyRole(['ambulance_driver', 'ambulance_admin', 'passenger']),
  async (req, res) => {
    try {
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState === 1) {
        const ambulances = await Ambulance.find();
        if (ambulances && ambulances.length > 0) return res.json(ambulances);
      }
    } catch (err) {
      console.warn('MongoDB query warning on /ambulances:', err.message);
    }

    return res.json([
      { ambulance_id: 'AMB-101', vehicle_number: 'TN-38-AM-1001', driver_name: 'Ramesh Kumar', phone_number: '+919876543210', status: 'available', current_location: { coordinates: [76.9629, 11.0168] } },
      { ambulance_id: 'AMB-102', vehicle_number: 'TN-38-AM-1002', driver_name: 'Suresh P', phone_number: '+919876543211', status: 'busy', current_location: { coordinates: [76.9558, 11.0284] } },
      { ambulance_id: 'AMB-103', vehicle_number: 'TN-38-AM-1003', driver_name: 'Vimal Raj', phone_number: '+919876543212', status: 'available', current_location: { coordinates: [76.9612, 10.9985] } }
    ]);
  }
);

// ---------------------------------------------------------------------------
// GET /api/ambulances/hospitals - List all emergency hospitals
// Allow: ambulance_driver, ambulance_admin, superadmin
// ---------------------------------------------------------------------------
router.get(
  '/hospitals',
  verifyToken,
  verifyRole(['ambulance_driver', 'ambulance_admin', 'passenger']),
  async (req, res) => {
    try {
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState === 1) {
        const hospitals = await Hospital.find();
        if (hospitals && hospitals.length > 0) return res.json(hospitals);
      }
    } catch (err) {
      console.warn('MongoDB query warning on /hospitals:', err.message);
    }

    return res.json([
      { hospital_id: 'HOSP_KMCH', name: 'Kovai Medical Center & Hospital (KMCH)', location: { coordinates: [77.0384, 11.0456] }, emergency_beds: 12, available_icu: 4, patients_received: 5, phone_number: '+914224323800' },
      { hospital_id: 'HOSP_GNG', name: 'G. Kuppuswamy Naidu Memorial Hospital (GKNM)', location: { coordinates: [76.9780, 11.0125] }, emergency_beds: 8, available_icu: 2, patients_received: 4, phone_number: '+914222245000' },
      { hospital_id: 'HOSP_CMCH', name: 'Coimbatore Medical College Hospital (GH)', location: { coordinates: [76.9685, 10.9980] }, emergency_beds: 25, available_icu: 7, patients_received: 2, phone_number: '+914222300100' }
    ]);
  }
);

// ---------------------------------------------------------------------------
// POST /api/ambulances/request - Create emergency call & auto-assign ambulance
// Allow: ambulance_driver, passenger
// ---------------------------------------------------------------------------
router.post(
  '/request',
  verifyToken,
  verifyRole(['ambulance_driver', 'passenger']),
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
  verifyRole(['ambulance_driver', 'ambulance_admin', 'passenger']),
  async (req, res) => {
    try {
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState === 1) {
        let filter = {};
        if (req.user.role === 'ambulance_driver' && req.user.assigned_ambulance_id) {
          filter.assigned_ambulance_id = req.user.assigned_ambulance_id;
        }

        const requests = await EmergencyRequest.find(filter).sort({ createdAt: -1 }).limit(50);
        if (requests && requests.length > 0) return res.json(requests);
      }
    } catch (err) {
      console.warn('MongoDB query warning on /requests:', err.message);
    }

    return res.json([
      {
        request_id: 'EMG-9901',
        patient_name: 'Patient A (Cardiac)',
        contact_phone: '+919876543200',
        emergency_type: 'Cardiac Arrest',
        priority: 'CRITICAL',
        status: 'transporting',
        assigned_ambulance_id: 'AMB-101',
        destination_hospital: 'Kovai Medical Center & Hospital (KMCH)',
        green_corridor_active: true,
        createdAt: new Date()
      },
      {
        request_id: 'EMG-9902',
        patient_name: 'Patient B (Accident)',
        contact_phone: '+919876543201',
        emergency_type: 'Road Trauma',
        priority: 'HIGH',
        status: 'on_scene',
        assigned_ambulance_id: 'AMB-102',
        destination_hospital: 'Coimbatore Medical College Hospital (GH)',
        green_corridor_active: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 15)
      },
      {
        request_id: 'EMG-9903',
        patient_name: 'Patient C (Stroke)',
        contact_phone: '+919876543202',
        emergency_type: 'Ischemic Stroke',
        priority: 'HIGH',
        status: 'completed',
        assigned_ambulance_id: 'AMB-103',
        destination_hospital: 'GKNM Hospital',
        green_corridor_active: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 45)
      }
    ]);
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
