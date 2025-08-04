//mekaprofile.js
const cloudinary = require('../mekaconfig/mekacloud');
const db = require('../mekaconfig/mekadb');
const multer = require('multer');
const {
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
  changePassword,
  toggleNotifications,
  getUserSessions,
  clearUserSessions,
  deleteSingleSession
};
