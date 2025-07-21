const jwt = require("jsonwebtoken");
const pool = require("../mekaconfig/mekadb");

exports.banOnReviewLogout = async (req, res) => {
  const { token, userId, deviceId } = req.body;

  if (!token || !userId || !deviceId) {
    console.warn("🚫 Missing values:", { token, userId, deviceId });
    return res.status(400).json({ message: "Missing token, userId, or deviceId." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.id !== userId) {
      console.warn("❌ Token mismatch:", { decodedId: decoded.id, expected: userId });
      return res.status(403).json({ message: "Invalid token." });
    }

    const result = await pool.query(
      `SELECT flagged, world FROM mekacore WHERE id_two = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      console.warn("❌ User not found in mekacore:", userId);
      return res.status(404).json({ message: "User not found in main DB." });
    }

    const user = result.rows[0];
    console.log("👀 Checking user flag/ban status:", user);

    if (user.world !== 'banned') {
      console.log("🚨 User needs to be banned. Updating...");

      await pool.query(`
        UPDATE mekacore
        SET flagged = true,
            world = 'banned',
            profile_image = 'https://i.ibb.co/LvbHJYg/locked-avatar.png'
        WHERE id_two = $1
      `, [userId]);

      console.log("✅ Ban applied successfully.");
      return res.status(200).json({ message: "✅ User banned successfully." });
    } else {
      console.log("⚠️ User already banned. No update needed.");
      return res.status(200).json({ message: "⚠️ User already banned." });
    }

  } catch (err) {
    console.error("❌ banOnReviewLogout error:", err.message);
    return res.status(500).json({ message: "🔥 Server error while banning user." });
  }
};
