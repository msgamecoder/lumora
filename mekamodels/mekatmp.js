const mongoose = require('mongoose');

const mekatmpSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName:  { type: String, required: true, trim: true },
  username:  { type: String, required: true, unique: true, trim: true }, // Preserves style (ΔMΞCØDΞR)
  normalizedUsername: { type: String, required: true, unique: true, lowercase: true }, // For internal checks
  email:     { type: String, required: true, unique: true, lowercase: true },
  phone:     { type: String, required: true, unique: true },
  password:  { type: String, required: true },
  profileImage: { type: String, default: 'https://i.ibb.co/JjMphBCP/avatar.jpg' },
  gender:    { type: String, enum: ['male', 'female', 'other'], required: true },
  dob:       { type: Date, required: true },
  world:     { type: String, enum: ['one', 'two'], required: true },
  verificationToken: { type: String },
  createdAt: { type: Date, default: Date.now, expires: '1d' }
});

module.exports = mongoose.model('MekaTmp', mekatmpSchema);
