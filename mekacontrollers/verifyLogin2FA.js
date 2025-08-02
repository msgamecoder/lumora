// verifyLogin2FA.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../mekaconfig/mekadb');
const MekaShield = require('../mekamodels/mekashield');
const sendLumoraMail = require('../mekautils/mekasendMail');
const admin = require('../mekaconfig/mekafirebase');

exports.verifyLogin2FA = async (req, res) => {
  const { internalId, code, deviceId, trustDevice } = req.body;

  if (!internalId || !code || !deviceId) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // 1️⃣ Try MongoDB code (email)
    const found = await MekaShield.findOne({ userId: internalId });

    if (found && found.code === code) {
      await MekaShield.deleteOne({ userId: internalId }); // Valid code
    } else {
      // 2️⃣ Try backup code
      const result = await db.query(`SELECT * FROM mekacore WHERE id_two = $1`, [internalId]);
      if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });

      const user = result.rows[0];
      const storedCodes = user.backup_codes || [];

      let matched = false;
      let remaining = [];

      for (let hash of storedCodes) {
        if (await bcrypt.compare(code, hash)) matched = true;
        else remaining.push(hash);
      }

      if (!matched) return res.status(401).json({ message: '❌ Invalid or expired 2FA/backup code' });

      await db.query(`UPDATE mekacore SET backup_codes = $1 WHERE id_two = $2`, [remaining, internalId]);
    }

    // 3️⃣ Now log user in
    const result = await db.query(`SELECT * FROM mekacore WHERE id_two = $1`, [internalId]);
    const user = result.rows[0];

    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;

    // ✅ Save trust device if checked
    if (trustDevice === true) {
      await db.query(`UPDATE mekacore SET device_id = $1, last_ip = $2 WHERE id_two = $3`, [deviceId, ip, internalId]);
    }

    const token = jwt.sign({ id: user.id_two }, process.env.JWT_SECRET, { expiresIn: '7d' });

    const loginTime = new Date().toUTCString();
    await sendLumoraMail(user.email, null, "login", {
      username: user.username,
      time: loginTime,
      ip
    });

    // ✅ Save login history
await db.query(
  `INSERT INTO mekaloginhistory (user_id, ip, location) VALUES ($1, $2, $3)`,
  [user.id_two, ip, null]
);

    if (user.notifications_enabled && user.fcm_token) {
      const pushMessage = {
        token: user.fcm_token,
        notification: {
          title: '✅ Lumora Login',
          body: `You logged in with 2FA\nTime: ${loginTime}\nIP: ${ip}`
        },
        data: { type: 'login', screen: 'dashboard' }
      };

      try {
        await admin.messaging().send(pushMessage);
      } catch (err) {
        if (err.code === 'messaging/registration-token-not-registered') {
          await db.query(`UPDATE mekacore SET fcm_token = NULL WHERE id_two = $1`, [internalId]);
        }
      }
    }

    const isFlagged = user.flagged === true;

    return res.json({
      message: "✅ 2FA verified, login successful!",
      token,
      user: {
        id: user.id_one,
        internalId: user.id_two,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        world: user.world,
        profileImage: user.profile_image,
        flagged: isFlagged
      }
    });

  } catch (err) {
    console.error("❌ verifyLogin2FA error:", err);
    res.status(500).json({ message: "🔥 Internal server error during 2FA login" });
  }
};
