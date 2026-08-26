const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');

/**
 * GET /protected/profile
 * Returns authenticated user's profile details (protected by requireAuth middleware).
 */
router.get('/profile', requireAuth, (req, res) => {
  const user = req.user;
  return res.status(200).json({
    message: 'Profile retrieved successfully',
    user: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      app_metadata: user.app_metadata,
      user_metadata: user.user_metadata,
    },
  });
});

/**
 * GET /protected/dashboard
 * Additional protected endpoint confirming middleware reusability.
 */
router.get('/dashboard', requireAuth, (req, res) => {
  return res.status(200).json({
    message: `Welcome to your private dashboard, ${req.user.email}!`,
    user_id: req.user.id,
    status: 'Active',
  });
});

module.exports = router;
