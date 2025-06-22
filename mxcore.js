// the king himself my boss mxcore.js the boss the main
const express = require('express');
require('dotenv').config();
const connectMongo = require('./mekaconfig/mekamongo');
const pool = require('./mekaconfig/mekadb'); // PostgreSQL
const authRoutes = require('./mekaroutes/mekaauth');
const geoRoute = require('./mekaroutes/geo');
const path = require('path');
const cors = require('cors'); // ✅ Import CORS

const app = express();

app.use(cors({
  origin: ['http://127.0.0.1:5500', 'http://localhost:5500'], // ✅ Allow your HTML dev origin
  methods: ['GET', 'POST'],
  credentials: false
}));

app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "status.html"));
});
app.use(express.static("public")); // or "client", "frontend", etc.
app.use('/api/auth', authRoutes);
app.use('/api/geo', geoRoute);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  await connectMongo();
});
