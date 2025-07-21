const jwt = require("jsonwebtoken");
const pool = require("../mekaconfig/mekadb");
const MekaFlag = require("../mekamodels/mekaflag");

exports.checkTokenValidity = async (req, res) => {
  const { token, userId, deviceId } = req.body;

  if (!token || !userId || !deviceId) {
    return res.status(400).json({ message: "❗Token, user ID, and device ID are required." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("🔎 Comparing decoded.id:", decoded.id, "with userId:", userId);

    if (decoded.id !== userId) {
      return res.status(403).json({ message: "⛔ Invalid session." });
    }

    // Check user in mekacore (PostgreSQL)
    const result = await pool.query("SELECT * FROM mekacore WHERE id_two = $1", [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "👤 User not found." });
    }

    const user = result.rows[0];

    // 🔁 Auto-unflag logic
    if (user.flagged === true && user.review_started_at) {
      const started = new Date(user.review_started_at);
      const now = new Date();
      const diffMins = (now - started) / 60000;

      if (diffMins >= 10) {
        await pool.query(`
          UPDATE mekacore
          SET flagged = false, review_status = 'passed'
          WHERE id_two = $1
        `, [userId]);

        user.flagged = false; // update the local user object
        console.log("✅ Auto-unflagged user on login.");
      }
    }

    // Final check
    if (user.flagged === true) {
      return res.status(423).json({
        ok: false,
        reason: "locked",
        message: "🔒 Account flagged."
      });
    }

    delete user.password; // Never expose password

    return res.status(200).json({
      ok: true,
      user,
      message: "✅ Session is valid."
    });

  } catch (err) {
    console.error("❌ Token check error:", err.message);
    return res.status(401).json({ message: "❌ Token expired or invalid." });
  }
};
