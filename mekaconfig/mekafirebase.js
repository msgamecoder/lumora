const admin = require('firebase-admin');
const path = require('path');

// Absolute path to the service account key
const serviceAccountPath = path.join(__dirname, 'lumorapush-firebase-adminsdk-fbsvc-3a9ce4a410.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountPath)
});

module.exports = admin;
