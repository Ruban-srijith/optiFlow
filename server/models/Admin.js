const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password_hash: { type: String, required: true },
    full_name: { type: String, required: true },
    phone_number: { type: String, trim: true, default: null },
    role: { 
      type: String, 
      default: 'superadmin', 
      enum: ['superadmin', 'transit_admin', 'ambulance_admin'] 
    },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

adminSchema.methods.comparePassword = async function (plain) {
  return bcrypt.compare(plain, this.password_hash);
};

adminSchema.statics.hashPassword = async function (plain) {
  return bcrypt.hash(plain, 12);
};

module.exports = mongoose.model('Admin', adminSchema);
