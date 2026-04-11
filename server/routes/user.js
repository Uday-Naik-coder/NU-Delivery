const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Order = require('../models/Order');

// Middleware to check authentication
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Authentication required' });
};

// Get current user profile
router.get('/profile', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-googleId');
    
    // Get order statistics
    const activeOrders = await Order.countDocuments({
      userId: req.user._id,
      status: 'active'
    });

    const completedDeliveries = await Order.countDocuments({
      'acceptedOffer.userId': req.user._id,
      status: 'completed'
    });

    res.json({
      user,
      stats: {
        activeOrders,
        completedDeliveries
      }
    });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/profile', isAuthenticated, async (req, res) => {
  try {
    const { phone } = req.body;

    if (phone && phone.length < 10) {
      return res.status(400).json({ message: 'Valid phone number required' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { phone },
      { new: true }
    ).select('-googleId');

    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// Get user's active orders count
router.get('/active-orders-count', isAuthenticated, async (req, res) => {
  try {
    const count = await Order.countDocuments({
      userId: req.user._id,
      status: 'active'
    });

    res.json({ count });
  } catch (err) {
    console.error('Get active orders count error:', err);
    res.status(500).json({ message: 'Failed to fetch count' });
  }
});

module.exports = router;