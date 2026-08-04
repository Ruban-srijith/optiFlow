require('dotenv').config();
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { v4: uuidv4 } = require('uuid');
const Payment = require('../models/Payment');
const Ticket = require('../models/Ticket');
const Bus = require('../models/Bus');

const {
  RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET,
  PASSENGER_APP_URL,
} = process.env;

// Initialize Razorpay SDK instance (if key credentials are set)
let razorpayInstance = null;
if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET && !RAZORPAY_KEY_ID.includes('YourKeyId')) {
  razorpayInstance = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });
}

// TNSTC Fare calculation
function calculateFare(stopCount) {
  return Math.max(5, stopCount * 2);
}

// Shared io - injected from server.js
let io;
router.setIO = (ioInstance) => { io = ioInstance; };

// ---------------------------------------------------------------------------
// POST /api/payments/create-order
// Creates a Razorpay Order and saves pending payment record in DB.
// Body: { bus_id, origin_stop_id, destination_stop_id, passenger_count, mobile_number }
// ---------------------------------------------------------------------------
router.post('/create-order', async (req, res) => {
  try {
    const {
      bus_id,
      origin_stop_id,
      destination_stop_id,
      passenger_count = 1,
      mobile_number,
    } = req.body;

    if (!bus_id || !origin_stop_id || !destination_stop_id) {
      return res.status(400).json({ error: 'bus_id, origin_stop_id, destination_stop_id are required' });
    }

    // Validate bus + compute fare
    const bus = await Bus.findOne({ bus_id });
    if (!bus) return res.status(404).json({ error: `Bus not found: ${bus_id}` });

    const originEntry = bus.route_stops.find((rs) => rs.stop_id === Number(origin_stop_id));
    const destEntry = bus.route_stops.find((rs) => rs.stop_id === Number(destination_stop_id));
    if (!originEntry || !destEntry || originEntry.sequence >= destEntry.sequence) {
      return res.status(400).json({ error: 'Invalid origin/destination for this route' });
    }

    const stopCount = destEntry.sequence - originEntry.sequence;
    const fareINR = calculateFare(stopCount) * Number(passenger_count);
    const amountPaise = fareINR * 100; // Razorpay uses paise

    const merchantTransactionId = `OPF-${uuidv4().replace(/-/g, '').slice(0, 20).toUpperCase()}`;

    let razorpayOrderId = null;

    if (razorpayInstance) {
      try {
        const order = await razorpayInstance.orders.create({
          amount: amountPaise,
          currency: 'INR',
          receipt: merchantTransactionId,
          notes: {
            bus_id,
            passenger_count: String(passenger_count),
          },
        });
        razorpayOrderId = order.id;
      } catch (rzpErr) {
        console.warn('⚠️ Razorpay order creation failed, generating mock order ID:', rzpErr.message);
        razorpayOrderId = `order_mock_${uuidv4().slice(0, 14)}`;
      }
    } else {
      razorpayOrderId = `order_mock_${uuidv4().slice(0, 14)}`;
    }

    // Save pending payment record
    const payment = new Payment({
      merchant_transaction_id: merchantTransactionId,
      bus_id,
      origin_stop_id: Number(origin_stop_id),
      destination_stop_id: Number(destination_stop_id),
      passenger_count: Number(passenger_count),
      amount_paise: amountPaise,
      amount_inr: fareINR,
      mobile_number,
      razorpay_order_id: razorpayOrderId,
      payment_status: 'PENDING',
    });
    await payment.save();

    res.json({
      success: true,
      key_id: RAZORPAY_KEY_ID || 'rzp_test_mockKey',
      order_id: razorpayOrderId,
      merchant_transaction_id: merchantTransactionId,
      amount_inr: fareINR,
      amount_paise: amountPaise,
      currency: 'INR',
    });
  } catch (err) {
    console.error('Payment order creation error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Backward compatibility alias for /initiate
router.post('/initiate', async (req, res) => {
  req.url = '/create-order';
  return router.handle(req, res);
});

// ---------------------------------------------------------------------------
// POST /api/payments/verify
// Verifies Razorpay payment signature & issues ticket upon verification
// Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, merchant_transaction_id }
// ---------------------------------------------------------------------------
router.post('/verify', async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      merchant_transaction_id,
    } = req.body;

    const payment = await Payment.findOne({
      $or: [
        { razorpay_order_id },
        { merchant_transaction_id },
      ],
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment record not found' });
    }

    let isValid = false;

    // Verify signature using HMAC SHA256
    if (RAZORPAY_KEY_SECRET && razorpay_order_id && razorpay_payment_id && razorpay_signature) {
      const generatedSignature = crypto
        .createHmac('sha256', RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      isValid = generatedSignature === razorpay_signature;
    } else if (razorpay_order_id?.startsWith('order_mock_') || !RAZORPAY_KEY_SECRET) {
      // Mock mode fallback for development
      isValid = true;
    }

    if (!isValid) {
      payment.payment_status = 'FAILED';
      await payment.save();
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    payment.payment_status = 'SUCCESS';
    payment.razorpay_payment_id = razorpay_payment_id || `pay_mock_${uuidv4().slice(0, 14)}`;
    payment.razorpay_signature = razorpay_signature || 'mock_signature';

    // Auto-issue ticket on successful payment verification
    const ticket = new Ticket({
      ticket_id: uuidv4(),
      bus_id: payment.bus_id,
      origin_stop_id: payment.origin_stop_id,
      destination_stop_id: payment.destination_stop_id,
      passenger_count: payment.passenger_count,
      fare_paid: payment.amount_inr,
      payment_mode: 'online',
      issued_at: new Date(),
    });
    await ticket.save();

    payment.ticket_id = ticket.ticket_id;
    await payment.save();

    // Emit socket update to update conductor/passenger screens in real-time
    if (io) {
      io.emit('bus_updated', {
        bus_id: payment.bus_id,
        ticket_id: ticket.ticket_id,
        payment_method: 'online_razorpay',
      });
    }

    res.json({
      success: true,
      message: 'Payment verified successfully',
      ticket_id: ticket.ticket_id,
      payment,
    });
  } catch (err) {
    console.error('Payment verification error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/payments/status/:txnId
// Check payment status by transaction ID or Order ID
// ---------------------------------------------------------------------------
router.get('/status/:txnId', async (req, res) => {
  try {
    const { txnId } = req.params;

    const payment = await Payment.findOne({
      $or: [
        { merchant_transaction_id: txnId },
        { razorpay_order_id: txnId },
      ],
    });

    if (!payment) return res.status(404).json({ error: 'Transaction not found' });

    res.json({
      merchant_transaction_id: payment.merchant_transaction_id,
      razorpay_order_id: payment.razorpay_order_id,
      status: payment.payment_status,
      amount_inr: payment.amount_inr,
      ticket_id: payment.ticket_id,
      bus_id: payment.bus_id,
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/payments - recent payments list
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 }).limit(50);
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

