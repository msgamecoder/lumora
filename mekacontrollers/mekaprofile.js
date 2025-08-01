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

exports.updateProfileInfo = async (req, res) => {
  const userId = req.user.id;
  const { firstName, lastName, username, email, phone, world } = req.body;

  if (!userId) return res.status(400).json({ message: 'Missing user ID' });

  const updates = [];
  const values = [];
  let i = 1;

  try {
    // ✅ Conditionally validate and prepare update
    if (firstName !== undefined) {
      if (!isValidName(firstName)) return res.status(400).json({ message: '❌ First name must be only letters (max 33).' });
      updates.push(`first_name = $${i++}`);
      values.push(firstName);
    }

    if (lastName !== undefined) {
      if (!isValidName(lastName)) return res.status(400).json({ message: '❌ Last name must be only letters (max 33).' });
      updates.push(`last_name = $${i++}`);
      values.push(lastName);
    }

    if (username !== undefined) {
      if (!isValidUsername(username)) return res.status(400).json({ message: '❌ Invalid username format.' });

      const userCheck = await db.query(`SELECT id_two FROM mekacore WHERE username = $1 AND id_two != $2`, [username, userId]);
      if (userCheck.rows.length > 0) return res.status(409).json({ message: '❌ Username already taken.' });

      updates.push(`username = $${i++}`);
      values.push(username);
    }

    if (email !== undefined) {
      if (!isValidEmail(email)) return res.status(400).json({ message: '📧 Invalid email format.' });

      const emailCheck = await db.query(`SELECT id_two FROM mekacore WHERE email = $1 AND id_two != $2`, [email, userId]);
      if (emailCheck.rows.length > 0) return res.status(409).json({ message: '❌ Email already in use.' });

      updates.push(`email = $${i++}`);
      values.push(email.toLowerCase());
    }

    if (phone !== undefined) {
      if (!isValidPhone(phone)) return res.status(400).json({ message: '📱 Invalid phone number.' });

      const phoneCheck = await db.query(`SELECT id_two FROM mekacore WHERE phone = $1 AND id_two != $2`, [phone, userId]);
      if (phoneCheck.rows.length > 0) return res.status(409).json({ message: '❌ Phone number already in use.' });

      updates.push(`phone = $${i++}`);
      values.push(phone.trim());
    }

    if (world !== undefined) {
      if (!['one', 'two'].includes(world)) return res.status(400).json({ message: '🌍 Invalid world: one or two only.' });
      updates.push(`world = $${i++}`);
      values.push(world);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: '⚠️ No valid fields provided for update.' });
    }

    values.push(userId); // for WHERE clause
    const query = `UPDATE mekacore SET ${updates.join(', ')} WHERE id_two = $${i}`;
    await db.query(query, values);

    res.json({ message: "✅ Profile updated." });

  } catch (err) {
    console.error("❌ Profile update error:", err);
    res.status(500).json({ message: "🔥 Internal server error." });
  }
};

module.exports = {
  uploadMiddleware,
  uploadProfileImage,
  fetchProfileInfo
};
