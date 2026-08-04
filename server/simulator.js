/**
 * OptiFlow — Pine Labs POS Fleet Simulator
 * Simulates 3 buses (1D, 3D, 11A) traveling Coimbatore routes.
 *
 * Run: node simulator.js
 *
 * Actions per bus:
 *  1. Emit ticket purchase to POST /api/tickets/issue at each stop
 *  2. Send live GPS update via WebSocket (bus_location_update event)
 *  3. Advance to next stop after delay
 */

require('dotenv').config();
const axios = require('axios');
const { io: socketIOClient } = require('socket.io-client');

const API_BASE = `http://localhost:${process.env.PORT || 5000}/api`;
const WS_URL = `http://localhost:${process.env.PORT || 5000}`;

// ---------------------------------------------------------------------------
// ROUTE STOP COORDINATES (mirrors seed.js)
// ---------------------------------------------------------------------------
const STOP_COORDS = {
  101: [77.0326, 11.0012],  // Ondipudur
  102: [77.0268, 11.0067],  // Singanallur
  103: [76.9958, 11.0157],  // Ramanathapuram
  104: [76.9706, 11.0152],  // Lakshmi Mills
  105: [76.9629, 11.0168],  // Gandhipuram
  106: [76.9564, 11.0202],  // Lawley Road
  107: [76.9268, 11.0173],  // Vadavalli
  108: [76.9091, 11.0453],  // Maruthamalai
  201: [76.9977, 11.0385],  // Ganapathy
  202: [76.9817, 11.0317],  // Sivananda Colony
  203: [76.9653, 11.0046],  // Town Hall
  204: [76.9715, 10.9913],  // Ukkadam
  205: [76.9453, 10.9744],  // Kovaipudur
  301: [76.9642, 11.0006],  // Railway Station
  302: [76.9496, 11.0279],  // Saibaba Colony
  303: [76.9481, 11.0624],  // Thudiyalur
};

const BUSES = [
  {
    bus_id: 'TN-38-N-1234',
    bus_number: '1D',
    stops: [101, 102, 103, 104, 105, 106, 107, 108],
  },
  {
    bus_id: 'TN-38-N-5678',
    bus_number: '3D',
    stops: [201, 202, 105, 203, 204, 205],
  },
  {
    bus_id: 'TN-38-N-9012',
    bus_number: '11A',
    stops: [204, 203, 301, 105, 302, 303],
  },
];

// Simulate 1-6 passengers boarding per stop
function randomPassengers() {
  return Math.floor(Math.random() * 6) + 1;
}

// Interpolate GPS coordinates between two stops (5 steps)
function interpolateCoords(from, to, steps = 5) {
  const result = [];
  for (let i = 1; i <= steps; i++) {
    result.push([
      from[0] + ((to[0] - from[0]) * i) / steps,
      from[1] + ((to[1] - from[1]) * i) / steps,
    ]);
  }
  return result;
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// SINGLE BUS SIMULATION LOOP
// ---------------------------------------------------------------------------
async function simulateBus(bus, socket) {
  console.log(`\n🚌 Starting simulator for Bus ${bus.bus_number} (${bus.bus_id})`);
  let currentIndex = 0;

  while (true) {
    const currentStopId = bus.stops[currentIndex];
    const nextIndex = (currentIndex + 1) % bus.stops.length;
    const nextStopId = bus.stops[nextIndex];

    const currentCoords = STOP_COORDS[currentStopId];
    const nextCoords = STOP_COORDS[nextStopId];

    console.log(`  [${bus.bus_number}] At stop ${currentStopId} → next: ${nextStopId}`);

    // Issue tickets at this stop
    const passengers = randomPassengers();
    try {
      const response = await axios.post(`${API_BASE}/tickets/issue`, {
        bus_id: bus.bus_id,
        origin_stop_id: currentStopId,
        destination_stop_id: nextStopId,
        passenger_count: passengers,
        timestamp: new Date().toISOString(),
      });
      console.log(
        `  [${bus.bus_number}] 🎫 Issued ticket: ${passengers} pax | Free seats: ${response.data.free_seats}`
      );
    } catch (err) {
      console.warn(`  [${bus.bus_number}] ⚠️  Ticket issue failed: ${err.message}`);
    }

    // Animate GPS movement between stops (5 interpolated positions)
    const path = interpolateCoords(currentCoords, nextCoords, 5);
    for (const coords of path) {
      socket.emit('bus_location_update', {
        bus_id: bus.bus_id,
        coordinates: coords, // [lng, lat]
      });
      await sleep(2000); // 2s between GPS pings
    }

    // Advance to next stop
    currentIndex = nextIndex;

    // Wait at stop before continuing
    await sleep(5000); // 5s dwell time at each stop
  }
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------
async function main() {
  console.log('🚦 OptiFlow Fleet Simulator starting...');
  console.log(`   API: ${API_BASE}`);
  console.log(`   WS:  ${WS_URL}`);

  // Wait for server to be ready
  await sleep(2000);

  const socket = socketIOClient(WS_URL, { transports: ['websocket'] });

  socket.on('connect', () => {
    console.log(`✅ Simulator connected to WebSocket server (${socket.id})\n`);
    // Start all 3 buses in parallel
    for (const bus of BUSES) {
      simulateBus(bus, socket).catch((err) =>
        console.error(`Bus ${bus.bus_number} simulation error:`, err.message)
      );
    }
  });

  socket.on('connect_error', (err) => {
    console.error('❌ WebSocket connection failed:', err.message);
    console.error('   Make sure the server is running: npm run dev (in /server)');
  });
}

main();
