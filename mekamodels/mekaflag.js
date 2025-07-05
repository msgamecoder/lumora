const mongoose = require('mongoose');

const flagSchema = new mongoose.Schema({
  deviceId: { type: String },
  ip: { type: String },
  totalCreated: { type: Number, default: 1 },
  lastCreated: { type: Date, default: Date.now },
  flagged: { type: Boolean, default: false },
  reason: { type: String, default: 'suspicious multiple account creation' }
}, { timestamps: true });

flagSchema.index({ deviceId: 1, ip: 1 }, { unique: true });

module.exports = mongoose.model('MekaFlag', flagSchema);
