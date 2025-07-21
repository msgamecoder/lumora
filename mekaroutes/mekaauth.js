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
const {
  banOnReviewLogout,
  getReviewStartTime // ✅ add this line
} = require('../mekacontrollers/mekaban');

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

// ✅ NEW: Add the GET route here
router.get("/meka/review-start-time", getReviewStartTime);

module.exports = router;
