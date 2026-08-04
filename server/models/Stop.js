const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema({
  stop_id: { type: Number, required: true, unique: true },
  stop_name: { type: String, required: true },
  location: {
    type: { type: String, default: 'Point', enum: ['Point'] },
    coordinates: { type: [Number], required: true }, // [longitude, latitude]
  },
});

// 2dsphere index for ultra-fast GeoJSON spatial lookups
stopSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Stop', stopSchema);
