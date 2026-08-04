const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  ticket_id: { type: String, required: true, unique: true },
  bus_id: { type: String, required: true },
  origin_stop_id: { type: Number, required: true },
  destination_stop_id: { type: Number, required: true },
  passenger_count: { type: Number, required: true, default: 1 },
  fare_paid: { type: Number, required: true },
  payment_mode: { type: String, enum: ['cash', 'online'], default: 'cash' },
  issued_at: { type: Date, default: Date.now, index: true },
});

// Index for fast active-ticket queries (by bus and issued time)
ticketSchema.index({ bus_id: 1, issued_at: -1 });

module.exports = mongoose.model('Ticket', ticketSchema);
