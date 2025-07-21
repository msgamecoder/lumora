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
      `SELECT flagged, world, review_started_at FROM mekacore WHERE id_two = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const user = result.rows[0];
    const started = new Date(user.review_started_at);
    const now = new Date();
    const diffMins = (now - started) / 60000;

    if (diffMins >= 10 && diffMins < 30) {
      // allow logout but do NOT ban
      await pool.query(`
        UPDATE mekacore
        SET flagged = false,
            world = 'active',
            review_status = 'passed'
        WHERE id_two = $1
      `, [userId]);

      console.log("✅ Review passed, user unflagged.");
      return res.status(200).json({ message: "✅ You may now logout safely." });
    }

    if (diffMins < 10) {
      // Still within suspicious time
      await pool.query(`
        UPDATE mekacore
        SET flagged = true,
            world = 'banned',
            profile_image = 'https://i.ibb.co/LvbHJYg/locked-avatar.png'
        WHERE id_two = $1
      `, [userId]);

      console.log("❌ User banned due to early logout.");
      return res.status(200).json({ message: "⛔ You were banned for logging out early." });
    }

    // Over 30 mins — no ban, reset
    await pool.query(`
      UPDATE mekacore
      SET flagged = false,
          world = 'active',
          review_status = 'passed'
      WHERE id_two = $1
    `, [userId]);

    return res.status(200).json({ message: "✅ No ban, session cleared." });

  } catch (err) {
    console.error("🔥 Server error:", err.message);
    return res.status(500).json({ message: "🔥 Server error." });
  }
};
