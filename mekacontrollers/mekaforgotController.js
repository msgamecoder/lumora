// mekacontrollers/mekaforgotController.js
const crypto = require("crypto");
const pool = require("../mekaconfig/mekadb");
const sendLumoraMail = require("../mekautils/mekasendMail");
const bcrypt = require("bcryptjs");

// POST /api/auth/forgot
exports.sendResetCode = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "📧 Email is required." });

  try {
    const result = await pool.query("SELECT * FROM mekacore WHERE email = $1", [email]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "❌ No account found with this email." });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await pool.query(`
      INSERT INTO mekapasswordresets (email, token, expires_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (email) DO UPDATE SET token = EXCLUDED.token, expires_at = EXCLUDED.expires_at
    `, [email, code, expires]);

    await sendLumoraMail(email, code, "forgot");

    res.status(200).json({ message: "📬 Reset code sent. Check your email." });
  } catch (err) {
    console.error("❌ Forgot password error:", err);
    res.status(500).json({ message: "💥 Internal server error." });
  }
};

// POST /api/auth/reset
exports.resetPassword = async (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return res.status(400).json({ message: "⚠️ All fields are required." });
  }

  if (newPassword.length < 10 || newPassword.length > 15) {
    return res.status(400).json({ message: "🔐 Password must be 10 to 15 characters." });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM mekapasswordresets WHERE email = $1 AND token = $2 AND expires_at > NOW()",
      [email, code]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "❌ Invalid or expired code." });
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
