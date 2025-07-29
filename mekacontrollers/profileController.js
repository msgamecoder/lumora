const cloudinary = require('../mekaconfig/mekacloud');
const db = require('../mekaconfig/mekadb'); // PostgreSQL connection
const multer = require('multer');

const storage = multer.memoryStorage();
const uploadMiddleware = multer({ storage }).single('image');

const uploadProfileImage = async (req, res) => {
  try {
    const file = req.file;
    if (!file || !file.mimetype.match(/^image\/(png|jpg|jpeg)$/)) {
      return res.status(400).json({ ok: false, message: "Only PNG and JPG allowed" });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'profile_image',
        public_id: 'me',
        overwrite: true,
        resource_type: 'image'
      },
      (err, result) => {
        if (err) {
          console.error('❌ Cloudinary error:', err);
          return res.status(500).json({ ok: false, message: 'Upload failed' });
        }
        return res.status(200).json({ ok: true, imageUrl: result.secure_url });
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
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ ok: false, message: "User ID required" });

    const result = await db.query(
      "SELECT username, email, profile_image FROM users WHERE id = $1",
      [userId]
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

// Export all
module.exports = {
  uploadMiddleware,
  uploadProfileImage,
  fetchProfileInfo
};
