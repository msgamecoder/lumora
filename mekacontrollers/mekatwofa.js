// mekacontrollers/mekatwofa.js
const bcrypt = require('bcryptjs');
const db = require('../mekaconfig/mekadb');
const MekaShield = require('../mekamodels/mekashield');
const sendLumoraMail = require('../mekautils/mekasendMail');

// helpers
const ALLOWED_RECOVERY_DOMAINS = new Set(['gmail.com', 'yahoo.com', 'outlook.com']);

function wordCount(txt = '') {
  return (txt.trim().split(/\s+/).filter(Boolean)).length;
}

function isValidHint(hint, pin) {
  if (!hint) return true; // optional
  const wc = wordCount(hint);
  if (wc < 3 || wc > 30) return false;
  // must not equal or contain the pin digits
  if (pin && (hint.trim() === pin || hint.includes(pin))) return false;
  return true;
}

function isFourDigitPin(p) {
  return /^\d{4}$/.test(String(p || ''));
}

function normalizeEmail(e = '') {
  return e.trim().toLowerCase();
}

function emailDomainOk(email) {
  const m = email.match(/@([^@]+)$/);
  if (!m) return false;
  const domain = m[1].toLowerCase();
  return ALLOWED_RECOVERY_DOMAINS.has(domain);
}

// Check if a recovery email is already used anywhere in mekacore (as main email or recovery)
async function recoveryEmailInUse(email) {
  const q = await db.query(
    `SELECT 1 FROM mekacore WHERE LOWER(email) = LOWER($1) OR LOWER(twofa_recovery_email) = LOWER($1) LIMIT 1`,
    [email]
  );
  if (q.rows.length > 0) return true;

  // also check if any pending code is holding it (not strictly required, but prevents race)
  const pending = await MekaShield.findOne({ field: 'recovery_email', value: email });
  return !!pending;
}

/**
 * Send a 6-digit verification code to:
 *  - the user's account email (default), OR
 *  - a proposed recovery email (when adding/changing recovery)
 *
 * Body:
 *  {
 *    action: 'enable' | 'disable' | 'setpin' | 'addrecovery' | 'changerecovery',
 *    recoveryEmail?: string  // required for addrecovery / changerecovery
 *  }
 */
exports.sendTwoFACode = async (req, res) => {
  try {
    const userId = req.user.id;
    const { action, recoveryEmail } = req.body;

    if (!action) {
      return res.status(400).json({ message: '❌ Missing action' });
    }

    // Get user base data
    const userQuery = await db.query(
      'SELECT email, username FROM mekacore WHERE id_two = $1',
      [userId]
    );
    if (userQuery.rows.length === 0) {
      return res.status(404).json({ message: '❌ User not found' });
    }
    const { email: accountEmail, username } = userQuery.rows[0];
    if (!accountEmail || !username) {
      return res.status(400).json({ message: '❌ Missing user email or username' });
    }

    // for recovery actions, we validate the proposed email and send the code to it
    let targetEmail = accountEmail;
    let field = undefined;
    let value = undefined;

    if (action === 'addrecovery' || action === 'changerecovery') {
      if (!recoveryEmail) {
        return res.status(400).json({ message: '❌ recoveryEmail required for this action' });
      }
      const norm = normalizeEmail(recoveryEmail);
      if (!emailDomainOk(norm)) {
        return res.status(400).json({ message: '❌ Only gmail.com, yahoo.com, and outlook.com are allowed' });
      }
      const inUse = await recoveryEmailInUse(norm);
      if (inUse) {
        return res.status(409).json({ message: '❌ This recovery email is already in use' });
      }
      targetEmail = norm;
      field = 'recovery_email';
      value = norm;
    }

    // generate and store code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await MekaShield.deleteMany({ userId, action }); // clear old codes of same action
    await MekaShield.create({
      userId,
      code,
      action,
      field,
      value,
      expiresAt: new Date(Date.now() + 20 * 60 * 1000) // 20 min
    });

    await sendLumoraMail(targetEmail, code, "2fa", { username });

    res.status(200).json({ message: '✅ Verification code sent' });
  } catch (err) {
    console.error("❌ sendTwoFACode error:", err);
    res.status(500).json({ message: '🔥 Could not send verification code' });
  }
};

/**
 * Verify the email code and perform the requested action.
 * Actions:
 *  - enable:   requires newPin, optional hint
 *  - disable:  clears pin, hint, recovery
 *  - setpin:   requires newPin, optional hint; prevents same-as-old
 *  - addrecovery / changerecovery: requires recoveryEmail (must match what code was sent to)
 *
 * Body:
 *  {
 *    code: string,
 *    action: 'enable'|'disable'|'setpin'|'addrecovery'|'changerecovery',
 *    newPin?: string,
 *    hint?: string,
 *    recoveryEmail?: string
 *  }
 */
