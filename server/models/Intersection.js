const mongoose = require('mongoose');

const intersectionSchema = new mongoose.Schema(
  {
    intersection_id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    location: {
      type: { type: String, default: 'Point', enum: ['Point'] },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    roads: [{ type: String }], // e.g. ["Avinashi Road", "Sathy Road"]
    current_signal_state: {
      type: String,
      enum: ['normal', 'green_corridor_override', 'manual_override', 'emergency_flash'],
      default: 'normal',
    },
    signal_phases: {
      north_south_green_sec: { type: Number, default: 45 },
      east_west_green_sec: { type: Number, default: 45 },
      yellow_sec: { type: Number, default: 5 },
      all_red_sec: { type: Number, default: 3 },
    },
    manual_override_active: { type: Boolean, default: false },
    override_reason: { type: String, default: null },
    override_by_admin_id: { type: String, default: null },
    override_expires_at: { type: Date, default: null },
    green_corridor_request_id: { type: String, default: null },
  },
  { timestamps: true }
);

intersectionSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Intersection', intersectionSchema);
