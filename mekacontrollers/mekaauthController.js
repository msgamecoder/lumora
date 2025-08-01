//mekacontrollers/mekaauthController.js
const bcrypt = require('bcryptjs');
const MekaTmp = require('../mekamodels/mekatmp');
const MekaCore = require('../mekaconfig/mekacore');
const sendLumoraMail = require('../mekautils/mekasendMail');
const MekaFlag = require('../mekamodels/mekaflag')
const pool = require('../mekaconfig/mekadb'); // postgres pool

function isValidName(name) {
  return /^[a-zA-Z]{1,33}$/.test(name);
}

function isValidUsername(username) {
  return typeof username === 'string' && username.length <= 33 && !/https?:\/\//.test(username);
}

function isValidEmail(email) {
  return /^[^\s@]+@(gmail|yahoo|outlook)\.com$/.test(email);
}

function isValidPhone(phone) {
  return /^\d+$/.test(phone);
}

function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 10 && password.length <= 15;
}

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 🧾 REGISTER USER
exports.registerUser = async (req, res) => {
  try {
const {
  firstName, lastName, username, email,
  phone, gender, dob, world, password, deviceId
} = req.body;

    if (!firstName || !lastName || !username || !email || !phone || !gender || !dob || !world) {
      return res.status(400).json({ message: '🚨 All fields are required including your world selection!' });
    }

    if (!isValidName(firstName)) return res.status(400).json({ message: '❌ First name must be only letters (max 33).' });
    if (!isValidName(lastName)) return res.status(400).json({ message: '❌ Last name must be only letters (max 33).' });
    if (!isValidUsername(username)) return res.status(400).json({ message: '🤖 Username cannot contain links and must be 33 characters max.' });
    if (!isValidEmail(email)) return res.status(400).json({ message: '📧 Only Gmail, Yahoo, or Outlook emails allowed.' });
    if (!isValidPhone(phone)) return res.status(400).json({ message: '📱 Phone must contain only digits.' });
    if (!['one', 'two'].includes(world)) return res.status(400).json({ message: '🌍 Choose a valid world: one or two.' });
    if (!isValidPassword(password)) return res.status(400).json({ message: '🔐 Password must be 10 to 15 characters.' });
    if (!deviceId || typeof deviceId !== 'string') {
  return res.status(400).json({ message: '📱 Device ID is required and must be a string.' });
}

    // Age check
    const dobDate = new Date(dob);
    const today = new Date();
    const age = today.getFullYear() - dobDate.getFullYear();
    const hasBirthdayPassed = today.getMonth() > dobDate.getMonth() ||
      (today.getMonth() === dobDate.getMonth() && today.getDate() >= dobDate.getDate());
    const actualAge = hasBirthdayPassed ? age : age - 1;

    if (actualAge < 12) {
      return res.status(400).json({ message: '🚫 You must be at least 12 years old to join Lumora.' });
    }

    const normalizedUsername = username.toLowerCase();
    const hashedPassword = await bcrypt.hash(password, 10);
    const code = generateCode();

    const newUser = new MekaTmp({
      firstName,
      lastName,
      username,
      normalizedUsername,
      email,
      phone,
      gender,
      dob,
      world,
      password: hashedPassword,
      verificationCode: code,
      deviceId,
      verificationCodeExpires: new Date(Date.now() + 15 * 60 * 1000) // 15 mins
    });

    try {
      await newUser.save();
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ message: '🚫 Duplicate email, username, or phone.' });
      }
      throw err;
    }
    
    await sendLumoraMail(email, code, "register", {
      username,
      world
    });

    return res.status(201).json({
      message: '📩 Code sent to email. Enter to verify your account.'
    });
  } catch (err) {
    console.error("❌ Registration Error:", err);
    res.status(500).json({ message: '💥 Internal server error.' });
  }
};

