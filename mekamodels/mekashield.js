const mongoose = require('mongoose');

const shieldSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  field: { type: String },         // e.g. 'email' or 'phone'
  value: { type: String }          // pending new value
});

shieldSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('MekaShield', shieldSchema);
