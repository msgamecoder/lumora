const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/country-code', async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
    const API_KEY = process.env.IPINFO_KEY;

    // Avoid local network IPs
    if (!ip || ip.startsWith('192.') || ip.startsWith('127.') || ip.startsWith('::') || ip === '::1') {
      return res.json({ country: 'LOCAL' });
    }

    const geoRes = await axios.get(`https://ipinfo.io/${ip}?token=${API_KEY}`);
    const geoData = geoRes.data;

    if (!geoData || !geoData.country) {
      return res.status(500).json({ error: 'Failed to get country code' });
    }

    res.json({ country: geoData.country });
  } catch (err) {
    console.error("🌍 Country code fetch error:", err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
