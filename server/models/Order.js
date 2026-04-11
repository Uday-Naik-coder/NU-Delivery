const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  phone: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  platform: {
    type: String,
    required: true,
    enum: ['Zomato', 'Swiggy', 'Blinkit', 'Silver Spoon', 'Apna Gaon', 'Tuck Shop', 'TMP', 'Other']
  },
  items: {
    type: String,
    default: ''
  },
  image: {
    type: String,
    default: ''
  },
  expectedTime: {
    type: Date,
    required: true
  },
  note: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['active', 'accepted', 'expired', 'completed', 'cancelled'],
    default: 'active'
  },
  offers: [offerSchema],
  acceptedOffer: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    price: Number,
    phone: String,
    acceptedAt: Date
  },
  deliveryStatus: {
    type: String,
    enum: ['pending', 'delivered', 'failed', 'cancelled'],
    default: 'pending'
  },
  deliveryStartedAt: Date,
  deliveryCompletedAt: Date,
  cancellationReason: {
    type: String,
    default: ''
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
orderSchema.index({ status: 1, expectedTime: 1 });
orderSchema.index({ userId: 1 });

module.exports = mongoose.model('Order', orderSchema);