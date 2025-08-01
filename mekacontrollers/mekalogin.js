const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../mekaconfig/mekadb');
// const MekaFlag = require('../mekamodels/mekaflag');
const sendLumoraMail = require('../mekautils/mekasendMail');
const admin = require('../mekaconfig/mekafirebase'); // ✅ at the top if not added

exports.loginUser = async (req, res) => {
  try {
    const { identifier, password, deviceId, fcmToken } = req.body;

    if (!identifier || !password || !deviceId) {
      return res.status(400).json({ message: '🚨 Please enter identifier, password, and device ID.' });
    }

    let result;
    if (identifier.includes('@')) {
      result = await pool.query(`SELECT * FROM mekacore WHERE email = $1 LIMIT 1`, [identifier.toLowerCase()]);
    } else if (/^\d+$/.test(identifier)) {
      result = await pool.query(`SELECT * FROM mekacore WHERE phone = $1 LIMIT 1`, [identifier]);
    } else {
      result = await pool.query(`SELECT * FROM mekacore WHERE username = $1 LIMIT 1`, [identifier]);
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ message: '❌ User not found with that identifier.' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: '🔐 Incorrect password.' });
    }

    if (fcmToken && fcmToken !== user.fcm_token) {
  await pool.query(`UPDATE mekacore SET fcm_token = $1 WHERE id_two = $2`, [fcmToken, user.id_two]);
  console.log("🔁 FCM token updated during login.");
}

    // ✅ If FCM token is empty, patch it
    const fallbackFcmToken = "fSj-GSjZQAmfYg3S_rv2m5:APA91bG2-jUbzviQe1Ku4kObAqtPNYfY_ySMNvyWS_RuQVJlYu2H8rInUYk0P9_ene6wIjbv9k3ivfNZWFaw4oXSp6nYxiN2lKRfRkJDsJy0Roah7qcVYGA";

    if (!user.fcm_token || user.fcm_token.trim() === "") {
      await pool.query(
        `UPDATE mekacore SET fcm_token = $1 WHERE id_two = $2`,
        [fallbackFcmToken, user.id_two]
      );
      console.log(`📌 Auto-filled missing FCM token for ${user.username}`);
    }

    // ✅ Update device info
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
    await pool.query(
      `UPDATE mekacore SET device_id = $1, last_ip = $2 WHERE id_two = $3`,
      [deviceId, ip, user.id_two]
    );

    const token = jwt.sign(
      { id: user.id_two },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const loginTime = new Date().toUTCString();
    await sendLumoraMail(user.email, null, "login", {
      username: user.username,
      time: loginTime,
      ip
    });
    
if (user.fcm_token) {
  const pushMessage = {
    token: user.fcm_token,
    notification: {
      title: '✅ Lumora Login',
      body: `You just logged in\nTime: ${loginTime}\nIP: ${ip}`
    },
    data: {
      type: 'login',
      screen: 'dashboard'
    }
  };

  try {
    await admin.messaging().send(pushMessage);
    console.log("📤 FCM login push sent.");
  } catch (pushErr) {
    console.error("❌ Failed to send login push:", pushErr);

    // ✅ Handle expired or unregistered token
    if (pushErr.code === 'messaging/registration-token-not-registered') {
      console.warn("🧹 Token is invalid. Removing from database...");
      await pool.query(`UPDATE mekacore SET fcm_token = NULL WHERE id_two = $1`, [user.id_two]);
    }
  }
}
    const isFlagged = user.flagged === true;

    res.status(200).json({
      message: '✅ Login successful!',
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
    console.error('Login error:', err);
    res.status(500).json({ message: '🔥 Internal server error.' });
  }
};
