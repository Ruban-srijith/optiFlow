require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Stop = require('./models/Stop');
const Bus = require('./models/Bus');
const Ticket = require('./models/Ticket');
const Conductor = require('./models/Conductor');
const Payment = require('./models/Payment');

// ---------------------------------------------------------------------------
// STOP DATA
// ---------------------------------------------------------------------------
const stops = [
  { stop_id: 105, stop_name: 'Gandhipuram',      location: { type: 'Point', coordinates: [76.9629, 11.0168] } },
  { stop_id: 203, stop_name: 'Town Hall',         location: { type: 'Point', coordinates: [76.9653, 11.0046] } },
  { stop_id: 204, stop_name: 'Ukkadam',           location: { type: 'Point', coordinates: [76.9715, 10.9913] } },
  { stop_id: 101, stop_name: 'Ondipudur',         location: { type: 'Point', coordinates: [77.0326, 11.0012] } },
  { stop_id: 102, stop_name: 'Singanallur',       location: { type: 'Point', coordinates: [77.0268, 11.0067] } },
  { stop_id: 103, stop_name: 'Ramanathapuram',    location: { type: 'Point', coordinates: [76.9958, 11.0157] } },
  { stop_id: 104, stop_name: 'Lakshmi Mills',     location: { type: 'Point', coordinates: [76.9706, 11.0152] } },
  { stop_id: 106, stop_name: 'Lawley Road',       location: { type: 'Point', coordinates: [76.9564, 11.0202] } },
  { stop_id: 107, stop_name: 'Vadavalli',         location: { type: 'Point', coordinates: [76.9268, 11.0173] } },
  { stop_id: 108, stop_name: 'Maruthamalai',      location: { type: 'Point', coordinates: [76.9091, 11.0453] } },
  { stop_id: 201, stop_name: 'Ganapathy',         location: { type: 'Point', coordinates: [76.9977, 11.0385] } },
  { stop_id: 202, stop_name: 'Sivananda Colony',  location: { type: 'Point', coordinates: [76.9817, 11.0317] } },
  { stop_id: 205, stop_name: 'Kovaipudur',        location: { type: 'Point', coordinates: [76.9453, 10.9744] } },
  { stop_id: 301, stop_name: 'Railway Station',   location: { type: 'Point', coordinates: [76.9642, 11.0006] } },
  { stop_id: 302, stop_name: 'Saibaba Colony',    location: { type: 'Point', coordinates: [76.9496, 11.0279] } },
  { stop_id: 303, stop_name: 'Thudiyalur',        location: { type: 'Point', coordinates: [76.9481, 11.0624] } },
  { stop_id: 401, stop_name: 'Peelamedu', location: { type: 'Point', coordinates: [77.0084, 11.0264] } },
  { stop_id: 402, stop_name: 'Hopes College', location: { type: 'Point', coordinates: [77.0185, 11.0242] } },
  { stop_id: 403, stop_name: 'Aerodrome (SITRA)', location: { type: 'Point', coordinates: [77.0425, 11.0345] } },
  { stop_id: 404, stop_name: 'Sulur', location: { type: 'Point', coordinates: [77.1264, 11.0267] } },
  { stop_id: 405, stop_name: 'Saravanampatti', location: { type: 'Point', coordinates: [76.9897, 11.0772] } },
  { stop_id: 406, stop_name: 'Kovilpalayam', location: { type: 'Point', coordinates: [77.0125, 11.1613] } },
  { stop_id: 407, stop_name: 'Kavundampalayam', location: { type: 'Point', coordinates: [76.9416, 11.0494] } },
  { stop_id: 408, stop_name: 'Thondamuthur', location: { type: 'Point', coordinates: [76.8407, 10.9997] } },
  { stop_id: 409, stop_name: 'Perur', location: { type: 'Point', coordinates: [76.9080, 10.9701] } },
  { stop_id: 410, stop_name: 'Kuniamuthur', location: { type: 'Point', coordinates: [76.9587, 10.9576] } },
  { stop_id: 411, stop_name: 'Sundarapuram', location: { type: 'Point', coordinates: [76.9748, 10.9388] } },
  { stop_id: 412, stop_name: 'Eachanari', location: { type: 'Point', coordinates: [76.9830, 10.9089] } },
  { stop_id: 413, stop_name: 'Kinathukadavu', location: { type: 'Point', coordinates: [77.0191, 10.8202] } },
  { stop_id: 414, stop_name: 'Pollachi', location: { type: 'Point', coordinates: [77.0068, 10.6623] } },
  { stop_id: 415, stop_name: 'R.S. Puram', location: { type: 'Point', coordinates: [76.9450, 11.0097] } },
  { stop_id: 416, stop_name: 'Puliakulam', location: { type: 'Point', coordinates: [76.9877, 11.0006] } },
  { stop_id: 417, stop_name: 'Sungam', location: { type: 'Point', coordinates: [76.9806, 10.9959] } },
  { stop_id: 418, stop_name: 'Podanur', location: { type: 'Point', coordinates: [76.9829, 10.9631] } },
  { stop_id: 419, stop_name: 'Vellalore', location: { type: 'Point', coordinates: [77.0095, 10.9566] } },
  { stop_id: 420, stop_name: 'Tidel Park', location: { type: 'Point', coordinates: [77.0229, 11.0267] } },
];

