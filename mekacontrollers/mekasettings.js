//mekacontrollers/mekasettings.js
const pool = require("../mekaconfig/mekadb");

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
