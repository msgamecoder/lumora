const pool = require('../mekaconfig/mekadb');
const MekaFlag = require('../mekamodels/mekaflag');

// Get flagged users
exports.getFlaggedUsers = async (req, res) => {
  try {
    const result = await pool.query(`SELECT id_two, username, email, world, flagged FROM mekacore WHERE flagged = true`);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("❌ Admin getFlaggedUsers:", err);
    res.status(500).json({ message: '💥 Error fetching flagged users.' });
  }
};

// Unflag user
exports.unflagUser = async (req, res) => {
  const { userId } = req.body;
  try {
    await pool.query(`UPDATE mekacore SET flagged = false WHERE id_two = $1`, [userId]);
    await MekaFlag.updateOne({ userId }, { $set: { flagged: false } });
    res.status(200).json({ message: '✅ User unflagged.' });
  } catch (err) {
    console.error("❌ Admin unflagUser:", err);
    res.status(500).json({ message: '💥 Failed to unflag user.' });
  }
};

// Ban user (simple boolean)
exports.banUser = async (req, res) => {
  const { userId } = req.body;
  try {
    await pool.query(`
      UPDATE mekacore
      SET flagged = true,
          world = 'banned',
          profile_image = 'https://i.ibb.co/LvbHJYg/locked-avatar.png'
      WHERE id_two = $1
    `, [userId]);

    res.status(200).json({ message: '🚫 User permanently banned (world = banned).' });
  } catch (err) {
    console.error("❌ Admin banUser:", err);
    res.status(500).json({ message: '💥 Failed to ban user.' });
  }
};

// Send review message (custom response after review)
exports.sendReviewMessage = async (req, res) => {
  const { userId, message } = req.body;
  try {
    // Save in a review message table or in a MongoDB collection
    await MekaFlag.updateOne({ userId }, { $set: { reviewMessage: message } });
    res.status(200).json({ message: '📩 Message sent to user.' });
  } catch (err) {
    console.error("❌ Admin sendReviewMessage:", err);
    res.status(500).json({ message: '💥 Failed to send message.' });
  }
};

// Frontend: fetch review message for locked user
exports.getReviewMessage = async (req, res) => {
  const { userId } = req.body;
  try {
    const doc = await MekaFlag.findOne({ userId });
    if (doc?.reviewMessage) {
      res.status(200).json({ message: doc.reviewMessage });
    } else {
      res.status(200).json({ message: null });  // ✅ Always return JSON
    }
  } catch (err) {
    console.error("❌ getReviewMessage:", err);
    res.status(500).json({ message: '💥 Failed to fetch review message.' });
  }
};