// ---------------------------------------------------------------------------
// BUS DATA
// ---------------------------------------------------------------------------
const buses = [
  {
    bus_id: 'TN-38-N-1234', bus_number: '1D',
    route_name: 'Ondipudur → Maruthamalai',
    seating_capacity: 40, standing_capacity: 20,
    current_location: { type: 'Point', coordinates: [77.0326, 11.0012] },
    current_stop_sequence: 0,
    route_stops: [
      { stop_id: 101, sequence: 0 }, { stop_id: 102, sequence: 1 },
      { stop_id: 103, sequence: 2 }, { stop_id: 104, sequence: 3 },
      { stop_id: 105, sequence: 4 }, { stop_id: 106, sequence: 5 },
      { stop_id: 107, sequence: 6 }, { stop_id: 108, sequence: 7 },
    ],
  },
  {
    bus_id: 'TN-38-N-5678', bus_number: '3D',
    route_name: 'Ganapathy → Kovaipudur',
    seating_capacity: 40, standing_capacity: 20,
    current_location: { type: 'Point', coordinates: [76.9977, 11.0385] },
    current_stop_sequence: 0,
    route_stops: [
      { stop_id: 201, sequence: 0 }, { stop_id: 202, sequence: 1 },
      { stop_id: 105, sequence: 2 }, { stop_id: 203, sequence: 3 },
      { stop_id: 204, sequence: 4 }, { stop_id: 205, sequence: 5 },
    ],
  },
  {
    bus_id: 'TN-38-N-9012', bus_number: '11A',
    route_name: 'Ukkadam → Thudiyalur',
    seating_capacity: 40, standing_capacity: 20,
    current_location: { type: 'Point', coordinates: [76.9715, 10.9913] },
    current_stop_sequence: 0,
    route_stops: [
      { stop_id: 204, sequence: 0 }, { stop_id: 203, sequence: 1 },
      { stop_id: 301, sequence: 2 }, { stop_id: 105, sequence: 3 },
      { stop_id: 302, sequence: 4 }, { stop_id: 303, sequence: 5 },
    ],
  },
];

// ---------------------------------------------------------------------------
// CONDUCTOR ACCOUNTS (plain passwords → hashed on seed)
// ---------------------------------------------------------------------------
const conductorPlain = [
  {
    username: 'conductor1',
    password: 'conductor123',
    full_name: 'Rajan K.',
    employee_id: 'EMP-1001',
    assigned_bus_id: 'TN-38-N-1234', // Route 1D
  },
  {
    username: 'conductor2',
    password: 'conductor456',
    full_name: 'Priya S.',
    employee_id: 'EMP-1002',
    assigned_bus_id: 'TN-38-N-5678', // Route 3D
  },
  {
    username: 'conductor3',
    password: 'conductor789',
    full_name: 'Murugan R.',
    employee_id: 'EMP-1003',
    assigned_bus_id: 'TN-38-N-9012', // Route 11A
  },
];

// ---------------------------------------------------------------------------
// SEED FUNCTION
// ---------------------------------------------------------------------------
async function seed() {
  try {
    console.log('🌱 Connecting to MongoDB (optiflow)...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    await Promise.all([
      Stop.deleteMany(),
      Bus.deleteMany(),
      Ticket.deleteMany(),
      Conductor.deleteMany(),
      Payment.deleteMany(),
    ]);
    console.log('🗑️  Cleared all collections');

    await Stop.insertMany(stops);
    console.log(`✅ Seeded ${stops.length} stops`);

    await Bus.insertMany(buses);
    console.log(`✅ Seeded ${buses.length} buses (routes 1D, 3D, 11A)`);

    // Hash passwords and insert conductors
    const conductors = await Promise.all(
      conductorPlain.map(async ({ password, ...rest }) => ({
        ...rest,
        password_hash: await bcrypt.hash(password, 12),
      }))
    );
    await Conductor.insertMany(conductors);
    console.log(`✅ Seeded ${conductors.length} conductor accounts`);

    console.log('\n🚌 OptiFlow seed complete!\n');
    console.log('Conductor Logins:');
    conductorPlain.forEach((c) =>
      console.log(`  ${c.username} / ${c.password}  →  ${c.full_name} (${c.assigned_bus_id})`)
    );
    console.log('');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
}

seed();
