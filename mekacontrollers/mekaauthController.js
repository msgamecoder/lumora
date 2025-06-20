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

    // Required field check
    if (!firstName || !lastName || !username || !email || !phone || !gender || !dob || !world) {
      return res.status(400).json({ message: '🚨 All fields are required including your world selection!' });
    }

    // Validation rules
    if (!isValidName(firstName)) return res.status(400).json({ message: '❌ First name can only contain letters and must be 33 characters or less.' });
    if (!isValidName(lastName)) return res.status(400).json({ message: '❌ Last name can only contain letters and must be 33 characters or less.' });
    if (!isValidUsername(username)) return res.status(400).json({ message: '🤖 Username cannot contain links and must be 33 characters max.' });
    if (!isValidEmail(email)) return res.status(400).json({ message: '📧 Only Gmail, Yahoo, or Outlook emails are accepted in correct format.' });
    if (!isValidPhone(phone)) return res.status(400).json({ message: '📱 Phone must only contain numbers.' });
    if (!['one', 'two'].includes(world)) return res.status(400).json({ message: '🌍 Please select a valid world: one or two.' });
    if (!isValidPassword(password)) {
  return res.status(400).json({ message: '🔐 Password must be between 10 and 15 characters.' });
}

    // Duplicate checks (separate)
    const emailExists = await Promise.any([
      MekaTmp.findOne({ email }),
      MekaCore.checkEmailExists?.(email) // if you build this
    ]).catch(() => null);

    if (emailExists) return res.status(400).json({ message: '📧 Email already exists. Try another one.' });

    const usernameExists = await Promise.any([
      MekaTmp.findOne({ username }),
      MekaCore.checkUsernameExists?.(username)
    ]).catch(() => null);

    if (usernameExists) return res.status(400).json({ message: '🧍 Username already taken. Choose another one.' });

    const phoneExists = await Promise.any([
      MekaTmp.findOne({ phone }),
      MekaCore.checkPhoneExists?.(phone)
    ]).catch(() => null);

    if (phoneExists) return res.status(400).json({ message: '☎️ Phone number already in use.' });

    // Token + Save
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
  password: hashedPassword, // ✅ store hashed
  verificationToken: token
});

    await newUser.save();

    const verifyUrl = `https://yourdomain.com/verify/${token}`;
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