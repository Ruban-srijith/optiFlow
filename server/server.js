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

// ---------------------------------------------------------------------------
// APP SETUP
// ---------------------------------------------------------------------------
const app = express();
const server = http.createServer(app);

// Allow both passenger (5173) and conductor (5174) origins
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

// Inject io into routers
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
      console.error('Location update error:', err.message);
    }
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// ---------------------------------------------------------------------------
// MONGODB + SERVER START
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected — optiflow');
    server.listen(PORT, () => {
      console.log(`🚀 OptiFlow API  →  http://localhost:${PORT}`);
      console.log(`🗺️  Passenger App  →  ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
      console.log(`💳 Conductor App  →  ${process.env.CONDUCTOR_URL || 'http://localhost:5174'}`);
      console.log(`🔌 Socket.io ready`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

module.exports = { io };
