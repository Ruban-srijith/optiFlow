require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Stop = require('./models/Stop');
const Bus = require('./models/Bus');
const Ticket = require('./models/Ticket');
const Conductor = require('./models/Conductor');
const Payment = require('./models/Payment');
const Hospital = require('./models/Hospital');
const Ambulance = require('./models/Ambulance');
const EmergencyRequest = require('./models/EmergencyRequest');

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
// EMERGENCY HOSPITALS & AMBULANCES
// ---------------------------------------------------------------------------
const hospitals = [
  {
    hospital_id: 'HOSP-01',
    name: 'Kovai Medical Center & Hospital (KMCH)',
    address: 'Avinashi Road, Civil Aerodrome Post, Coimbatore',
    contact_phone: '+91 422 4323800',
    location: { type: 'Point', coordinates: [77.0425, 11.0345] },
    icu_beds_available: 18,
    trauma_center_level: 'Level 1 Trauma Center',
    ambulances_stationed: 8,
  },
  {
    hospital_id: 'HOSP-02',
    name: 'PSG Hospitals',
    address: 'Peelamedu, Avinashi Road, Coimbatore',
    contact_phone: '+91 422 2570170',
    location: { type: 'Point', coordinates: [77.0084, 11.0264] },
    icu_beds_available: 14,
    trauma_center_level: 'Level 1 Trauma Center',
    ambulances_stationed: 6,
  },
  {
    hospital_id: 'HOSP-03',
    name: 'Coimbatore Medical College Hospital (CMCH)',
    address: 'Trichy Road, Near Town Hall, Coimbatore',
    contact_phone: '108',
    location: { type: 'Point', coordinates: [76.9653, 11.0046] },
    icu_beds_available: 25,
    trauma_center_level: 'Government Level 1 Emergency',
    ambulances_stationed: 12,
  },
  {
    hospital_id: 'HOSP-04',
    name: 'Ganga Hospital',
    address: '313, Mettupalayam Road, Saibaba Colony, Coimbatore',
    contact_phone: '+91 422 2485000',
    location: { type: 'Point', coordinates: [76.9496, 11.0279] },
    icu_beds_available: 10,
    trauma_center_level: 'Orthopedic & Trauma Care',
    ambulances_stationed: 4,
  },
];

const ambulances = [
  {
    ambulance_id: 'TN-38-AM-1081',
    vehicle_number: '108-EMG-1',
    driver_name: 'Suresh Kumar',
    driver_phone: '+91 98421 12345',
    hospital_name: 'Kovai Medical Center & Hospital (KMCH)',
    type: 'ALS',
    status: 'available',
    current_location: { type: 'Point', coordinates: [77.0425, 11.0345] },
    equipment: ['Defibrillator', 'Ventilator', 'ECG Monitor', 'Oxygen Cylinder'],
    battery_level: 100,
  },
  {
    ambulance_id: 'TN-38-AM-1082',
    vehicle_number: '108-ICU-2',
    driver_name: 'Dinesh Karthik',
    driver_phone: '+91 98422 67890',
    hospital_name: 'Coimbatore Medical College Hospital (CMCH)',
    type: 'ICU',
    status: 'available',
    current_location: { type: 'Point', coordinates: [76.9653, 11.0046] },
    equipment: ['Advanced ICU Setup', 'Infusion Pumps', 'Suction Machine'],
    battery_level: 95,
  },
  {
    ambulance_id: 'TN-38-AM-1083',
    vehicle_number: '108-CARDIAC-3',
    driver_name: 'M. Manikandan',
    driver_phone: '+91 98423 54321',
    hospital_name: 'PSG Hospitals',
    type: 'ALS',
    status: 'available',
    current_location: { type: 'Point', coordinates: [77.0084, 11.0264] },
    equipment: ['Cardiac Monitor', 'Resuscitator', 'Portable Oxygen'],
    battery_level: 92,
  },
];

const initialEmergencyRequests = [
  {
    request_id: 'EMG-884219',
    patient_name: 'Karthik Subramanian',
    contact_phone: '+91 99402 88123',
    emergency_type: 'cardiac',
    priority: 'critical',
    pickup_location: {
      name: 'Gandhipuram Bus Stand, Sector 2',
      coordinates: [76.9629, 11.0168],
    },
    destination_hospital: {
      name: 'Kovai Medical Center & Hospital (KMCH)',
      coordinates: [77.0425, 11.0345],
    },
    status: 'en_route',
    assigned_ambulance_id: 'TN-38-AM-1081',
    green_corridor_active: true,
    eta_minutes: 6,
    notes: 'Severe chest pain, cardiac response team dispatched on Green Corridor',
  },
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
      Hospital.deleteMany(),
      Ambulance.deleteMany(),
      EmergencyRequest.deleteMany(),
    ]);
    console.log('🗑️  Cleared all collections');

    await Stop.insertMany(stops);
    console.log(`✅ Seeded ${stops.length} stops`);

    await Bus.insertMany(buses);
    console.log(`✅ Seeded ${buses.length} buses (routes 1D, 3D, 11A)`);

    await Hospital.insertMany(hospitals);
    console.log(`✅ Seeded ${hospitals.length} emergency hospitals`);

    await Ambulance.insertMany(ambulances);
    console.log(`✅ Seeded ${ambulances.length} ambulances`);

    await EmergencyRequest.insertMany(initialEmergencyRequests);
    console.log(`✅ Seeded ${initialEmergencyRequests.length} emergency requests`);

    // Hash passwords and insert conductors
    const conductors = await Promise.all(
      conductorPlain.map(async ({ password, ...rest }) => ({
        ...rest,
        password_hash: await bcrypt.hash(password, 12),
      }))
    );
    await Conductor.insertMany(conductors);
    console.log(`✅ Seeded ${conductors.length} conductor accounts`);

    console.log('\n🚌 OptiFlow Dual Portal seed complete!\n');
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
