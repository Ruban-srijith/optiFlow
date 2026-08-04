const fs = require('fs');

const seedPath = 'g:/optiFlow/server/seed.js';
let content = fs.readFileSync(seedPath, 'utf8');

const extraAmbulances = `
  { ambulance_id: 'TN-38-AM-1087', vehicle_number: '108-ALS-7', driver_name: 'G. Suresh', driver_phone: '+91 98426 11111', hospital_name: 'Ganga Hospital', type: 'ALS', status: 'available', current_location: { type: 'Point', coordinates: [76.9600, 11.0100] }, equipment: ['Trauma Kit'], battery_level: 100 },
  { ambulance_id: 'TN-38-AM-1088', vehicle_number: '108-BLS-8', driver_name: 'K. Ramesh', driver_phone: '+91 98426 22222', hospital_name: 'PSG Hospitals', type: 'BLS', status: 'available', current_location: { type: 'Point', coordinates: [76.9800, 11.0200] }, equipment: ['First Aid'], battery_level: 95 },
  { ambulance_id: 'TN-38-AM-1089', vehicle_number: '108-ICU-9', driver_name: 'T. Kumar', driver_phone: '+91 98426 33333', hospital_name: 'KMCH', type: 'ICU', status: 'available', current_location: { type: 'Point', coordinates: [77.0300, 11.0400] }, equipment: ['Ventilator'], battery_level: 80 },
  { ambulance_id: 'TN-38-AM-1090', vehicle_number: '108-NEO-10', driver_name: 'M. Siva', driver_phone: '+91 98426 44444', hospital_name: 'CMCH', type: 'Neo-Natal', status: 'available', current_location: { type: 'Point', coordinates: [76.9500, 11.0000] }, equipment: ['Incubator'], battery_level: 90 },
  { ambulance_id: 'TN-38-AM-1091', vehicle_number: '108-ALS-11', driver_name: 'S. Rajan', driver_phone: '+91 98426 55555', hospital_name: 'Ganga Hospital', type: 'ALS', status: 'available', current_location: { type: 'Point', coordinates: [76.9450, 11.0250] }, equipment: ['Spine Board'], battery_level: 85 },
  { ambulance_id: 'TN-38-AM-1092', vehicle_number: '108-BLS-12', driver_name: 'P. Mani', driver_phone: '+91 98426 66666', hospital_name: 'PSG Hospitals', type: 'BLS', status: 'available', current_location: { type: 'Point', coordinates: [77.0100, 11.0300] }, equipment: ['Stretcher'], battery_level: 100 },
  { ambulance_id: 'TN-38-AM-1093', vehicle_number: '108-ICU-13', driver_name: 'A. Vijay', driver_phone: '+91 98426 77777', hospital_name: 'KMCH', type: 'ICU', status: 'available', current_location: { type: 'Point', coordinates: [77.0400, 11.0350] }, equipment: ['ECG'], battery_level: 70 },
  { ambulance_id: 'TN-38-AM-1094', vehicle_number: '108-ALS-14', driver_name: 'R. Karthi', driver_phone: '+91 98426 88888', hospital_name: 'CMCH', type: 'ALS', status: 'available', current_location: { type: 'Point', coordinates: [76.9650, 11.0050] }, equipment: ['Oxygen'], battery_level: 60 },
  { ambulance_id: 'TN-38-AM-1095', vehicle_number: '108-BLS-15', driver_name: 'V. Anand', driver_phone: '+91 98426 99999', hospital_name: 'Ganga Hospital', type: 'BLS', status: 'available', current_location: { type: 'Point', coordinates: [76.9500, 11.0300] }, equipment: ['First Aid'], battery_level: 100 },
  { ambulance_id: 'TN-38-AM-1096', vehicle_number: '108-ICU-16', driver_name: 'N. Babu', driver_phone: '+91 98426 00000', hospital_name: 'PSG Hospitals', type: 'ICU', status: 'available', current_location: { type: 'Point', coordinates: [77.0000, 11.0250] }, equipment: ['Defibrillator'], battery_level: 80 }
];`;

