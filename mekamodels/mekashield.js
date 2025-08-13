// mekamodels/mekashield.js
const mongoose = require('mongoose');

const shieldSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true },

  // what this code is for
  action: { type: String, enum: [
    'enable',        // enable 2fa + set pin (+ optional hint)
    'disable',       // disable 2fa (also clears pin, hint, recovery)
    'setpin',        // change pin (no old pin field on FE)
    'addrecovery',   // add recovery email
    'changerecovery' // change recovery email
  ], required: true },

  // optional context (e.g. recovery email pending verification)
  field: { type: String },   // e.g. 'recovery_email', 'hint'
  value: { type: String }    // e.g. the email being verified
});

// Auto-delete document after expiry
shieldSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// for faster lookups
shieldSchema.index({ userId: 1 });

module.exports = mongoose.model('MekaShield', shieldSchema);
