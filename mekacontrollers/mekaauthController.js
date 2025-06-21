//mekacontrollers/mekaauthController.js
const crypto = require('crypto');
const MekaTmp = require('../mekamodels/mekatmp');
const MekaCore = require('../mekaconfig/mekacore');
const bcrypt = require('bcryptjs');
const sendVerificationEmail = require('../mekautils/mekasendMail');

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

exports.registerUser = async (req, res) => {
  try {
    const {
      firstName, lastName, username, email,
      phone, gender, dob, world, password
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

    // Age check
    const dobDate = new Date(dob);
    const today = new Date();
    const age = today.getFullYear() - dobDate.getFullYear();
    const hasBirthdayPassed = (
      today.getMonth() > dobDate.getMonth() ||
      (today.getMonth() === dobDate.getMonth() && today.getDate() >= dobDate.getDate())
    );
    const actualAge = hasBirthdayPassed ? age : age - 1;

    if (actualAge < 12) {
      return res.status(400).json({ message: '🚫 You must be at least 12 years old to join Lumora.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const hashedPassword = await bcrypt.hash(password, 10);

    const normalizedUsername = username.toLowerCase();

    const newUser = new MekaTmp({
      firstName,
      lastName,
      username,              // Preserve styled version
      normalizedUsername,    // Internal lookup
      email,
      phone,
      gender,
      dob,
      world,
      password: hashedPassword,
      verificationToken: token
    });

    try {
      await newUser.save();
    } catch (err) {
      if (err.code === 11000) {
        return res.redirect('https://mxgamecoder.lovestoblog.com?error=duplicate');
      }
      throw err;
    }

    const baseUrl = process.env.LUMORA_DOMAIN || 'https://lumoraa.onrender.com';
    const verifyUrl = `${baseUrl}/api/auth/verify/${token}`;
    console.log('🔗 Verification URL:', verifyUrl);
    await sendVerificationEmail(email, verifyUrl, username, world);

    res.status(201).json({
      message: '🎉 Registration successful! Check your email to verify.'
    });
  } catch (err) {
    console.error('❌ Registration Error:', err);
    res.status(500).json({ message: '💥 Internal server error.' });
  }
};

exports.verifyUser = async (req, res) => {
  try {
    const token = req.params.token;

    const tmpUser = await MekaTmp.findOne({ verificationToken: token });

    if (!tmpUser) {
      // Invalid or expired token – redirect user safely
      return res.redirect("https://mxgamecoder.lovestoblog.com?error=invalid-link");
    }

    const savedUser = await MekaCore.insertCoreUser(tmpUser);
    await tmpUser.deleteOne();

    // Optional: redirect to a frontend page with a success message
    return res.redirect("https://mxgamecoder.lovestoblog.com/very.html?verified=1");
  } catch (err) {
    console.error("🔴 Verification Error:", err);
    return res.redirect("https://mxgamecoder.lovestoblog.com?error=server");
  }
};

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

    const bcrypt = require('bcryptjs');
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: '🔐 Incorrect password.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.verificationToken = token;
    await user.save();

    const baseUrl = process.env.LUMORA_DOMAIN || 'https://lumoraa.onrender.com';
    const verifyUrl = `${baseUrl}/api/auth/verify/${token}`; // ✅ THIS
    await sendVerificationEmail(email, verifyUrl, user.username, user.world);

    return res.status(200).json({ message: '📬 Verification link re-sent. Check your email.' });
  } catch (err) {
    console.error("❌ Recovery error:", err);
    return res.status(500).json({ message: '💥 Internal server error.' });
  }
};
