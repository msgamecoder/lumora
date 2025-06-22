const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../mekaconfig/mekadb'); // PostgreSQL pool
const sendLumoraMail = require('../mekautils/mekasendMail'); // ✅ Add this

exports.loginUser = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ message: '🚨 Please enter your identifier and password.' });
    }

    // 👇 Normalize username/email (but not phone)
    const normalized = /^[0-9]+$/.test(identifier)
      ? identifier
      : identifier.toLowerCase();

    const query = `
      SELECT * FROM mekacore
      WHERE username = $1 OR email = $1 OR phone = $1
      LIMIT 1
    `;
    const result = await pool.query(query, [normalized]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: '❌ User not found.' });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: '🔐 Incorrect password.' });
    }

    const token = jwt.sign(
      { id: user.id_two },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // ✅ Get login time and IP
    const loginTime = new Date().toUTCString();
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;

    // ✅ Send login notification
    await sendLumoraMail(user.email, null, "login", {
      username: user.username,
      time: loginTime,
      ip
    });

    res.status(200).json({
      message: '✅ Login successful!',
      token,
      user: {
        id: user.id_one,
        username: user.username,
        world: user.world,
        profileImage: user.profile_image
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: '🔥 Internal server error.' });
  }
};
