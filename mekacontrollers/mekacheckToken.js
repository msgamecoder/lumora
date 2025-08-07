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
   // console.log("🔎 Comparing decoded.id:", decoded.id, "with userId:", userId);

    if (decoded.id !== userId) {
      return res.status(403).json({ message: "⛔ Invalid session." });
    }

    // Check if user exists in PostgreSQL
// Instead of checking MongoDB, check PostgreSQL core user record
const result = await pool.query("SELECT * FROM mekacore WHERE id_two = $1", [userId]);
if (result.rows.length === 0) {
  return res.status(410).json({ ok: false, message: "⛔ Your account has been deleted." });
}

const user = result.rows[0];

if (user.flagged === true) {
  return res.status(423).json({
    ok: false,
    reason: "locked",
    message: "🔒 Account flagged."
  });
}

if (user.suspended === true) {
  return res.status(423).json({
    ok: false,
    reason: "suspended",
    message: "⏸️ Account is suspended. Reactivate to continue."
  });
}

    delete user.password; // Never expose password

    res.status(200).json({
      ok: true,
      user,
      message: "✅ Session is valid."
    });

  } catch (err) {
    console.error("❌ Token check error:", err.message);
    res.status(401).json({ message: "❌ Token expired or invalid." });
  }
};
