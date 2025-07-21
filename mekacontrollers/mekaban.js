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
      `SELECT review_started_at FROM mekacore WHERE id_two = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const started = new Date(result.rows[0].review_started_at);
    const reviewEndsAt = new Date(started.getTime() + 10 * 60 * 1000); // you can make this 60 * 60 for 1 hr later
    const now = new Date();

    if (now >= reviewEndsAt) {
      // Passed review - clean logout
      await pool.query(`
        UPDATE mekacore
        SET flagged = false,
            review_status = 'passed'
        WHERE id_two = $1
      `, [userId]);

      console.log("✅ Review complete. Account unflagged.");
      return res.status(200).json({ message: "✅ You may now logout safely." });
    }

    // Too early – ban permanently
    await pool.query(`
      UPDATE mekacore
      SET flagged = true,
          world = 'banned',
          profile_image = 'https://i.ibb.co/LvbHJYg/locked-avatar.png'
      WHERE id_two = $1
    `, [userId]);

    console.log("❌ User banned for logging out early.");
    return res.status(200).json({ message: "⛔ You were banned for logging out early." });

  } catch (err) {
    console.error("🔥 Server error:", err.message);
    return res.status(500).json({ message: "🔥 Server error." });
  }
};
