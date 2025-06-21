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

    const token = crypto.randomBytes(32).toString('hex');
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new MekaTmp({
      firstName,
      lastName,
      username,
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
        return res.status(409).json({ message: '⚠️ Duplicate entry. Please refresh and try again.' });
      }
      throw err;
    }

    const verifyUrl = `${process.env.LUMORA_DOMAIN}/verify/${token}`;
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
      return res.status(400).json({ message: '⛔ Invalid or expired verification link.' });
    }

    const savedUser = await MekaCore.insertCoreUser(tmpUser);
    await tmpUser.deleteOne();

    res.status(200).json({
      message: '✅ Account verified successfully!',
      id: savedUser.id_one
    });
  } catch (err) {
    console.error('Verification Error:', err);
    res.status(500).json({ message: '🔥 Verification failed due to server error.' });
  }
};
