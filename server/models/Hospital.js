const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
  hospital_id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  address: { type: String, required: true },
  contact_phone: { type: String, required: true },
  location: {
    type: { type: String, default: 'Point', enum: ['Point'] },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },
  icu_beds_available: { type: Number, default: 12 },
  trauma_center_level: { type: String, default: 'Level 1' },
  ambulances_stationed: { type: Number, default: 5 },
});

hospitalSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Hospital', hospitalSchema);