const extraBuses = `
  { bus_id: 'TN-38-N-1111', bus_number: '2A', route_name: 'Coimbatore → Vadavalli', seating_capacity: 40, standing_capacity: 20, current_location: { type: 'Point', coordinates: [76.9642, 11.0006] }, current_stop_sequence: 0, route_stops: [{ stop_id: 301, sequence: 0 }, { stop_id: 105, sequence: 1 }, { stop_id: 106, sequence: 2 }, { stop_id: 107, sequence: 3 }] },
  { bus_id: 'TN-38-N-2222', bus_number: '2B', route_name: 'Vadavalli → Coimbatore', seating_capacity: 40, standing_capacity: 20, current_location: { type: 'Point', coordinates: [76.9268, 11.0173] }, current_stop_sequence: 0, route_stops: [{ stop_id: 107, sequence: 0 }, { stop_id: 106, sequence: 1 }, { stop_id: 105, sequence: 2 }, { stop_id: 301, sequence: 3 }] },
  { bus_id: 'TN-38-N-3333', bus_number: '101A', route_name: 'Ukkadam → Singanallur', seating_capacity: 40, standing_capacity: 20, current_location: { type: 'Point', coordinates: [76.9715, 10.9913] }, current_stop_sequence: 0, route_stops: [{ stop_id: 204, sequence: 0 }, { stop_id: 203, sequence: 1 }, { stop_id: 103, sequence: 2 }, { stop_id: 102, sequence: 3 }] },
  { bus_id: 'TN-38-N-4444', bus_number: '101B', route_name: 'Singanallur → Ukkadam', seating_capacity: 40, standing_capacity: 20, current_location: { type: 'Point', coordinates: [77.0268, 11.0067] }, current_stop_sequence: 0, route_stops: [{ stop_id: 102, sequence: 0 }, { stop_id: 103, sequence: 1 }, { stop_id: 203, sequence: 2 }, { stop_id: 204, sequence: 3 }] },
  { bus_id: 'TN-38-N-5555', bus_number: '5C', route_name: 'Gandhipuram → Kovaipudur', seating_capacity: 40, standing_capacity: 20, current_location: { type: 'Point', coordinates: [76.9629, 11.0168] }, current_stop_sequence: 0, route_stops: [{ stop_id: 105, sequence: 0 }, { stop_id: 203, sequence: 1 }, { stop_id: 204, sequence: 2 }, { stop_id: 205, sequence: 3 }] },
  { bus_id: 'TN-38-N-6666', bus_number: '5D', route_name: 'Kovaipudur → Gandhipuram', seating_capacity: 40, standing_capacity: 20, current_location: { type: 'Point', coordinates: [76.9453, 10.9744] }, current_stop_sequence: 0, route_stops: [{ stop_id: 205, sequence: 0 }, { stop_id: 204, sequence: 1 }, { stop_id: 203, sequence: 2 }, { stop_id: 105, sequence: 3 }] },
  { bus_id: 'TN-38-N-7777', bus_number: '7A', route_name: 'Thudiyalur → Town Hall', seating_capacity: 40, standing_capacity: 20, current_location: { type: 'Point', coordinates: [76.9481, 11.0624] }, current_stop_sequence: 0, route_stops: [{ stop_id: 303, sequence: 0 }, { stop_id: 302, sequence: 1 }, { stop_id: 105, sequence: 2 }, { stop_id: 203, sequence: 3 }] },
  { bus_id: 'TN-38-N-8888', bus_number: '7B', route_name: 'Town Hall → Thudiyalur', seating_capacity: 40, standing_capacity: 20, current_location: { type: 'Point', coordinates: [76.9653, 11.0046] }, current_stop_sequence: 0, route_stops: [{ stop_id: 203, sequence: 0 }, { stop_id: 105, sequence: 1 }, { stop_id: 302, sequence: 2 }, { stop_id: 303, sequence: 3 }] },
  { bus_id: 'TN-38-N-9999', bus_number: '99A', route_name: 'Gandhipuram → Airport', seating_capacity: 40, standing_capacity: 20, current_location: { type: 'Point', coordinates: [76.9629, 11.0168] }, current_stop_sequence: 0, route_stops: [{ stop_id: 105, sequence: 0 }, { stop_id: 104, sequence: 1 }, { stop_id: 401, sequence: 2 }, { stop_id: 403, sequence: 3 }] },
  { bus_id: 'TN-38-N-0000', bus_number: '99B', route_name: 'Airport → Gandhipuram', seating_capacity: 40, standing_capacity: 20, current_location: { type: 'Point', coordinates: [77.0425, 11.0345] }, current_stop_sequence: 0, route_stops: [{ stop_id: 403, sequence: 0 }, { stop_id: 401, sequence: 1 }, { stop_id: 104, sequence: 2 }, { stop_id: 105, sequence: 3 }] }
];`;

const codeToInsert = `
ambulances.push(...${extraAmbulances});
buses.push(...${extraBuses});
`;

// Insert the arrays right before async function seedDB()
content = content.replace('async function seedDB() {', codeToInsert + '\nasync function seedDB() {');

fs.writeFileSync(seedPath, content);
console.log("Safely injected extra buses and ambulances into seed.js");
