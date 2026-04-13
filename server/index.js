const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const MongoStore = require('connect-mongo');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

require('./config/passport');

const app = express();
const httpServer = createServer(app);

// ✅ IMPORTANT: Trust proxy (REQUIRED for Railway)
app.set('trust proxy', 1);

// Socket.io setup with CORS
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Make io accessible to routes
app.set('io', io);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true
}));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/nu-delivery')
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ✅ FIXED Session configuration
app.use(session({
  name: 'connect.sid', // optional but explicit
  secret: process.env.SESSION_SECRET || 'nu-delivery-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI || 'mongodb://localhost:27017/nu-delivery'
  }),
  cookie: {
    maxAge: 2 * 60 * 60 * 1000, // 2 hours
    secure: true,               // 🔥 MUST be true (HTTPS)
    httpOnly: true,
    sameSite: 'none'            // 🔥 CRITICAL for Vercel ↔ Railway
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/user', require('./routes/user'));

// ✅ Debug route (optional - helps verify login)
app.get('/me', (req, res) => {
  res.json(req.user || null);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Client URL: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
});

module.exports = { io };