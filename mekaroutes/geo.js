const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/country-code', async (req, res) => {
  try {
    const API_KEY = process.env.IPAPI_KEY; // store your key in .env
    const ipapiURL = `https://ipapi.co/json/?key=${API_KEY}`;
    const response = await axios.get(ipapiURL);
    const data = response.data;

    if (!data || !data.country_code) {
      return res.status(500).json({ error: 'Failed to get country code' });
    }

    res.json({ country: data.country_code });
  } catch (err) {
    console.error("🌍 Country code fetch error:", err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
