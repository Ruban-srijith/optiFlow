const mongoose = require('mongoose');

const emergencyRequestSchema = new mongoose.Schema({
  request_id: { type: String, required: true, unique: true },
  patient_name: { type: String, required: true },
  contact_phone: { type: String, required: true },
  emergency_type: {
    type: String,
    enum: ['cardiac', 'trauma', 'stroke', 'organ_transport', 'maternity', 'other'],
    default: 'cardiac',
  },
  priority: {
    type: String,
    enum: ['critical', 'high', 'moderate'],
    default: 'critical',
  },
  pickup_location: {
    name: { type: String, required: true },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },
  destination_hospital: {
    name: { type: String, required: true },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },
  status: {
    type: String,
    enum: ['requested', 'dispatched', 'en_route', 'arrived', 'completed', 'cancelled'],
    default: 'requested',
  },
  assigned_ambulance_id: { type: String, default: null },
  green_corridor_active: { type: Boolean, default: false },
  eta_minutes: { type: Number, default: 8 },
  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('EmergencyRequest', emergencyRequestSchema);