exports.verifyTwoFACode = async (req, res) => {
  const userId = req.user.id;
  const { code, action, newPin, hint, recoveryEmail } = req.body;

  if (!code) {
    return res.status(400).json({ message: '❌ Missing verification code' });
  }
  if (!action) {
    return res.status(400).json({ message: '❌ Missing action' });
  }

  try {
    const found = await MekaShield.findOne({ userId, action });
    if (!found || found.code !== code) {
      return res.status(401).json({ message: "❌ Invalid or expired code" });
    }

    // Remove the used code
    await MekaShield.deleteOne({ _id: found._id });

    // pull current db state
    const userRowQ = await db.query(
      `SELECT twofa_pin, twofa_enabled, twofa_pin_hint FROM mekacore WHERE id_two = $1`,
      [userId]
    );
    if (userRowQ.rows.length === 0) {
      return res.status(404).json({ message: '❌ User not found' });
    }
    const current = userRowQ.rows[0];

    if (action === 'enable') {
      if (!isFourDigitPin(newPin)) {
        return res.status(400).json({ message: '❌ PIN must be exactly 4 digits' });
      }
      if (!isValidHint(hint, newPin)) {
        return res.status(400).json({ message: '❌ Invalid hint: 3–30 words and must not equal/contain the PIN' });
      }

      const hashedPin = await bcrypt.hash(newPin, 10);
      await db.query(
        `UPDATE mekacore
           SET twofa_pin = $1,
               twofa_enabled = true,
               twofa_verified = true,
               twofa_pin_hint = $2
         WHERE id_two = $3`,
        [hashedPin, hint ? hint.trim() : null, userId]
      );
      return res.json({ message: '✅ 2FA enabled and PIN set' });
    }

    if (action === 'disable') {
      await db.query(
        `UPDATE mekacore
            SET twofa_enabled = false,
                twofa_verified = false,
                twofa_pin = NULL,
                twofa_pin_hint = NULL,
                twofa_recovery_email = NULL
          WHERE id_two = $1`,
        [userId]
      );
      return res.json({ message: '✅ 2FA disabled (PIN, hint, recovery cleared)' });
    }

    if (action === 'setpin') {
      if (!isFourDigitPin(newPin)) {
        return res.status(400).json({ message: '❌ PIN must be exactly 4 digits' });
      }
      // prevent same-as-old even though FE doesn't send old pin
      if (current.twofa_pin) {
        const same = await bcrypt.compare(newPin, current.twofa_pin);
        if (same) {
          return res.status(400).json({ message: '❌ New PIN cannot be the same as the old PIN' });
        }
      }
      if (hint !== undefined && !isValidHint(hint, newPin)) {
        return res.status(400).json({ message: '❌ Invalid hint: 3–30 words and must not equal/contain the PIN' });
      }

      const hashedPin = await bcrypt.hash(newPin, 10);

      // if hint provided: set/clear; if not provided: keep existing as-is
      if (hint !== undefined) {
        const cleanHint = (hint && hint.trim().length) ? hint.trim() : null;
        await db.query(
          `UPDATE mekacore SET twofa_pin = $1, twofa_pin_hint = $2 WHERE id_two = $3`,
          [hashedPin, cleanHint, userId]
        );
      } else {
        await db.query(
          `UPDATE mekacore SET twofa_pin = $1 WHERE id_two = $2`,
          [hashedPin, userId]
        );
      }

      return res.json({ message: '✅ PIN updated successfully' });
    }

    if (action === 'addrecovery' || action === 'changerecovery') {
      if (!recoveryEmail) {
        return res.status(400).json({ message: '❌ recoveryEmail required' });
      }
      const norm = normalizeEmail(recoveryEmail);

      // must match what the code was issued for
      if (!(found.field === 'recovery_email' && found.value === norm)) {
        return res.status(400).json({ message: '❌ Recovery email mismatch for this code' });
      }

      if (!emailDomainOk(norm)) {
        return res.status(400).json({ message: '❌ Only gmail.com, yahoo.com, and outlook.com are allowed' });
      }
      const inUse = await recoveryEmailInUse(norm);
      if (inUse) {
        return res.status(409).json({ message: '❌ This recovery email is already in use' });
      }

      await db.query(
        `UPDATE mekacore SET twofa_recovery_email = $1 WHERE id_two = $2`,
        [norm, userId]
      );
      const msg = action === 'addrecovery' ? '✅ Recovery email added' : '✅ Recovery email changed';
      return res.json({ message: msg });
    }

    return res.status(400).json({ message: '⚠️ Unknown action type' });
  } catch (err) {
    console.error("❌ verifyTwoFACode error:", err);
    res.status(500).json({ message: '🔥 Verification failed' });
  }
};

/**
 * Check PIN for sensitive actions after 2FA is enabled
 */
exports.verifyPin = async (req, res) => {
  const userId = req.user.id;
  const { pin } = req.body;

  if (!pin) {
    return res.status(400).json({ message: '❌ Missing PIN' });
  }

  try {
    const result = await db.query(
      `SELECT twofa_pin FROM mekacore WHERE id_two = $1 AND twofa_enabled = true`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: '❌ 2FA not enabled for this account' });
    }

    const isMatch = await bcrypt.compare(pin, result.rows[0].twofa_pin);
    if (!isMatch) {
      return res.status(401).json({ message: '❌ Incorrect PIN' });
    }

    return res.json({ message: '✅ PIN verified' });
  } catch (err) {
    console.error("❌ verifyPin error:", err);
    res.status(500).json({ message: '🔥 PIN verification failed' });
  }
};

// Get 2FA status (enabled, recovery email set)
exports.getTwoFAStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await db.query(
      `SELECT twofa_enabled, twofa_recovery_email 
         FROM mekacore 
        WHERE id_two = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: '❌ User not found' });
    }

    const row = result.rows[0];
    res.json({
      ok: true,
      data: {
        enabled: row.twofa_enabled === true,
        hasRecovery: !!row.twofa_recovery_email
      }
    });
  } catch (err) {
    console.error('❌ getTwoFAStatus error:', err);
    res.status(500).json({ message: '🔥 Could not fetch 2FA status' });
  }
};
