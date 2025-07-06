const mongoose = require('mongoose');

const flagSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  deviceId: { type: String, required: true },
  ip: { type: String },
  totalCreated: { type: Number, default: 1 },
  lastCreated: { type: Date, default: Date.now },
  flagged: { type: Boolean, default: false },
  reason: { type: String, default: 'suspicious multiple account creation' }
}, { timestamps: true });

// 🚨 NEW: unique per userId + device + ip
flagSchema.index({ userId: 1, deviceId: 1, ip: 1 }, { unique: true });

module.exports = mongoose.model('MekaFlag', flagSchema);
