//mekacontrollers/mekasettings.js
const pool = require("../mekaconfig/mekadb");
const MekaShield = require('../mekamodels/mekashield'); // reuse
const sendLumoraMail = require('../mekautils/mekasendMail');

exports.suspendAccount = async (req, res) => {
  const userId = req.meka.id;

  try {
    await pool.query(`UPDATE mekacore SET suspended = true WHERE id_two = $1`, [userId]);
    return res.status(200).json({ message: "⏸️ Account suspended successfully. You can reactivate later." });
  } catch (err) {
    console.error("❌ Suspend account error:", err);
    return res.status(500).json({ message: "🔥 Failed to suspend account." });
  }
};

exports.reactivateAccount = async (req, res) => {
  const userId = req.meka.id;

  try {
    // Reactivate only if account is suspended
    const result = await pool.query(`SELECT suspended FROM mekacore WHERE id_two = $1`, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "👤 User not found." });
    }

    const user = result.rows[0];
    if (user.suspended !== true) {
      return res.status(400).json({ message: "⚠️ Account is not suspended." });
    }

    await pool.query(`UPDATE mekacore SET suspended = false WHERE id_two = $1`, [userId]);
    return res.status(200).json({ message: "✅ Account reactivated successfully!" });

  } catch (err) {
    console.error("❌ Reactivate account error:", err);
    return res.status(500).json({ message: "🔥 Failed to reactivate account." });
  }
};

exports.sendDeleteCode = async (req, res) => {
  const userId = req.meka.id;

  try {
    const result = await pool.query(`SELECT email, username FROM mekacore WHERE id_two = $1`, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: '❌ User not found.' });
    }

    const user = result.rows[0];
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await MekaShield.deleteMany({ userId }); // clear previous
    await MekaShield.create({
      userId,
      code,
      expiresAt: new Date(Date.now() + 20 * 60 * 1000) // 20 minutes
    });

    await sendLumoraMail(user.email, code, "delete", {
      username: user.username
    });

    return res.status(200).json({ message: "✅ Deletion code sent to your email." });

  } catch (err) {
    console.error("❌ sendDeleteCode error:", err);
    res.status(500).json({ message: "🔥 Failed to send deletion code." });
  }
};

exports.deleteAccount = async (req, res) => {
  const userId = req.meka.id;
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ message: "❗Verification code required." });
  }

  try {
    const found = await MekaShield.findOne({ userId });

    if (!found || found.code !== code || found.expiresAt < new Date()) {
      return res.status(401).json({ message: "❌ Invalid or expired code." });
    }

    await MekaShield.deleteOne({ userId });

    // Delete from PostgreSQL
    await pool.query(`DELETE FROM mekacore WHERE id_two = $1`, [userId]);

    return res.status(200).json({ message: "✅ Account permanently deleted." });

  } catch (err) {
    console.error("❌ deleteAccount error:", err);
    res.status(500).json({ message: "🔥 Failed to delete account." });
  }
};

exports.getLoginHistory = async (req, res) => {
  const userId = req.meka.id;

  try {
    const result = await pool.query(
      `SELECT ip, location, time FROM mekaloginhistory WHERE user_id = $1 ORDER BY time DESC LIMIT 20`,
      [userId]
    );

    res.status(200).json({
      message: "✅ Login history fetched.",
      history: result.rows
    });

  } catch (err) {
    console.error("❌ getLoginHistory error:", err);
    res.status(500).json({ message: "🔥 Failed to fetch login history." });
  }
};

exports.setTimezone = async (req, res) => {
  const userId = req.meka.id;
  const { timezone } = req.body;

  if (!timezone) {
    return res.status(400).json({ message: '🕓 Timezone is required' });
  }

  try {
    await pool.query(
      `UPDATE mekacore SET timezone = $1 WHERE id_two = $2`,
      [timezone, userId]
    );

    res.json({ message: `✅ Timezone updated to ${timezone}` });
  } catch (err) {
    console.error("Timezone update error:", err);
    res.status(500).json({ message: "🔥 Failed to update timezone" });
  }
};
