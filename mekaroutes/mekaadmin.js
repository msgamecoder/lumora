const express = require('express');
const router = express.Router();
const { getFlaggedUsers, unflagUser, banUser, sendReviewMessage } = require('../mekacontrollers/mekaadminController');

// Get all flagged accounts
router.get('/flagged', getFlaggedUsers);

// Unflag an account
router.post('/unflag', unflagUser);

// Ban an account
router.post('/ban', banUser);

// Send review message
router.post('/review-message', sendReviewMessage);

module.exports = router;
