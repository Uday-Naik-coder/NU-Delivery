const express = require('express');
const passport = require('passport');
const router = express.Router();
const User = require('../models/User');

// Google OAuth login
router.get('/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    prompt: 'select_account'
  })
);

// Google OAuth callback
router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: '/auth/failed',
    session: true 
  }),
  (req, res) => {
    // Successful authentication
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    
    if (req.user.isNewUser) {
      // Redirect to phone number collection for new users
      res.redirect(`${clientUrl}/complete-profile?new=true`);
    } else {
      res.redirect(`${clientUrl}/dashboard`);
    }
  }
);

// Auth failed
router.get('/failed', (req, res) => {
  res.status(401).json({ 
    message: 'Authentication failed. Only @st.niituniversity.in emails are allowed.' 
  });
});

// Get current user
router.get('/me', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      avatar: req.user.avatar,
      isNewUser: req.user.isNewUser
    });
  } else {
    res.status(401).json({ message: 'Not authenticated' });
  }
});

// Update phone number (for new users)
router.post('/update-phone', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const { phone } = req.body;
  
  if (!phone || phone.length < 10) {
    return res.status(400).json({ message: 'Valid phone number is required' });
  }

  try {
    req.user.phone = phone;
    req.user.isNewUser = false;
    await req.user.save();
    
    res.json({
      message: 'Phone number updated successfully',
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone,
        avatar: req.user.avatar
      }
    });
  } catch (err) {
    console.error('Update phone error:', err);
    res.status(500).json({ message: 'Failed to update phone number' });
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: 'Logout failed' });
    }
    req.session.destroy();
    res.json({ message: 'Logged out successfully' });
  });
});

// Check authentication status
router.get('/status', (req, res) => {
  res.json({ 
    isAuthenticated: req.isAuthenticated(),
    user: req.isAuthenticated() ? {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email
    } : null
  });
});

module.exports = router;