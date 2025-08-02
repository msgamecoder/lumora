// mekaroutes/auth.js
const express = require('express');
const router = express.Router();
const pool = require('../mekaconfig/mekadb');
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
const {
  uploadMiddleware,
  uploadProfileImage,
  fetchProfileInfo,
  updateProfileInfo,
  changePassword,
  toggleNotifications,
  getUserSessions,
  clearUserSessions,
  deleteSingleSession
} = require('../mekacontrollers/mekaprofile');
const forgotController = require('../mekacontrollers/mekaforgotController');
const { checkTokenValidity } = require('../mekacontrollers/mekacheckToken');
const { banOnReviewLogout } = require('../mekacontrollers/mekaban');
const { sendPushNotification } = require('../mekacontrollers/mekafcm');
const verifyToken = require('../mekamiddleware/mekaauth');
const { initTwoFA, sendTwoFACode, verifyTwoFACode } = require('../mekacontrollers/mekatwofa');
const { regenerateBackupCodes } = require('../mekacontrollers/mekatwofa');
const { verifyLogin2FA } = require('../mekacontrollers/verifyLogin2FA');
const { reactivateAccount, suspendAccount } = require('../mekacontrollers/mekasettings');

router.post('/meka/register', registerUser);
router.post('/meka/verify', verifyUser);
router.post('/meka/login', loginUser);
router.post('/meka/check-username', checkUsername);
router.post('/meka/check-email', checkEmail);
router.post('/meka/check-phone', checkPhone);
router.post('/meka/recover', recoverUnverifiedWithPassword);

// Forgot password routes
router.post('/meka/forgot', forgotController.sendResetCode);
router.post('/meka/reset', forgotController.resetPassword);
router.post('/meka/check-token', checkTokenValidity);

router.post("/meka/ban-on-review-logout", banOnReviewLogout);
router.post('/meka/send-push', sendPushNotification);
router.post("/meka/upload-profile", uploadMiddleware, uploadProfileImage);
router.post("/meka/profile-info", fetchProfileInfo);
router.post("/meka/update-profile", verifyToken, updateProfileInfo);
router.post("/meka/change-password", verifyToken, changePassword);
router.post("/meka/toggle-notifications", verifyToken, toggleNotifications);
router.post("/meka/sessions", verifyToken, getUserSessions);
router.post("/meka/clear-sessions", verifyToken, clearUserSessions);
router.post("/meka/delete-session", verifyToken, deleteSingleSession);
router.post('/meka/send-2fa-code', sendTwoFACode);
router.post('/meka/init-2fa', verifyToken, initTwoFA);
router.post('/meka/verify-2fa-code', verifyTwoFACode);
router.post('/meka/regenerate-backup-codes', verifyToken, regenerateBackupCodes);
router.post('/meka/verify-login-2fa', verifyLogin2FA);
router.post('/meka/reactivate-account', verifyToken, reactivateAccount);
router.post('/meka/suspend-account', verifyToken, suspendAccount);

router.post('/meka/save-fcm', async (req, res) => {
  const { fcmToken, userId } = req.body;

  // 👇 Add this to debug what’s coming in
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






