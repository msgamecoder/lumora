// mekacontrollers/mekaauthCheck.js
const MekaTmp = require('../mekamodels/mekatmp');
const MekaCore = require('../mekaconfig/mekacore');

exports.checkUsername = async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ message: "❌ Username is required." });

  try {
    const tmp = await MekaTmp.findOne({ username });
    const core = await MekaCore.checkUsernameExists?.(username);

    if (tmp) console.log("🔍 Found username in MekaTmp (MongoDB):", username);
    if (core) console.log("🔍 Found username in MekaCore (PostgreSQL):", username);

    if (tmp || core) {
      return res.status(400).json({ message: "🧍 Username already taken." });
    }

    res.status(200).json({ message: "✅ Username is available." });
  } catch (err) {
    console.error("🔴 Username check failed:", err);
    res.status(500).json({ message: "⚠️ Server error checking username." });
  }
};

exports.checkEmail = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "❌ Email is required." });

  try {
    const tmp = await MekaTmp.findOne({ email });
    const core = await MekaCore.checkEmailExists?.(email);

    if (tmp) console.log("📧 Found email in MekaTmp (MongoDB):", email);
    if (core) console.log("📧 Found email in MekaCore (PostgreSQL):", email);

    if (tmp || core) {
      return res.status(400).json({ message: "📧 Email already in use." });
    }

    res.status(200).json({ message: "✅ Email is clean." });
  } catch (err) {
    console.error("🔴 Email check failed:", err);
    res.status(500).json({ message: "⚠️ Server error checking email." });
  }
};

exports.checkPhone = async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ message: "❌ Phone is required." });

  try {
    const tmp = await MekaTmp.findOne({ phone });
    const core = await MekaCore.checkPhoneExists?.(phone);

    if (tmp) console.log("📞 Found phone in MekaTmp (MongoDB):", phone);
    if (core) console.log("📞 Found phone in MekaCore (PostgreSQL):", phone);

    if (tmp || core) {
      return res.status(400).json({ message: "☎️ Phone already used." });
    }

    res.status(200).json({ message: "✅ Phone is clean." });
  } catch (err) {
    console.error("🔴 Phone check failed:", err);
    res.status(500).json({ message: "⚠️ Server error checking phone." });
  }
};
