require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin');

async function seedAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const existing = await Admin.findOne({ username: 'admin' });
    if (existing) {
      console.log('ℹ️  Admin account already exists. Skipping.');
      process.exit(0);
    }

    const password_hash = await bcrypt.hash('admin123', 12);
    await Admin.create({
      username: 'admin',
      password_hash,
      full_name: 'Super Admin',
      role: 'superadmin',
    });

    console.log('\n✅ Admin account created!');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('   ⚠️  Change this password after first login!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed admin error:', err);
    process.exit(1);
  }
}

seedAdmin();
