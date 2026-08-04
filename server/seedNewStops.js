require('dotenv').config();
const mongoose = require('mongoose');
const Stop = require('./models/Stop');

const newStops = [
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

mongoose
  .connect(process.env.MONGO_URI || 'mongodb://localhost:27017/optiflow')
  .then(async () => {
    console.log('✅ MongoDB connected');

    for (const stop of newStops) {
      await Stop.findOneAndUpdate(
        { stop_id: stop.stop_id },
        { $set: stop },
        { upsert: true, new: true }
      );
    }

    console.log('✅ Inserted', newStops.length, 'new stops for Coimbatore!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Failed to seed stops:', err);
    process.exit(1);
  });
