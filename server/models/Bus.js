const mongoose = require('mongoose');

const busSchema = new mongoose.Schema({
  bus_id: { type: String, required: true, unique: true },      // "TN-38-N-1234"
  bus_number: { type: String, required: true },                 // "1D", "3D", "11A"
  route_name: { type: String, required: true },
  seating_capacity: { type: Number, default: 40 },
  standing_capacity: { type: Number, default: 20 },
  route_stops: [
    {
      stop_id: { type: Number, required: true },
      sequence: { type: Number, required: true },
    },
  ],
  // Live position updated via WebSocket
  current_location: {
    type: { type: String, default: 'Point', enum: ['Point'] },
    coordinates: { type: [Number], default: [76.9629, 11.0168] }, // [lng, lat]
  },
  current_stop_sequence: { type: Number, default: 0 },
});

busSchema.index({ current_location: '2dsphere' });

module.exports = mongoose.model('Bus', busSchema);
