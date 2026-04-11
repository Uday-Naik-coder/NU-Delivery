const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Multer configuration for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = uuidv4() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images are allowed.'), false);
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Middleware to check authentication
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Authentication required' });
};

// Get all active orders (excluding expired and accepted)
router.get('/', async (req, res) => {
  try {
    const { platform, urgent } = req.query;
    const now = new Date();

    // Check and mark expired orders (orders that were never accepted and past expectedTime)
    await Order.updateMany(
      {
        status: 'active',
        expectedTime: { $lt: now }
      },
      {
        $set: { 
          status: 'expired',
          deliveryCompletedAt: now
        }
      }
    );
    
    let query = {
      status: 'active',
      expectedTime: { $gt: now }
    };

    if (platform && platform !== 'all') {
      query.platform = platform;
    }

    let orders = await Order.find(query)
      .populate('userId', 'name email')
      .populate('offers.userId', 'name email')
      .sort({ expectedTime: 1 });

    // Add urgency flag and time remaining
    orders = orders.map(order => {
      const orderObj = order.toObject();
      const timeRemaining = new Date(order.expectedTime) - now;
      const minutesRemaining = Math.floor(timeRemaining / (1000 * 60));
      
      orderObj.timeRemaining = minutesRemaining;
      orderObj.isUrgent = minutesRemaining < 15;
      
      return orderObj;
    });

    // Filter by urgency if requested
    if (urgent === 'true') {
      orders = orders.filter(order => order.isUrgent);
    }

    res.json(orders);
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

// Create new order
router.post('/', isAuthenticated, upload.single('image'), async (req, res) => {
  try {
    const { platform, items, expectedTime, note } = req.body;
    
    if (!platform || !expectedTime) {
      return res.status(400).json({ 
        message: 'Platform and expected time are required' 
      });
    }

    const order = new Order({
      userId: req.user._id,
      platform,
      items,
      expectedTime: new Date(expectedTime),
      note: note || '',
      image: req.file ? `/uploads/${req.file.filename}` : '',
      status: 'active',
      offers: []
    });

    await order.save();

    // Populate user data before emitting
    const populatedOrder = await Order.findById(order._id)
      .populate('userId', 'name email')
      .lean();
    
    // Add time remaining
    const now = new Date();
    const timeRemaining = new Date(populatedOrder.expectedTime) - now;
    populatedOrder.timeRemaining = Math.floor(timeRemaining / (1000 * 60));
    populatedOrder.isUrgent = populatedOrder.timeRemaining < 15;

    // Emit new order event
    const io = req.app.get('io');
    io.emit('newOrder', populatedOrder);

    res.status(201).json({
      message: 'Order created successfully',
      order: populatedOrder
    });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ message: 'Failed to create order' });
  }
});

// Get single order
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('userId', 'name email phone')
      .populate('offers.userId', 'name email')
      .populate('acceptedOffer.userId', 'name email phone');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const orderObj = order.toObject();
    const now = new Date();
    const timeRemaining = new Date(order.expectedTime) - now;
    orderObj.timeRemaining = Math.floor(timeRemaining / (1000 * 60));
    orderObj.isUrgent = orderObj.timeRemaining < 15;

    res.json(orderObj);
  } catch (err) {
    console.error('Get order error:', err);
    res.status(500).json({ message: 'Failed to fetch order' });
  }
});

// Update order (owner only)
router.put('/:id', isAuthenticated, upload.single('image'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this order' });
    }

    if (order.status !== 'active') {
      return res.status(400).json({ 
        message: 'Cannot edit order that is not active' 
      });
    }

    const { platform, items, expectedTime, note } = req.body;

    if (platform) order.platform = platform;
    if (items) order.items = items;
    if (expectedTime) order.expectedTime = new Date(expectedTime);
    if (note !== undefined) order.note = note;
    if (req.file) order.image = `/uploads/${req.file.filename}`;

    await order.save();

    const updatedOrder = await Order.findById(order._id)
      .populate('userId', 'name email')
      .populate('offers.userId', 'name email')
      .lean();

    const now = new Date();
    const timeRemaining = new Date(updatedOrder.expectedTime) - now;
    updatedOrder.timeRemaining = Math.floor(timeRemaining / (1000 * 60));
    updatedOrder.isUrgent = updatedOrder.timeRemaining < 15;

    // Emit update event
    const io = req.app.get('io');
    io.emit('orderUpdated', updatedOrder);

    res.json({
      message: 'Order updated successfully',
      order: updatedOrder
    });
  } catch (err) {
    console.error('Update order error:', err);
    res.status(500).json({ message: 'Failed to update order' });
  }
});

// Delete order (owner only)
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this order' });
    }

    await Order.findByIdAndDelete(req.params.id);

    // Emit delete event
    const io = req.app.get('io');
    io.emit('orderDeleted', { orderId: req.params.id });

    res.json({ message: 'Order deleted successfully' });
  } catch (err) {
    console.error('Delete order error:', err);
    res.status(500).json({ message: 'Failed to delete order' });
  }
});

