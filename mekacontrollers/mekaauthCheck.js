// mekacontrollers/mekaauthCheck.js
const MekaTmp = require('../mekamodels/mekatmp');
const MekaCore = require('../mekaconfig/mekacore');

exports.checkUsername = async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ message: "❌ Username is required." });

  const exists = await Promise.any([
    MekaTmp.findOne({ username }),
    MekaCore.checkUsernameExists?.(username)
  ]).catch(() => null);

  if (exists) return res.status(400).json({ message: "🧍 Username already taken." });
  res.status(200).json({ message: "✅ Username is available." });
};

exports.checkEmail = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "❌ Email is required." });

  const exists = await Promise.any([
    MekaTmp.findOne({ email }),
    MekaCore.checkEmailExists?.(email)
  ]).catch(() => null);

  if (exists) return res.status(400).json({ message: "📧 Email already in use." });
  res.status(200).json({ message: "✅ Email is clean." });
};

exports.checkPhone = async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ message: "❌ Phone is required." });

  const exists = await Promise.any([
    MekaTmp.findOne({ phone }),
    MekaCore.checkPhoneExists?.(phone)
  ]).catch(() => null);

  if (exists) return res.status(400).json({ message: "☎️ Phone already used." });
  res.status(200).json({ message: "✅ Phone is clean." });
};
