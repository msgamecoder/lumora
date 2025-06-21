const express = require('express');
const router = express.Router();
const axios = require('axios'); // ✅ Replace fetch with axios

router.get('/country-code', async (req, res) => {
  try {
    const ipapiURL = 'https://ipapi.co/json/';
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
