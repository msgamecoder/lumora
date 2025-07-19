const jwt = require("jsonwebtoken");
const pool = require("../mekaconfig/mekadb");

exports.banOnReviewLogout = async (req, res) => {
  const { token, userId, deviceId } = req.body;

  if (!token || !userId || !deviceId) {
    return res.status(400).json({ message: "Missing token, userId, or deviceId." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.id !== userId) {
      return res.status(403).json({ message: "Invalid token." });
    }

    const result = await pool.query(`SELECT flagged FROM mekacore WHERE id_two = $1`, [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found in main DB." });
    }

    const user = result.rows[0];

    if (!user.flagged) {
      // 🔥 Permanently ban account in PostgreSQL
      await pool.query(`
        UPDATE mekacore
        SET flagged = true, world = 'banned', profile_image = 'https://i.ibb.co/LvbHJYg/locked-avatar.png'
        WHERE id_two = $1
      `, [userId]);

      return res.status(200).json({ message: "✅ Account flagged & banned in main DB." });
    }

    return res.status(200).json({ message: "⚠️ Already flagged. No changes made." });
  } catch (err) {
    console.error("❌ banOnReviewLogout error:", err.message);
    return res.status(500).json({ message: "🔥 Server error while banning user." });
  }
};
