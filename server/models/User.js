const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    phone_number: { type: String, required: true, unique: true, trim: true },
    full_name: { type: String, default: 'OptiFlow User' },
    role: {
      type: String,
      enum: ['superadmin', 'transit_admin', 'ambulance_admin', 'conductor', 'ambulance_driver', 'passenger'],
      default: 'passenger',
    },
    email: { type: String, lowercase: true, trim: true },
    is_active: { type: Boolean, default: true },
    otp_code: { type: String, default: null },
    otp_expires_at: { type: Date, default: null },
    assigned_bus_id: { type: String, default: null },       // For conductor
    assigned_ambulance_id: { type: String, default: null }, // For ambulance driver
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
