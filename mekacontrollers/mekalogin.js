const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../mekaconfig/mekadb');
const sendLumoraMail = require('../mekautils/mekasendMail');

exports.loginUser = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ message: '🚨 Please enter both identifier and password.' });
    }

    let result;

    if (identifier.includes('@')) {
      // Try email
      result = await pool.query(`SELECT * FROM mekacore WHERE email = $1 LIMIT 1`, [identifier.toLowerCase()]);
    } else if (/^\d+$/.test(identifier)) {
      // Try phone
      result = await pool.query(`SELECT * FROM mekacore WHERE phone = $1 LIMIT 1`, [identifier]);
    } else {
      // Try username
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

    const token = jwt.sign(
      { id: user.id_two },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const loginTime = new Date().toUTCString();
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;

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
        internalId: user.id_two,
        username: user.username,
        email: user.email, // 👈 added to help you verify
        world: user.world,
        profileImage: user.profile_image
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: '🔥 Internal server error.' });
  }
};
