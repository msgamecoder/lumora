//mekacontrollers/mekacheckToken.js
const jwt = require("jsonwebtoken");
const pool = require("../mekaconfig/mekadb");

exports.checkTokenValidity = async (req, res) => {
  const { token, userId } = req.body;

  if (!token || !userId) {
    return res.status(400).json({ message: "❗Token and user ID are required." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    //console.log("🔎 Comparing decoded.id:", decoded.id, "with userId:", userId);

    if (decoded.id !== userId) {
      return res.status(403).json({ message: "⛔ Invalid session." });
    }

    const result = await pool.query("SELECT * FROM mekacore WHERE id_two = $1", [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "👤 User not found." });
    }

    const user = result.rows[0];
    delete user.password; // Never send password back

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
