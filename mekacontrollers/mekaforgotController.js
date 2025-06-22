// mekacontrollers/mekaforgotController.js
const crypto = require("crypto");
const pool = require("../mekaconfig/mekadb");
const sendLumoraMail = require("../mekautils/mekasendMail");
const bcrypt = require("bcryptjs");

// POST /api/auth/forgot
exports.sendResetLink = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "📧 Email is required." });

  try {
    const result = await pool.query("SELECT * FROM mekacore WHERE email = $1", [email]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "❌ No account found with this email." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    // Save token to DB
    await pool.query(`
      INSERT INTO mekapasswordresets (email, token, expires_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (email) DO UPDATE SET token = EXCLUDED.token, expires_at = EXCLUDED.expires_at
    `, [email, token, expires]);

    const baseUrl = process.env.LUMORA_DOMAIN || "https://lumoraa.onrender.com";
    const resetLink = `${baseUrl}/reset.html?token=${token}&email=${encodeURIComponent(email)}`;

    await sendLumoraMail(email, resetLink, "forgot");

    res.status(200).json({ message: "📬 Reset link sent. Check your email." });
  } catch (err) {
    console.error("❌ Forgot password error:", err);
    res.status(500).json({ message: "💥 Internal server error." });
  }
};

// POST /api/auth/reset
exports.resetPassword = async (req, res) => {
  const { email, token, newPassword } = req.body;

  if (!email || !token || !newPassword) {
    return res.status(400).json({ message: "⚠️ All fields are required." });
  }

  if (newPassword.length < 10 || newPassword.length > 15) {
    return res.status(400).json({ message: "🔐 Password must be 10 to 15 characters." });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM mekapasswordresets WHERE email = $1 AND token = $2 AND expires_at > NOW()",
      [email, token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "❌ Invalid or expired token." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE mekacore SET password = $1 WHERE email = $2", [hashedPassword, email]);
    await pool.query("DELETE FROM mekapasswordresets WHERE email = $1", [email]);
    await sendLumoraMail(email, null, "resetSuccess");

    res.status(200).json({ message: "✅ Password updated successfully." });
  } catch (err) {
    console.error("❌ Reset error:", err);
    res.status(500).json({ message: "💥 Internal server error." });
  }
};
