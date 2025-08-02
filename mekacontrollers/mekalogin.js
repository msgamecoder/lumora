// mekalogin.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../mekaconfig/mekadb');
const MekaShield = require('../mekamodels/mekashield');
const sendLumoraMail = require('../mekautils/mekasendMail');
const admin = require('../mekaconfig/mekafirebase');

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
    if (!isMatch) return res.status(401).json({ message: '🔐 Incorrect password.' });

    // ✅ Handle FCM token update
    if (fcmToken && fcmToken !== user.fcm_token) {
      await pool.query(`UPDATE mekacore SET fcm_token = $1 WHERE id_two = $2`, [fcmToken, user.id_two]);
      user.fcm_token = fcmToken;
    }

    // ✅ Check if 2FA is required
    if (user.twofa_enabled && user.device_id !== deviceId) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      await MekaShield.deleteMany({ userId: user.id_two });
      await MekaShield.create({
        userId: user.id_two,
        code,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      });

      await sendLumoraMail(user.email, code, "2fa", { username: user.username });

      return res.status(200).json({
        requires2FA: true,
        message: '📨 2FA required: code sent to your email',
        userId: user.id_two,
        email: user.email,
        username: user.username
      });
    }

    // ✅ 2FA not required, continue login
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
    await pool.query(`UPDATE mekacore SET device_id = $1, last_ip = $2 WHERE id_two = $3`, [deviceId, ip, user.id_two]);

    await pool.query(
  `INSERT INTO mekaloginhistory (user_id, ip, location) VALUES ($1, $2, $3)`,
  [user.id_two, ip, null] // Add location later if you want
);

    const token = jwt.sign({ id: user.id_two }, process.env.JWT_SECRET, { expiresIn: '7d' });

    const isFlagged = user.flagged === true;

    return res.status(200).json({
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
    return res.status(500).json({ message: '🔥 Internal server error.' });
  }
};

