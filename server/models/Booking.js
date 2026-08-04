const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    booking_id: { type: String, required: true, unique: true },
    user_id: { type: String, required: true },
    user_phone: { type: String, default: '' },
    user_name: { type: String, default: 'Passenger' },
    bus_id: { type: String, required: true },
    bus_number: { type: String, default: '' },
    route_name: { type: String, default: '' },
    origin_stop_id: { type: Number, required: true },
    origin_stop_name: { type: String, default: '' },
    destination_stop_id: { type: Number, required: true },
    destination_stop_name: { type: String, default: '' },
    seat_count: { type: Number, default: 1, min: 1, max: 6 },
    fare: { type: Number, default: 5 },
    status: {
      type: String,
      enum: ['booked', 'cancelled', 'completed', 'expired'],
      default: 'booked',
    },
    cancelled_by: { type: String, default: null }, // user_id or admin_id
    cancel_reason: { type: String, default: null },
  },
  { timestamps: true }
);

bookingSchema.index({ user_id: 1, status: 1 });
bookingSchema.index({ bus_id: 1, status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
