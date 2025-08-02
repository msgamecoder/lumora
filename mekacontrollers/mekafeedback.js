// mekacontrollers/mekafeedback.js
const pool = require('../mekaconfig/mekadb');

exports.submitFeedback = async (req, res) => {
  const userId = req.meka.id;
  const { type, message, screenshot } = req.body;

  if (!type || !message) {
    return res.status(400).json({ message: '❌ Type and message are required.' });
  }

  try {
    await pool.query(
      `INSERT INTO mekafeedback (user_id, type, message, screenshot) VALUES ($1, $2, $3, $4)`,
      [userId, type, message, screenshot || null]
    );

    res.status(200).json({ message: '✅ Feedback submitted successfully.' });
  } catch (err) {
    console.error('Feedback error:', err);
    res.status(500).json({ message: '🔥 Failed to submit feedback.' });
  }
};
