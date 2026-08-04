require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const busRoutes = require('./routes/busRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const authRoutes = require('./routes/authRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const ambulanceRoutes = require('./routes/ambulanceRoutes');
const driverRoutes = require('./routes/driverRoutes');

// ---------------------------------------------------------------------------
// APP SETUP
// ---------------------------------------------------------------------------
const app = express();
const server = http.createServer(app);

// Allow both passenger (5173), conductor (5174), and admin (5175) origins
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  process.env.CONDUCTOR_URL || 'http://localhost:5174',
  process.env.ADMIN_URL || 'http://localhost:5175',
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Inject io into app and routers
app.set('io', io);
ticketRoutes.setIO(io);
paymentRoutes.setIO(io);

// ---------------------------------------------------------------------------
// MIDDLEWARE
// ---------------------------------------------------------------------------
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origin ${origin} not allowed`));
      }
    },
    credentials: true,
  })
);
app.use(express.json());

// ---------------------------------------------------------------------------
// ROUTES
// ---------------------------------------------------------------------------
app.use('/api/buses', busRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ambulances', ambulanceRoutes);
app.use('/api/driver', driverRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'OptiFlow API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    apps: {
      passenger: process.env.CLIENT_URL,
      conductor: process.env.CONDUCTOR_URL,
    },
  });
});

// ---------------------------------------------------------------------------
// SOCKET.IO
// ---------------------------------------------------------------------------
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on('bus_location_update', async ({ bus_id, coordinates }) => {
    try {
      const Bus = require('./models/Bus');
      await Bus.findOneAndUpdate(
        { bus_id },
        { current_location: { type: 'Point', coordinates } }
      );
      io.emit('bus_position', { bus_id, coordinates });
    } catch (err) {
      console.error('Bus location update error:', err.message);
    }
  });

  socket.on('ambulance_location_update', async ({ ambulance_id, coordinates, status }) => {
    try {
      const Ambulance = require('./models/Ambulance');
      const updateData = { current_location: { type: 'Point', coordinates } };
      if (status) updateData.status = status;

      await Ambulance.findOneAndUpdate({ ambulance_id }, updateData);
      io.emit('ambulance_position', { ambulance_id, coordinates, status });
    } catch (err) {
      console.error('Ambulance location update error:', err.message);
    }
  });

  socket.on('green_corridor_toggle', ({ request_id, active }) => {
    io.emit('green_corridor_update', { request_id, active });
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// ---------------------------------------------------------------------------
// SERVER START & MONGODB CONNECTION
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`🚀 OptiFlow API  →  http://localhost:${PORT}`);
  console.log(`🗺️  Passenger App  →  ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
  console.log(`💳 Conductor App  →  ${process.env.CONDUCTOR_URL || 'http://localhost:5174'}`);
  console.log(`🔌 Socket.io ready`);
});

if (process.env.MONGO_URI || true) {
  mongoose
    .connect(process.env.MONGO_URI || 'mongodb://localhost:27017/optiflow')
    .then(() => {
      console.log('✅ MongoDB connected — optiflow');
    })
    .catch((err) => {
      console.warn('⚠️  MongoDB connection notice:', err.message);
      console.warn('💡 OptiFlow API is running with in-memory dev OTP authentication fallback.');
    });
}

module.exports = { io };