// ✅ VERIFY USER (WITH CODE)
exports.verifyUser = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ message: '📧 Email and 6-digit code required.' });
    }

    const user = await MekaTmp.findOne({ email });
    if (!user || user.verificationCode !== code) {
      return res.status(400).json({ message: '❌ Invalid code or user not found.' });
    }

    if (user.verificationCodeExpires < new Date()) {
      return res.status(400).json({ message: '⏰ Code expired. Try again.' });
    }

    const savedUser = await MekaCore.insertCoreUser(user);
    await user.deleteOne();

    // ✅ Device flag logic goes BEFORE res.status
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
    const deviceId = user.deviceId; // get it from the old tmp user

    try {
const count = await MekaFlag.countDocuments({ deviceId, ip });

if (count >= 5) {
  await MekaFlag.create({
    userId: savedUser.id_two,
    deviceId,
    ip,
    flagged: true
  });

  // ✅ Also flag in PostgreSQL
  const pool = require('../mekaconfig/mekadb');
  await pool.query(`UPDATE mekacore SET flagged = true WHERE id_two = $1`, [savedUser.id_two]);

} else {
  await MekaFlag.create({
    userId: savedUser.id_two,
    deviceId,
    ip
  });
}
    } catch (err) {
      console.warn("⚠️ Flag update failed:", err.message);
    }

    // ✅ Now respond
    return res.status(200).json({ message: '✅ Account verified successfully.' });

  } catch (err) {
    console.error("🔴 Verification Error:", err);
    return res.status(500).json({ message: '💥 Internal server error.' });
  }
};

// ♻️ RESEND VERIFICATION (UNVERIFIED USERS)
exports.recoverUnverifiedWithPassword = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: '❌ Email and password are required.' });
    }

    if (!/^[^\s@]+@(gmail|yahoo|outlook)\.com$/.test(email)) {
      return res.status(400).json({ message: '📧 Invalid email format.' });
    }

    const user = await MekaTmp.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: '🚫 No unverified account found.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: '🔐 Incorrect password.' });
    }

    const code = generateCode();
    user.verificationCode = code;
    user.verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    await sendLumoraMail(email, code, "register", {
      username: user.username,
      world: user.world
    });

    return res.status(200).json({ message: '📬 New verification code sent.' });
  } catch (err) {
    console.error("❌ Recovery error:", err);
    return res.status(500).json({ message: '💥 Internal server error.' });
  }
};

/*exports.submitIdentityReview = async (req, res) => {
  try {
    const { fullName, age, faceBase64, deviceId } = req.body;

    if (!fullName || !age || !faceBase64 || !deviceId) {
      return res.status(400).json({ message: "❌ All fields are required." });
    }

    const user = await pool.query(
      `SELECT * FROM mekacore WHERE device_id = $1 LIMIT 1`,
      [deviceId]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ message: "🚫 No user found with this device ID." });
    }

    const now = new Date();

    await pool.query(`
      UPDATE mekacore
      SET review_status = $1,
          review_started_at = $2,
          face_data = $3
      WHERE device_id = $4
    `, ['pending', now, faceBase64, deviceId]);

    return res.status(200).json({
      message: "⏳ Review started. Please wait 10 minutes."
    });
  } catch (err) {
    console.error("🔴 Identity review error:", err.message);
    return res.status(500).json({ message: "💥 Internal server error." });
  }
};

async function checkPendingReviews() {
  const now = new Date();

  const result = await pool.query(`
    UPDATE mekacore
    SET review_status = 'forgiven'
    WHERE review_status = 'pending'
    AND review_started_at <= NOW() - INTERVAL '10 minutes'
    RETURNING id_two, device_id, username;
  `);

  result.rows.forEach(user => {
    // 📣 notify them however you want (socket, firebase, etc.)
    console.log(`✅ User ${user.username} forgiven. Tell them to logout and re-login.`);
  });
}

// Run every 1 min
setInterval(checkPendingReviews, 60 * 1000);
*/
