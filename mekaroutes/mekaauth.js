// mekaroutes/auth.js
const express = require('express');
const router = express.Router();
const pool = require('../mekaconfig/mekadb');

// ⬇️ AUTH CONTROLLERS
const {
  registerUser,
  verifyUser,
  recoverUnverifiedWithPassword
} = require('../mekacontrollers/mekaauthController');

const { loginUser } = require('../mekacontrollers/mekalogin');

const {
  checkUsername,
  checkEmail,
  checkPhone
} = require('../mekacontrollers/mekaauthCheck');

// ⬇️ PROFILE & ACCOUNT SETTINGS
const {
  uploadMiddleware,
  uploadProfileImage,
  fetchProfileInfo,
  changePassword,
  toggleNotifications,
  getUserSessions,
  clearUserSessions,
  deleteSingleSession
} = require('../mekacontrollers/mekaprofile');

const {
  updateFirstName,
  updateLastName,
  updateUsername,
  updateEmail,
  updatePhone,
  updateWorld
} = require('../mekacontrollers/mekaprofile-split');

// ⬇️ FORGOT PASSWORD FLOW
const forgotController = require('../mekacontrollers/mekaforgotController');

// ⬇️ TOKEN VERIFICATION
const { checkTokenValidity } = require('../mekacontrollers/mekacheckToken');

// ⬇️ BAN & SESSION TERMINATION
const { banOnReviewLogout } = require('../mekacontrollers/mekaban');

// ⬇️ PUSH NOTIFICATIONS
const { sendPushNotification } = require('../mekacontrollers/mekafcm');

// ⬇️ MIDDLEWARE
const verifyToken = require('../mekamiddleware/mekaauth');

// ⬇️ 2FA FLOW
const {
  initTwoFA,
  sendTwoFACode,
  verifyTwoFACode,
  regenerateBackupCodes
} = require('../mekacontrollers/mekatwofa');
const { verifyLogin2FA } = require('../mekacontrollers/verifyLogin2FA');

// ⬇️ ACCOUNT SETTINGS (EXTRA)
const {
  reactivateAccount,
  suspendAccount,
  sendDeleteCode,
  deleteAccount,
  getLoginHistory,
  setTimezone,
  updateBio,
  downloadMyData
} = require('../mekacontrollers/mekasettings');

// ⬇️ FEEDBACK
const { submitFeedback } = require('../mekacontrollers/mekafeedback');


// ===============================
// ✅ AUTHENTICATION ROUTES
// ===============================
router.post('/meka/register', registerUser);
router.post('/meka/verify', verifyUser);
router.post('/meka/login', loginUser);
router.post('/meka/check-username', checkUsername);
router.post('/meka/check-email', checkEmail);
router.post('/meka/check-phone', checkPhone);
router.post('/meka/recover', recoverUnverifiedWithPassword);


// ===============================
// 🔑 PASSWORD RECOVERY
// ===============================
router.post('/meka/forgot', forgotController.sendResetCode);
router.post('/meka/reset', forgotController.resetPassword);
router.post('/meka/check-token', checkTokenValidity);


// ===============================
// 🚫 BAN OR SESSION TERMINATION
// ===============================
router.post('/meka/ban-on-review-logout', banOnReviewLogout);


// ===============================
// 📤 PUSH NOTIFICATIONS
// ===============================
router.post('/meka/send-push', sendPushNotification);


// ===============================
// 🖼️ PROFILE SETTINGS
// ===============================
router.post('/meka/upload-profile', uploadMiddleware, uploadProfileImage);
router.post('/meka/profile-info', fetchProfileInfo);
router.post('/meka/update-firstname', verifyToken, updateFirstName);
router.post('/meka/update-lastname', verifyToken, updateLastName);
router.post('/meka/update-username', verifyToken, updateUsername);
router.post('/meka/update-email', verifyToken, updateEmail);
router.post('/meka/update-phone', verifyToken, updatePhone);
router.post('/meka/update-world', verifyToken, updateWorld);
router.post('/meka/change-password', verifyToken, changePassword);
router.post('/meka/toggle-notifications', verifyToken, toggleNotifications);


// ===============================
// 🧾 SESSION MANAGEMENT
// ===============================
router.post('/meka/sessions', verifyToken, getUserSessions);
router.post('/meka/clear-sessions', verifyToken, clearUserSessions);
router.post('/meka/delete-session', verifyToken, deleteSingleSession);


// ===============================
// 🔐 TWO-FACTOR AUTH (2FA)
// ===============================
router.post('/meka/send-2fa-code', sendTwoFACode);
router.post('/meka/init-2fa', verifyToken, initTwoFA);
router.post('/meka/verify-2fa-code', verifyTwoFACode);
router.post('/meka/regenerate-backup-codes', verifyToken, regenerateBackupCodes);
router.post('/meka/verify-login-2fa', verifyLogin2FA);


// ===============================
// ⚙️ ADVANCED ACCOUNT SETTINGS
// ===============================
router.post('/meka/reactivate-account', verifyToken, reactivateAccount);
router.post('/meka/suspend-account', verifyToken, suspendAccount);
router.post('/meka/send-delete-code', verifyToken, sendDeleteCode);
router.post('/meka/delete-account', verifyToken, deleteAccount);
router.post('/meka/login-history', verifyToken, getLoginHistory);
router.post('/meka/set-timezone', verifyToken, setTimezone);
router.post('/meka/update-bio', verifyToken, updateBio);
router.get('/meka/download-my-data', verifyToken, downloadMyData);


// ===============================
// 💬 FEEDBACK
// ===============================
router.post('/meka/submit-feedback', verifyToken, submitFeedback);


// ===============================
// 🔄 SAVE FCM TOKEN
// ===============================
router.post('/meka/save-fcm', async (req, res) => {
  const { fcmToken, userId } = req.body;

  // 👇 Debug logs
  console.log("📥 /meka/save-fcm called:");
  console.log("➡️ userId:", userId);
  console.log("➡️ fcmToken:", fcmToken);

  if (!userId || !fcmToken) {
    return res.status(400).json({ message: 'Missing user or FCM token' });
  }

  try {
    await pool.query(`UPDATE mekacore SET fcm_token = $1 WHERE id_two = $2`, [fcmToken, userId]);
    console.log("✅ FCM token updated in DB.");
    res.json({ message: '✅ FCM token saved' });
  } catch (err) {
    console.error('FCM save error:', err);
    res.status(500).json({ message: 'Internal error saving FCM token' });
  }
});

module.exports = router;

