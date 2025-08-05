// mekaprofile-split.js (NEW controller file if you prefer to separate concerns)
const db = require('../mekaconfig/mekadb');
const {
  isValidName,
  isValidUsername,
  isValidEmail,
  isValidPhone,
  isValidWorld
} = require('../mekautils/validators');

// Generic update helper
const updateField = async (req, res, column, value, validator, checkUnique = false) => {
  const userId = req.user.id;
  if (!userId || value === undefined) return res.status(400).json({ message: 'Missing data' });

  if (!validator(value)) return res.status(400).json({ message: `❌ Invalid ${column}` });

  try {
    const current = await db.query(`SELECT ${column} FROM mekacore WHERE id_two = $1`, [userId]);
    if (current.rows.length === 0) return res.status(404).json({ message: 'User not found' });

    if ((current.rows[0][column] || '').trim() === value.trim()) {
      return res.status(409).json({ message: `⚠️ ${column} is the same as current.` });
    }

    // Unique check (for username, email, phone)
    if (checkUnique) {
      const query = `SELECT id_two FROM mekacore WHERE ${column} = $1 AND id_two != $2`;
      const exists = await db.query(query, [value.trim(), userId]);
      if (exists.rows.length > 0) return res.status(409).json({ message: `❌ ${column} already in use.` });
    }

    await db.query(`UPDATE mekacore SET ${column} = $1 WHERE id_two = $2`, [value.trim(), userId]);
    res.json({ ok: true, message: `✅ ${column} updated successfully.` });
  } catch (err) {
    console.error(`❌ Error updating ${column}:`, err);
    res.status(500).json({ message: '🔥 Internal server error.' });
  }
};

exports.updateFirstName = (req, res) => updateField(req, res, 'first_name', req.body.firstName, isValidName);
exports.updateLastName = (req, res) => updateField(req, res, 'last_name', req.body.lastName, isValidName);
exports.updateUsername = (req, res) => updateField(req, res, 'username', req.body.username, isValidUsername, true);
exports.updateEmail = (req, res) => updateField(req, res, 'email', req.body.email?.toLowerCase(), isValidEmail, true);
exports.updatePhone = (req, res) => updateField(req, res, 'phone', req.body.phone, isValidPhone, true);
exports.updateWorld = (req, res) => updateField(req, res, 'world', req.body.world, isValidWorld);
