const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const conductorSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password_hash: { type: String, required: true },
    full_name: { type: String, required: true },
    employee_id: { type: String, required: true, unique: true },
    assigned_bus_id: { type: String, default: null }, // e.g. "TN-38-N-1234"
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Compare plain password with stored hash
conductorSchema.methods.comparePassword = async function (plain) {
  return bcrypt.compare(plain, this.password_hash);
};

// Static: hash a plain password
conductorSchema.statics.hashPassword = async function (plain) {
  return bcrypt.hash(plain, 12);
};

module.exports = mongoose.model('Conductor', conductorSchema);
