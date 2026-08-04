require('dotenv').config();
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Conductor = require('../models/Conductor');
const { verifyToken } = require('../middleware/authMiddleware');

// ---------------------------------------------------------------------------
// POST /api/auth/login
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
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    });

    res.json({
      success: true,
      token,
      conductor: payload,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/auth/me — verify token + return current conductor info
// ---------------------------------------------------------------------------
router.get('/me', verifyToken, async (req, res) => {
  try {
    const conductor = await Conductor.findById(req.conductor.id, '-password_hash -__v');
    if (!conductor) return res.status(404).json({ error: 'Conductor not found' });
    res.json(conductor);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout — client-side only; just acknowledge
// ---------------------------------------------------------------------------
router.post('/logout', verifyToken, (req, res) => {
  res.json({ success: true, message: 'Logged out. Please discard your token.' });
});

module.exports = router;
