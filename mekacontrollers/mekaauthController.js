//mekacontrollers/mekaauthController.js
const bcrypt = require('bcryptjs');
const MekaTmp = require('../mekamodels/mekatmp');
const MekaCore = require('../mekaconfig/mekacore');
const sendLumoraMail = require('../mekautils/mekasendMail');
const MekaFlag = require('../mekamodels/mekaflag')

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
    
const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;

try {
  const existingFlag = await MekaFlag.findOne({ deviceId, ip });

  if (existingFlag) {
    existingFlag.totalCreated += 1;
    existingFlag.lastCreated = new Date();

    if (existingFlag.totalCreated >= 1 && !existingFlag.flagged) {
      existingFlag.flagged = true;
    }

    await existingFlag.save();
  } else {
    await MekaFlag.create({ deviceId, ip });
  }
} catch (err) {
  console.warn("⚠️ Flag check failed:", err.message);
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
