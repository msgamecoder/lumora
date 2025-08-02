//mekacontrollers/mekatwofa.js
const bcrypt = require('bcryptjs');
const db = require('../mekaconfig/mekadb');
const MekaShield = require('../mekamodels/mekashield');
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
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    });

    await sendLumoraMail(email, code, "2fa", { username });

    res.status(200).json({ message: '✅ 2FA code sent to email' });

  } catch (err) {
    console.error("❌ sendTwoFACode error:", err);
    res.status(500).json({ message: '🔥 Could not send 2FA code' });
  }
};
