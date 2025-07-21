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
    console.log("👀 Scanning user status:", user);

    if (user.flagged === false) {
      console.log("✅ User is already cleared by admin. No ban.");
      return res.status(200).json({ message: "✅ Review passed. No ban needed." });
    }

    if (user.flagged === true && user.world !== 'banned') {
      console.log("🚨 Still flagged and not banned yet. Proceeding to ban...");

      await pool.query(`
        UPDATE mekacore
        SET flagged = true,
            world = 'banned',
            profile_image = 'https://i.ibb.co/LvbHJYg/locked-avatar.png'
        WHERE id_two = $1
      `, [userId]);

      console.log("✅ Ban applied.");
      return res.status(200).json({ message: "✅ User banned after logout while under review." });
    }

    if (user.world === 'banned') {
      console.log("⚠️ User already banned.");
      return res.status(200).json({ message: "⚠️ User was already banned." });
    }

    console.log("🤷 Unexpected state. No action taken.");
    return res.status(200).json({ message: "🤷 No action taken. Possibly already cleared or handled." });

  } catch (err) {
    console.error("❌ banOnReviewLogout error:", err.message);
    return res.status(500).json({ message: "🔥 Server error while banning user." });
  }
};
