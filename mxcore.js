// the king himself my boss mxcore.js the boss the main
const express = require('express');
require('dotenv').config();
const connectMongo = require('./mekaconfig/mekamongo');
const pool = require('./mekaconfig/mekadb'); // PostgreSQL
const authRoutes = require('./mekaroutes/mekaauth');
const geoRoute = require('./mekaroutes/geo');
const path = require('path');
const cors = require('cors'); // ✅ Import CORS
const cookieParser = require("cookie-parser");

const app = express();

app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      "capacitor://localhost",
      "file://",
      "http://localhost:5500",
      "http://127.0.0.1:5500",
      "https://mxgamecoder.lovestoblog.com",
      "https://lumora-usrb.onrender.com"
    ];

    const isMobileApp = !origin || origin === "null" || origin.startsWith("file://") || origin.startsWith("capacitor://");

    if (isMobileApp || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn("🚫 Blocked CORS origin:", origin);
    return callback(new Error("❌ Not allowed by CORS"), false);
  },
  credentials: true
}));

app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "status.html"));
});
app.use(cookieParser());
app.use(express.static("public")); // or "client", "frontend", etc.
app.use('/api/auth', authRoutes);
app.use('/api/geo', geoRoute);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  await connectMongo();
});
