//mekacontrollers/mekatwofa.js
const bcrypt = require('bcryptjs');
const db = require('../mekaconfig/mekadb');
const MekaShield = require('../mekamodels/mekashield'); // reuse
const sendLumoraMail = require('../mekautils/mekasendMail');

// Generate random readable backup codes
function generateBackupCodes(count = 8) {
  const codes = [];
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  while (codes.length < count) {
    let code = '';
    for (let i = 0; i < 10; i++) {
      code += charset[Math.floor(Math.random() * charset.length)];
    }
    codes.push(code);
  }

  return codes;
}

exports.initTwoFA = async (req, res) => {
  const userId = req.user.id;

  try {
    const checkUser = await db.query('SELECT twofa_enabled FROM mekacore WHERE id_two = $1', [userId]);
    if (checkUser.rows.length === 0) {
      return res.status(404).json({ message: '❌ User not found' });
    }

    if (checkUser.rows[0].twofa_enabled) {
      return res.status(400).json({ message: '⚠️ 2FA already enabled' });
    }

    const plainCodes = generateBackupCodes();
    const hashedCodes = await Promise.all(plainCodes.map(code => bcrypt.hash(code, 10)));

    await db.query(
      `UPDATE mekacore SET twofa_enabled = true, twofa_verified = false, backup_codes = $1 WHERE id_two = $2`,
      [hashedCodes, userId]
    );

    res.status(200).json({
      message: '✅ 2FA enabled. Save your backup codes securely!',
      backupCodes: plainCodes
    });

  } catch (err) {
    console.error("❌ initTwoFA error:", err);
    res.status(500).json({ message: "🔥 Internal server error" });
  }
};

exports.sendTwoFACode = async (req, res) => {
  const { internalId, email, username } = req.body;

  if (!internalId || !email || !username) {
    return res.status(400).json({ message: 'Missing required data' });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    await MekaShield.deleteMany({ userId: internalId }); // remove any existing codes

    await MekaShield.create({
      userId: internalId,
      code,
      expiresAt: new Date(Date.now() + 20 * 60 * 1000)
    });

    await sendLumoraMail(email, code, "2fa", { username });

    res.status(200).json({ message: '✅ 2FA code sent to email' });

  } catch (err) {
    console.error("❌ sendTwoFACode error:", err);
    res.status(500).json({ message: '🔥 Could not send 2FA code' });
  }
};

exports.verifyTwoFACode = async (req, res) => {
  const { internalId, code } = req.body;

  if (!internalId || !code) {
    return res.status(400).json({ message: 'Missing user ID or code' });
  }

  try {
    // 1️⃣ Check temporary email code (MongoDB)
    const found = await MekaShield.findOne({ userId: internalId });

    if (found && found.code === code) {
      await MekaShield.deleteOne({ userId: internalId }); // Clean up
      return res.status(200).json({ message: "✅ Code verified" });
    }

    // 2️⃣ Check backup codes (PostgreSQL hashed)
    const result = await db.query(`SELECT backup_codes FROM mekacore WHERE id_two = $1`, [internalId]);
    const storedCodes = result.rows[0]?.backup_codes || [];

    for (let hash of storedCodes) {
      const isMatch = await bcrypt.compare(code, hash);
      if (isMatch) {
        // Remove used backup code
        const newCodes = storedCodes.filter(c => c !== hash);
        await db.query(`UPDATE mekacore SET backup_codes = $1 WHERE id_two = $2`, [newCodes, internalId]);
        return res.status(200).json({ message: "✅ Backup code accepted" });
      }
    }

    return res.status(401).json({ message: "❌ Invalid or expired code" });

  } catch (err) {
    console.error("❌ verifyTwoFACode error:", err);
    res.status(500).json({ message: '🔥 Verification failed' });
  }
};

exports.regenerateBackupCodes = async (req, res) => {
  const userId = req.user.id;

  try {
    const newCodes = [];
    const hashedCodes = [];

    for (let i = 0; i < 8; i++) {
      const rawCode = Math.random().toString(36).slice(2, 10).toUpperCase(); // Example: 8-char code
      const hash = await bcrypt.hash(rawCode, 10);
      newCodes.push(rawCode);
      hashedCodes.push(hash);
    }

    await db.query(
      `UPDATE mekacore SET backup_codes = $1 WHERE id_two = $2`,
      [hashedCodes, userId]
    );

    return res.json({
      message: "✅ Backup codes regenerated",
      codes: newCodes // frontend will save this locally
    });

  } catch (err) {
    console.error("❌ Failed to regenerate backup codes:", err);
    res.status(500).json({ message: "🔥 Could not regenerate codes" });
  }
};
