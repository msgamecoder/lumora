const admin = require('firebase-admin');
const path = require('path');

// Absolute path to the service account key
const serviceAccountPath = path.join(__dirname, 'lumorapush-firebase-adminsdk-fbsvc-0f8abc6e29.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountPath)
});

module.exports = admin;