// Add delivery offer
router.post('/:id/offers', isAuthenticated, async (req, res) => {
  try {
    const { price, phone } = req.body;
    const orderId = req.params.id;

    if (!price || !phone) {
      return res.status(400).json({ 
        message: 'Price and phone number are required' 
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.userId.toString() === req.user._id.toString()) {
      return res.status(400).json({ 
        message: 'Cannot offer delivery on your own order' 
      });
    }

    if (order.status !== 'active') {
      return res.status(400).json({ 
        message: 'Cannot offer delivery on inactive order' 
      });
    }

    // Check if user already made an offer
    const existingOffer = order.offers.find(
      offer => offer.userId.toString() === req.user._id.toString()
    );

    if (existingOffer) {
      return res.status(400).json({ 
        message: 'You have already made an offer on this order' 
      });
    }

    const newOffer = {
      userId: req.user._id,
      price: Number(price),
      phone,
      createdAt: new Date()
    };

    order.offers.push(newOffer);
    await order.save();

    // Populate offer with user data
    const populatedOrder = await Order.findById(orderId)
      .populate('userId', 'name email')
      .populate('offers.userId', 'name email')
      .lean();

    const now = new Date();
    const timeRemaining = new Date(populatedOrder.expectedTime) - now;
    populatedOrder.timeRemaining = Math.floor(timeRemaining / (1000 * 60));
    populatedOrder.isUrgent = populatedOrder.timeRemaining < 15;

    // Emit new offer event
    const io = req.app.get('io');
    io.emit('newOffer', {
      orderId,
      offer: populatedOrder.offers.find(
        o => o.userId._id.toString() === req.user._id.toString()
      )
    });

    res.status(201).json({
      message: 'Offer added successfully',
      order: populatedOrder
    });
  } catch (err) {
    console.error('Add offer error:', err);
    res.status(500).json({ message: 'Failed to add offer' });
  }
});

// Accept offer (order owner only)
router.post('/:id/accept-offer', isAuthenticated, async (req, res) => {
  try {
    const { offerUserId } = req.body;
    const orderId = req.params.id;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        message: 'Only order owner can accept offers' 
      });
    }

    if (order.status !== 'active') {
      return res.status(400).json({ message: 'Order is not active' });
    }

    const selectedOffer = order.offers.find(
      offer => offer.userId.toString() === offerUserId
    );

    if (!selectedOffer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    // Update order status
    order.status = 'accepted';
    order.acceptedOffer = {
      userId: selectedOffer.userId,
      price: selectedOffer.price,
      phone: selectedOffer.phone,
      acceptedAt: new Date()
    };
    order.deliveryStatus = 'pending';
    order.deliveryStartedAt = new Date();

    await order.save();

    // Populate with full user details
    const populatedOrder = await Order.findById(orderId)
      .populate('userId', 'name email phone')
      .populate('acceptedOffer.userId', 'name email phone')
      .lean();

    // Emit offer accepted event
    const io = req.app.get('io');
    io.emit('offerAccepted', {
      orderId,
      order: populatedOrder,
      acceptedBy: {
        userId: selectedOffer.userId,
        name: populatedOrder.acceptedOffer.userId.name,
        phone: populatedOrder.acceptedOffer.userId.phone
      }
    });

    res.json({
      message: 'Offer accepted successfully',
      order: populatedOrder
    });
  } catch (err) {
    console.error('Accept offer error:', err);
    res.status(500).json({ message: 'Failed to accept offer' });
  }
});

// Get user's orders (both created and delivered)
router.get('/user/history', isAuthenticated, async (req, res) => {
  try {
    const now = new Date();

    // Check and mark expired orders (orders that were never accepted and past expectedTime)
    await Order.updateMany(
      {
        userId: req.user._id,
        status: 'active',
        expectedTime: { $lt: now }
      },
      {
        $set: { 
          status: 'expired',
          deliveryCompletedAt: now
        }
      }
    );

    // Orders created by user (including completed, expired, and cancelled)
    const createdOrders = await Order.find({ 
      userId: req.user._id 
    })
      .populate('offers.userId', 'name email phone')
      .populate('acceptedOffer.userId', 'name email phone')
      .populate('cancelledBy', 'name email phone')
      .sort({ createdAt: -1 });

    // Orders delivered by user (including cancelled orders this user accepted)
    const deliveredOrders = await Order.find({
      'acceptedOffer.userId': req.user._id,
      status: { $in: ['accepted', 'completed', 'cancelled'] }
    })
      .populate('userId', 'name email phone')
      .populate('cancelledBy', 'name email phone')
      .sort({ 'acceptedOffer.acceptedAt': -1 });

    res.json({
      created: createdOrders,
      delivered: deliveredOrders
    });
  } catch (err) {
    console.error('Get history error:', err);
    res.status(500).json({ message: 'Failed to fetch order history' });
  }
});

