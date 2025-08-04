//mekaprofile.js
const cloudinary = require('../mekaconfig/mekacloud');
const db = require('../mekaconfig/mekadb');
const multer = require('multer');
const {
  isValidName,
  isValidUsername,
  isValidEmail,
  isValidPhone,
  isValidWorld,
  isValidPassword
} = require('../mekautils/validators');
const bcrypt = require('bcryptjs');
const storage = multer.memoryStorage();
const uploadMiddleware = multer({ storage }).single('image');

const uploadProfileImage = async (req, res) => {
  try {
    const file = req.file;
    const { internalId } = req.body;

    if (!internalId) {
      return res.status(400).json({ ok: false, message: "User internal ID (id_two) required" });
    }

    if (!file || !file.mimetype.match(/^image\/(png|jpg|jpeg)$/)) {
      return res.status(400).json({ ok: false, message: "Only PNG and JPG allowed" });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'profile_image',
        public_id: 'me_' + internalId,
        overwrite: true,
        resource_type: 'image'
      },
      async (err, result) => {
        if (err) {
          console.error('❌ Cloudinary error:', err);
          return res.status(500).json({ ok: false, message: 'Upload failed' });
        }

        try {
          await db.query(
            'UPDATE mekacore SET profile_image = $1 WHERE id_two = $2',
            [result.secure_url, internalId]
          );
          return res.status(200).json({ ok: true, imageUrl: result.secure_url });
        } catch (dbErr) {
          console.error('❌ DB save error:', dbErr);
          return res.status(500).json({ ok: false, message: 'Cloudinary saved, DB failed' });
        }
      }
    );

    uploadStream.end(file.buffer);
  } catch (err) {
    console.error("❌ Upload failed:", err);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
};

const fetchProfileInfo = async (req, res) => {
  try {
    const { internalId } = req.body;

    if (!internalId) return res.status(400).json({ ok: false, message: "User internal ID (id_two) required" });

    const result = await db.query(
      "SELECT username, email, profile_image FROM mekacore WHERE id_two = $1",
      [internalId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, message: "User not found" });
    }

    res.json({ ok: true, profile: result.rows[0] });
  } catch (err) {
    console.error("❌ fetchProfileInfo error:", err);
    res.status(500).json({ ok: false, message: "Something went wrong" });
  }
};

