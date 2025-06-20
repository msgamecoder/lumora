// mekaroutes/auth.js
const express = require('express');
const router = express.Router();
const { registerUser, verifyUser } = require('../mekacontrollers/mekaauthController');
const { loginUser } = require('../mekacontrollers/mekalogin');

router.post('/meka/register', registerUser);
router.get('/mekaa/verify/:token', verifyUser);
router.post('/meka/login', loginUser);
module.exports = router;