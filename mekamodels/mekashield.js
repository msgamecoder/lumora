//mekamodels/mekashield.js
const mongoose = require('mongoose');

const shieldSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true }
});

shieldSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('MekaShield', shieldSchema);