const updateProfileInfo = async (req, res) => {
  const userId = req.user.id;
  const { firstName, lastName, username, email, phone, world } = req.body;

  if (!userId) return res.status(400).json({ message: 'Missing user ID' });

  const updates = [];
  const values = [];
  let i = 1;

  try {
    const result = await db.query(`SELECT * FROM mekacore WHERE id_two = $1`, [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const current = result.rows[0];

    const isExactSame = (a, b) => (a || '').trim() === (b || '').trim();
    const normalized = (val) => (val || '').trim().toLowerCase();

    // 🔤 FIRST NAME
    if (firstName !== undefined) {
      if (!isValidName(firstName)) return res.status(400).json({ message: '❌ Invalid first name.' });
      if (isExactSame(firstName, current.first_name)) return res.status(409).json({ message: '⚠️ First name is the same as current.' });

      updates.push(`first_name = $${i++}`);
      values.push(firstName.trim());
    }

    // 🔤 LAST NAME
    if (lastName !== undefined) {
      if (!isValidName(lastName)) return res.status(400).json({ message: '❌ Invalid last name.' });
      if (isExactSame(lastName, current.last_name)) return res.status(409).json({ message: '⚠️ Last name is the same as current.' });

      updates.push(`last_name = $${i++}`);
      values.push(lastName.trim());
    }

    // 🔤 USERNAME
    if (username !== undefined) {
      if (!isValidUsername(username)) return res.status(400).json({ message: '❌ Invalid username format.' });
      if (isExactSame(username, current.username)) return res.status(409).json({ message: '⚠️ Username is the same as current.' });

      const normalizedUsername = normalized(username);
      const check = await db.query(`SELECT id_two FROM mekacore WHERE LOWER(username) = $1 AND id_two != $2`, [normalizedUsername, userId]);
      if (check.rows.length > 0) return res.status(409).json({ message: '🧍 Username already taken.' });

      updates.push(`username = $${i++}`);
      values.push(username.trim());
    }

    // 📧 EMAIL
    if (email !== undefined) {
      if (!isValidEmail(email)) return res.status(400).json({ message: '📧 Invalid email.' });
      if (isExactSame(email, current.email)) return res.status(409).json({ message: '⚠️ Email is the same as current.' });

      const normalizedEmail = normalized(email);
      const check = await db.query(`SELECT id_two FROM mekacore WHERE LOWER(email) = $1 AND id_two != $2`, [normalizedEmail, userId]);
      if (check.rows.length > 0) return res.status(409).json({ message: '📧 Email already in use.' });

      updates.push(`email = $${i++}`);
      values.push(email.trim().toLowerCase());
    }

    // 📞 PHONE
    if (phone !== undefined) {
      if (!isValidPhone(phone)) return res.status(400).json({ message: '📱 Invalid phone.' });
      if (isExactSame(phone, current.phone)) return res.status(409).json({ message: '⚠️ Phone is the same as current.' });

      const check = await db.query(`SELECT id_two FROM mekacore WHERE phone = $1 AND id_two != $2`, [phone.trim(), userId]);
      if (check.rows.length > 0) return res.status(409).json({ message: '☎️ Phone number already used.' });

      updates.push(`phone = $${i++}`);
      values.push(phone.trim());
    }

    // 🌍 WORLD
    if (world !== undefined) {
      if (!isValidWorld(world)) return res.status(400).json({ message: '🌍 Invalid world.' });
      if (isExactSame(world, current.world)) return res.status(409).json({ message: '⚠️ World is the same as current.' });

      updates.push(`world = $${i++}`);
      values.push(world.trim());
    }

    // ⚠️ No valid changes?
    if (updates.length === 0) {
      return res.status(400).json({ message: '⚠️ No valid changes provided.' });
    }

    values.push(userId);
    await db.query(`UPDATE mekacore SET ${updates.join(', ')} WHERE id_two = $${i}`, values);

    console.log('✅ Updated fields:', updates);
    console.log('🧾 With values:', values);

    res.json({ message: "✅ Profile updated." });

  } catch (err) {
    console.error("❌ Profile update error:", err);
    res.status(500).json({ message: "🔥 Internal server error." });
  }
};

const changePassword = async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  if (!userId || !currentPassword || !newPassword) {
    return res.status(400).json({ message: "All password fields are required." });
  }

  if (!isValidPassword(newPassword)) {
    return res.status(400).json({ message: "🔐 New password must be 10 to 15 characters." });
  }

  try {
    const result = await db.query(`SELECT password FROM mekacore WHERE id_two = $1`, [userId]);
    if (result.rows.length === 0) return res.status(404).json({ message: "User not found." });

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(401).json({ message: "❌ Incorrect current password." });

    const isSame = await bcrypt.compare(newPassword, user.password);
    if (isSame) return res.status(409).json({ message: "⚠️ New password cannot be the same as old one." });

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.query(`UPDATE mekacore SET password = $1 WHERE id_two = $2`, [hashed, userId]);

    res.json({ message: "✅ Password updated successfully." });

  } catch (err) {
    console.error("❌ Password change error:", err);
    res.status(500).json({ message: "🔥 Something went wrong." });
  }
};

const toggleNotifications = async (req, res) => {
  const userId = req.user.id;
  const { enabled } = req.body;

  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ message: '❗ Expected "enabled" to be true or false.' });
  }

  try {
    await db.query(
      `UPDATE mekacore SET notifications_enabled = $1 WHERE id_two = $2`,
      [enabled, userId]
    );
    res.json({ message: `✅ Notifications ${enabled ? 'enabled' : 'disabled'}.` });
  } catch (err) {
    console.error("❌ toggleNotifications error:", err);
    res.status(500).json({ message: "🔥 Internal server error." });
  }
};

const getUserSessions = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await db.query(
      `SELECT device_id, ip_address, user_agent, login_time
       FROM mekasessions WHERE user_id = $1 ORDER BY login_time DESC LIMIT 15`,
      [userId]
    );

    res.json({ sessions: result.rows });
  } catch (err) {
    console.error("❌ getUserSessions error:", err);
    res.status(500).json({ message: "🔥 Internal error fetching sessions" });
  }
};

const clearUserSessions = async (req, res) => {
  const userId = req.user.id;

  try {
    await db.query(`DELETE FROM mekasessions WHERE user_id = $1`, [userId]);
    res.json({ message: "🧹 All sessions cleared." });
  } catch (err) {
    console.error("❌ clearUserSessions error:", err);
    res.status(500).json({ message: "🔥 Error clearing sessions." });
  }
};

const deleteSingleSession = async (req, res) => {
  const userId = req.user.id;
  const { sessionId } = req.body;

  if (!sessionId) return res.status(400).json({ message: '⚠️ Session ID is required' });

  try {
    const result = await db.query(
      `DELETE FROM mekasessions WHERE id = $1 AND user_id = $2`,
      [sessionId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "❌ Session not found or already deleted." });
    }

    res.json({ message: "✅ Session deleted." });
  } catch (err) {
    console.error("❌ deleteSingleSession error:", err);
    res.status(500).json({ message: "🔥 Server error deleting session" });
  }
};

module.exports = {
  uploadMiddleware,
  uploadProfileImage,
  fetchProfileInfo,
  updateProfileInfo,
  changePassword,
  toggleNotifications,
  getUserSessions,
  clearUserSessions,
  deleteSingleSession
};
