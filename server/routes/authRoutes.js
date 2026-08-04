require('dotenv').config();
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Conductor = require('../models/Conductor');
const Admin = require('../models/Admin');
const User = require('../models/User');
const { verifyToken } = require('../middleware/authMiddleware');

const JWT_SECRET = process.env.JWT_SECRET || 'optiflow_jwt_secret_dev_key';

// In-memory OTP store fallback for dev mode if DB is connecting
const inMemoryOtpStore = new Map();

// Helper: Normalize phone number
function normalizePhone(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned.startsWith('+')) {
    if (cleaned.length === 10) cleaned = `+91${cleaned}`;
  }
  return cleaned;
}

// ---------------------------------------------------------------------------
// POST /api/auth/send-otp
// ---------------------------------------------------------------------------
router.post('/send-otp', async (req, res) => {
  try {
    const { phone_number, requested_role } = req.body;
    if (!phone_number) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const formattedPhone = normalizePhone(phone_number);
    const otp = '123456';
    const otp_expires_at = new Date(Date.now() + 10 * 60 * 1000);

    // Save to in-memory fallback
    inMemoryOtpStore.set(formattedPhone, {
      otp_code: otp,
      otp_expires_at,
      role: requested_role || 'passenger',
    });

    // Try saving to MongoDB if connected
    if (mongoose.connection.readyState === 1) {
      try {
        let user = await User.findOne({ phone_number: formattedPhone });
        if (!user) {
          let role = requested_role || 'passenger';
          const existingConductor = await Conductor.findOne({ phone_number: formattedPhone });
          if (existingConductor) role = 'conductor';
          const existingAdmin = await Admin.findOne({ phone_number: formattedPhone });
          if (existingAdmin) role = existingAdmin.role || 'superadmin';

          user = new User({
            phone_number: formattedPhone,
            role,
            full_name: existingConductor?.full_name || existingAdmin?.full_name || `User ${formattedPhone.slice(-4)}`,
            assigned_bus_id: existingConductor?.assigned_bus_id || null,
          });
        }
        user.otp_code = otp;
        user.otp_expires_at = otp_expires_at;
        await user.save();
      } catch (dbErr) {
        console.warn('MongoDB OTP save warning:', dbErr.message);
      }
    }

    console.log(`[OTP SENT] Phone: ${formattedPhone} | Code: ${otp}`);

    res.json({
      success: true,
      message: `OTP sent successfully to ${formattedPhone}`,
      dev_otp: otp,
      expires_in_seconds: 600,
    });
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ error: err.message || 'Failed to send OTP' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/verify-otp
// ---------------------------------------------------------------------------
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone_number, otp } = req.body;
    if (!phone_number || !otp) {
      return res.status(400).json({ error: 'Phone number and OTP code are required' });
    }

    const formattedPhone = normalizePhone(phone_number);
    let userPayload = null;

    // Check MongoDB first if connected
    if (mongoose.connection.readyState === 1) {
      try {
        const user = await User.findOne({ phone_number: formattedPhone });
        if (user && user.otp_code === otp) {
          user.otp_code = null;
          user.otp_expires_at = null;
          await user.save();
          userPayload = {
            id: user._id,
            phone_number: user.phone_number,
            full_name: user.full_name,
            role: user.role,
            assigned_bus_id: user.assigned_bus_id,
            assigned_ambulance_id: user.assigned_ambulance_id,
          };
        }
      } catch (dbErr) {
        console.warn('DB verify warning:', dbErr.message);
      }
    }

    // Fallback to in-memory store if DB payload wasn't constructed
    if (!userPayload) {
      const memData = inMemoryOtpStore.get(formattedPhone);
      if (memData && memData.otp_code === otp) {
        userPayload = {
          id: `mem-${Date.now()}`,
          phone_number: formattedPhone,
          full_name: `User ${formattedPhone.slice(-4)}`,
          role: memData.role || 'passenger',
        };
      }
    }

    if (!userPayload && otp === '123456') {
      // Dev mode universal fallback for test numbers
      userPayload = {
        id: `dev-${Date.now()}`,
        phone_number: formattedPhone,
        full_name: `Dev User (${formattedPhone.slice(-4)})`,
        role: formattedPhone === '+919876543210' ? 'superadmin' :
              formattedPhone === '+919876543211' ? 'transit_admin' :
              formattedPhone === '+919876543212' ? 'ambulance_admin' :
              formattedPhone === '+919876543213' ? 'conductor' :
              formattedPhone === '+919876543214' ? 'ambulance_driver' : 'passenger',
      };
    }

    if (!userPayload) {
      return res.status(401).json({ error: 'Invalid OTP code. Please enter 123456 for demo.' });
    }

    const token = jwt.sign(userPayload, JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    });

    res.json({
      success: true,
      token,
      user: userPayload,
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: err.message || 'Failed to verify OTP' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/login (Legacy Conductor Login)
// ---------------------------------------------------------------------------
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const conductor = await Conductor.findOne({ username: username.toLowerCase(), is_active: true });
    if (!conductor) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await conductor.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const payload = {
      id: conductor._id,
      username: conductor.username,
      full_name: conductor.full_name,
      employee_id: conductor.employee_id,
      assigned_bus_id: conductor.assigned_bus_id,
      role: 'conductor',
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    });

    res.json({
      success: true,
      token,
      conductor: payload,
      user: payload,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------------------
router.get('/me', verifyToken, async (req, res) => {
  try {
    if (req.user?.phone_number && mongoose.connection.readyState === 1) {
      const user = await User.findById(req.user.id, '-otp_code');
      if (user) return res.json(user);
    }
    return res.json(req.user);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------
router.post('/logout', verifyToken, (req, res) => {
  res.json({ success: true, message: 'Logged out successfully.' });
});

module.exports = router;
