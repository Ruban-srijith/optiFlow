const mongoose = require('mongoose');

const ambulanceSchema = new mongoose.Schema({
  ambulance_id: { type: String, required: true, unique: true }, // "TN-38-AM-1081"
  vehicle_number: { type: String, required: true },              // "AM-1081"
  driver_name: { type: String, default: 'Emergency Driver' },
  driver_phone: { type: String, default: '108' },
  hospital_name: { type: String, default: 'Coimbatore Medical College Hospital' },
  type: { type: String, enum: ['ALS', 'BLS', 'ICU', 'Neo-Natal'], default: 'ALS' },
  status: {
    type: String,
    enum: ['available', 'en_route', 'on_scene', 'transporting', 'maintenance', 'offline'],
    default: 'available',
  },
  current_location: {
    type: { type: String, default: 'Point', enum: ['Point'] },
    coordinates: { type: [Number], default: [76.9629, 11.0168] }, // [lng, lat]
  },
  equipment: [{ type: String }],
  battery_level: { type: Number, default: 98 },
  active_request_id: { type: String, default: null },
});

ambulanceSchema.index({ current_location: '2dsphere' });

module.exports = mongoose.model('Ambulance', ambulanceSchema);