// Get delivery person's accepted orders
router.get('/delivery/accepted', isAuthenticated, async (req, res) => {
  try {
    const now = new Date();
    
    const acceptedOrders = await Order.find({
      'acceptedOffer.userId': req.user._id,
      status: 'accepted',
      deliveryStatus: { $in: ['pending', 'failed'] }
    })
      .populate('userId', 'name email phone')
      .sort({ deliveryStartedAt: -1 });

    // Check for orders that should be auto-marked as failed (1 hour timeout)
    for (let order of acceptedOrders) {
      if (order.deliveryStatus === 'pending' && order.deliveryStartedAt) {
        const deliveryTime = now - new Date(order.deliveryStartedAt);
        const hoursElapsed = deliveryTime / (1000 * 60 * 60);
        
        if (hoursElapsed >= 1) {
          order.deliveryStatus = 'failed';
          order.deliveryCompletedAt = now;
          await order.save();
        }
      }
    }

    // Fetch again after timeout updates
    const finalOrders = await Order.find({
      'acceptedOffer.userId': req.user._id,
      status: 'accepted',
      deliveryStatus: { $in: ['pending', 'failed'] }
    })
      .populate('userId', 'name email phone')
      .sort({ deliveryStartedAt: -1 });

    res.json(finalOrders);
  } catch (err) {
    console.error('Get delivery orders error:', err);
    res.status(500).json({ message: 'Failed to fetch accepted orders' });
  }
});

// Mark order as delivered
router.put('/:id/delivery/mark-delivered', isAuthenticated, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        message: 'Only the order creator can mark as delivered' 
      });
    }

    if (order.deliveryStatus !== 'pending') {
      return res.status(400).json({ 
        message: 'Order cannot be marked as delivered' 
      });
    }

    order.deliveryStatus = 'delivered';
    order.deliveryCompletedAt = new Date();
    order.status = 'completed';

    await order.save();

    const populatedOrder = await Order.findById(req.params.id)
      .populate('userId', 'name email phone')
      .populate('acceptedOffer.userId', 'name email phone')
      .lean();

    // Emit event
    const io = req.app.get('io');
    io.emit('orderDelivered', {
      orderId: req.params.id,
      order: populatedOrder
    });

    res.json({
      message: 'Order marked as delivered',
      order: populatedOrder
    });
  } catch (err) {
    console.error('Mark delivered error:', err);
    res.status(500).json({ message: 'Failed to mark order as delivered' });
  }
});

// Mark order as failed
router.put('/:id/delivery/mark-failed', isAuthenticated, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        message: 'Only the order creator can mark as failed' 
      });
    }

    if (order.deliveryStatus !== 'pending') {
      return res.status(400).json({ 
        message: 'Order cannot be marked as failed' 
      });
    }

    order.deliveryStatus = 'failed';
    order.deliveryCompletedAt = new Date();
    order.status = 'completed';

    await order.save();

    const populatedOrder = await Order.findById(req.params.id)
      .populate('userId', 'name email phone')
      .populate('acceptedOffer.userId', 'name email phone')
      .lean();

    // Emit event
    const io = req.app.get('io');
    io.emit('orderFailed', {
      orderId: req.params.id,
      order: populatedOrder
    });

    res.json({
      message: 'Order marked as failed',
      order: populatedOrder
    });
  } catch (err) {
    console.error('Mark failed error:', err);
    res.status(500).json({ message: 'Failed to mark order as failed' });
  }
});

// Cancel delivery (delivery person cancels order)
router.put('/:id/delivery/cancel', isAuthenticated, async (req, res) => {
  try {
    const { reason } = req.body;

    // Validate reason is provided and not empty
    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'Please provide a reason for cancellation' });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.acceptedOffer.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        message: 'Only the delivery person can cancel the order' 
      });
    }

    if (order.deliveryStatus !== 'pending') {
      return res.status(400).json({ 
        message: 'Order cannot be cancelled' 
      });
    }

    order.deliveryStatus = 'cancelled';
    order.deliveryCompletedAt = new Date();
    order.status = 'cancelled'; // Mark as cancelled so it appears in history
    order.cancellationReason = reason.trim();
    order.cancelledBy = req.user._id;
    order.acceptedOffer = {};
    order.offers = order.offers.filter(
      offer => offer.userId.toString() !== req.user._id.toString()
    );

    await order.save();

    const populatedOrder = await Order.findById(req.params.id)
      .populate('userId', 'name email phone')
      .populate('offers.userId', 'name email phone')
      .lean();

    // Emit event to order creator
    const io = req.app.get('io');
    io.emit('deliveryCancelled', {
      orderId: req.params.id,
      order: populatedOrder,
      cancelledBy: {
        userId: req.user._id,
        name: req.user.name,
        reason: reason.trim()
      }
    });

    res.json({
      message: 'Delivery cancelled successfully',
      order: populatedOrder
    });
  } catch (err) {
    console.error('Cancel delivery error:', err);
    res.status(500).json({ message: 'Failed to cancel delivery' });
  }
});

module.exports = router;