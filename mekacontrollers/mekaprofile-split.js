// mekaprofile-split.js (NEW controller file if you prefer to separate concerns)
const db = require('../mekaconfig/mekadb');
const {
  isValidName,
  isValidUsername,
  isValidEmail,
  isValidPhone,
  isValidWorld
} = require('../mekautils/validators');
const sendLumoraMail = require('../mekautils/mekasendMail');
const MekaShield = require('../mekamodels/mekashield');
function generateCode() {
  const length = [4, 6, 8][Math.floor(Math.random() * 3)];
  let code = '';
  for (let i = 0; i < length; i++) {
    code += Math.floor(Math.random() * 10);
  }
  return code;
}

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

exports.confirmFieldUpdate = async (req, res) => {
  const userId = req.user.id;
  const { code } = req.body;

  if (!userId || !code) return res.status(400).json({ message: 'Missing code.' });

  try {
    const record = await PendingUpdate.findOne({ userId, code });
    if (!record) return res.status(404).json({ message: '❌ Invalid or expired code.' });

    await db.query(`UPDATE mekacore SET ${record.field} = $1 WHERE id_two = $2`, [record.value, userId]);
    await PendingUpdate.deleteOne({ _id: record._id });

    res.json({ ok: true, message: `✅ ${record.field} updated successfully.` });
  } catch (err) {
    console.error('❌ Confirm update error:', err);
    res.status(500).json({ message: '🔥 Internal server error.' });
  }
};

exports.updateFirstName = (req, res) => updateField(req, res, 'first_name', req.body.firstName, isValidName);
exports.updateLastName = (req, res) => updateField(req, res, 'last_name', req.body.lastName, isValidName);
exports.updateUsername = (req, res) => updateField(req, res, 'username', req.body.username, isValidUsername, true);
//exports.updateEmail = (req, res) => updateField(req, res, 'email', req.body.email?.toLowerCase(), isValidEmail, true);
//exports.updatePhone = (req, res) => updateField(req, res, 'phone', req.body.phone, isValidPhone, true);
exports.updateWorld = (req, res) => updateField(req, res, 'world', req.body.world, isValidWorld);

exports.updateEmail = async (req, res) => {
  const userId = req.user.id;
  const email = req.body.email?.toLowerCase();

  if (!userId || !email) return res.status(400).json({ message: 'Missing email' });
  if (!isValidEmail(email)) return res.status(400).json({ message: '📧 Invalid email' });

  try {
    const result = await db.query(`SELECT email, username FROM mekacore WHERE id_two = $1`, [userId]);
    if (!result.rows.length) return res.status(404).json({ message: 'User not found' });

    const currentEmail = result.rows[0].email;
    const username = result.rows[0].username;

    if (currentEmail.trim() === email) return res.status(409).json({ message: '⚠️ Email is the same' });

    const dup = await db.query(`SELECT id_two FROM mekacore WHERE email = $1 AND id_two != $2`, [email, userId]);
    if (dup.rows.length > 0) return res.status(409).json({ message: '❌ Email already in use' });

    const code = generateCode();
    await MekaShield.deleteMany({ userId, field: 'email' });

    await MekaShield.create({
      userId,
      code,
      expiresAt: new Date(Date.now() + 20 * 60 * 1000),
      field: 'email',
      value: email
    });

    await sendLumoraMail(email, code, '2fa', { username });
    res.json({ ok: true, message: '📨 Verification code sent to new email' });

  } catch (err) {
    console.error('❌ updateEmail error:', err);
    res.status(500).json({ message: '🔥 Internal error' });
  }
};

exports.updatePhone = async (req, res) => {
  const userId = req.user.id;
  const phone = req.body.phone;

  if (!userId || !phone) return res.status(400).json({ message: 'Missing phone' });
  if (!isValidPhone(phone)) return res.status(400).json({ message: '📱 Invalid phone' });

  try {
    const result = await db.query(`SELECT phone, username, email FROM mekacore WHERE id_two = $1`, [userId]);
    if (!result.rows.length) return res.status(404).json({ message: 'User not found' });

    const currentPhone = result.rows[0].phone;
    const username = result.rows[0].username;

    if (currentPhone.trim() === phone) return res.status(409).json({ message: '⚠️ Phone is the same' });

    const dup = await db.query(`SELECT id_two FROM mekacore WHERE phone = $1 AND id_two != $2`, [phone, userId]);
    if (dup.rows.length > 0) return res.status(409).json({ message: '❌ Phone already in use' });

    const code = generateCode();
    await MekaShield.deleteMany({ userId, field: 'phone' });

    await MekaShield.create({
      userId,
      code,
      expiresAt: new Date(Date.now() + 20 * 60 * 1000),
      field: 'phone',
      value: phone
    });
     
    await sendLumoraMail(result.rows[0].email, code, '2fa', { username });
    // ⚠️ If you plan to add SMS later, trigger it here
    res.json({ ok: true, message: '📲 Verification code sent to new phone', code });

  } catch (err) {
    console.error('❌ updatePhone error:', err);
    res.status(500).json({ message: '🔥 Internal error' });
  }
};

exports.confirmFieldUpdate = async (req, res) => {
  const userId = req.user.id;
  const { code } = req.body;

  if (!userId || !code) return res.status(400).json({ message: 'Missing code.' });

  try {
    const record = await MekaShield.findOne({ userId, code });
    if (!record) return res.status(404).json({ message: '❌ Invalid or expired code.' });

    await db.query(`UPDATE mekacore SET ${record.field} = $1 WHERE id_two = $2`, [record.value, userId]);
    await MekaShield.deleteOne({ _id: record._id });

    res.json({ ok: true, message: `✅ ${record.field} updated.` });

  } catch (err) {
    console.error('❌ confirmFieldUpdate error:', err);
    res.status(500).json({ message: '🔥 Internal error' });
  }
};
