const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    merchant_transaction_id: { type: String, required: true, unique: true },
    bus_id: { type: String, required: true },
    origin_stop_id: { type: Number, required: true },
    destination_stop_id: { type: Number, required: true },
    passenger_count: { type: Number, required: true, default: 1 },
    amount_paise: { type: Number, required: true }, // in paise (1 INR = 100 paise)
    amount_inr: { type: Number, required: true },
    mobile_number: { type: String },
    payment_status: {
      type: String,
      enum: ['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED'],
      default: 'PENDING',
    },
    razorpay_order_id: { type: String, default: null },
    razorpay_payment_id: { type: String, default: null },
    razorpay_signature: { type: String, default: null },
    razorpay_response: { type: mongoose.Schema.Types.Mixed, default: null },
    ticket_id: { type: String, default: null }, // linked ticket after success
    redirect_url: { type: String },
  },
  { timestamps: true }
);

paymentSchema.index({ payment_status: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
