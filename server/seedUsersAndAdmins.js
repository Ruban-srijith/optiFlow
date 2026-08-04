require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const Conductor = require('./models/Conductor');
const User = require('./models/User');
const Ambulance = require('./models/Ambulance');

async function seedUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/optiflow');
    console.log('✅ Connected to MongoDB for seeding Users & Admins');

    // 1. Seed Super Admin
    let superAdmin = await Admin.findOne({ username: 'superadmin' });
    if (!superAdmin) {
      const hash = await Admin.hashPassword('admin123');
      superAdmin = await Admin.create({
        username: 'superadmin',
        password_hash: hash,
        full_name: 'Chief Systems Administrator',
        role: 'superadmin',
        phone_number: '+919876543210',
      });
      console.log('👤 Created Super Admin account');
    }

    // 2. Seed Transit Admin
    let transitAdmin = await Admin.findOne({ username: 'transitadmin' });
    if (!transitAdmin) {
      const hash = await Admin.hashPassword('admin123');
      transitAdmin = await Admin.create({
        username: 'transitadmin',
        password_hash: hash,
        full_name: 'TNSTC Bus Operations Admin',
        role: 'transit_admin',
        phone_number: '+919876543211',
      });
      console.log('👤 Created Transit Admin account');
    }

    // 3. Seed Health/Ambulance Admin
    let healthAdmin = await Admin.findOne({ username: 'healthadmin' });
    if (!healthAdmin) {
      const hash = await Admin.hashPassword('admin123');
      healthAdmin = await Admin.create({
        username: 'healthadmin',
        password_hash: hash,
        full_name: '108 Emergency Dispatch Admin',
        role: 'ambulance_admin',
        phone_number: '+919876543212',
      });
      console.log('👤 Created Ambulance/Health Admin account');
    }

    // 4. Seed User accounts for OTP login
    const seedAccounts = [
      {
        phone_number: '+919876543210',
        full_name: 'Chief Systems Administrator',
        role: 'superadmin',
      },
      {
        phone_number: '+919876543211',
        full_name: 'TNSTC Bus Operations Admin',
        role: 'transit_admin',
      },
      {
        phone_number: '+919876543212',
        full_name: '108 Emergency Dispatch Admin',
        role: 'ambulance_admin',
      },
      {
        phone_number: '+919876543213',
        full_name: 'R. Kumar (Conductor)',
        role: 'conductor',
        assigned_bus_id: 'TN-38-N-1234',
      },
      {
        phone_number: '+919876543214',
        full_name: 'M. Selvam (Ambulance Driver)',
        role: 'ambulance_driver',
        assigned_ambulance_id: 'TN-38-AM-1081',
      },
      {
        phone_number: '+919876543215',
        full_name: 'Anitha Passenger',
        role: 'passenger',
      },
    ];

    for (const acc of seedAccounts) {
      await User.findOneAndUpdate(
        { phone_number: acc.phone_number },
        { $set: acc },
        { upsert: true, new: true }
      );
    }
    console.log('✅ Seeded 6 Multi-Role Phone Users (+919876543210 to +919876543215)');

    // 5. Link driver to Ambulance
    await Ambulance.findOneAndUpdate(
      { ambulance_id: 'TN-38-AM-1081' },
      { $set: { driver_name: 'M. Selvam', driver_phone: '+919876543214' } }
    );
    console.log('🚑 Linked driver to Ambulance TN-38-AM-1081');

    mongoose.disconnect();
    console.log('🎉 Seeding complete!');
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seedUsers();
