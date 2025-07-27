// mekaroutes/auth.js
const express = require('express');
const router = express.Router();
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
const forgotController = require('../mekacontrollers/mekaforgotController');
const { checkTokenValidity } = require('../mekacontrollers/mekacheckToken');
const { banOnReviewLogout } = require('../mekacontrollers/mekaban');
const { sendPushNotification } = require('../mekacontrollers/mekafcm');

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

router.post("/meka/save-fcm-token", async (req, res) => {
  const { userId, fcmToken } = req.body;

  console.log("📥 Save FCM Body:", req.body);
  if (!userId || !fcmToken) {
    console.log("❌ Missing field:", { userId, fcmToken });
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    await pool.query(
      `UPDATE mekacore SET fcm_token = $1 WHERE id_two = $2`,
      [fcmToken, userId]
    );

    console.log("✅ FCM Token saved for:", userId);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error saving FCM token:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
