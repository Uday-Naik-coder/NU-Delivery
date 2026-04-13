const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const MongoStore = require('connect-mongo');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Load passport config
require('./config/passport');

const app = express();
const httpServer = createServer(app);

// 🔥 REQUIRED for Railway / proxies (IMPORTANT)
app.set('trust proxy', 1);

// 🔥 CORS (MUST match frontend exactly)
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔥 MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Error:', err));

// 🔥 SESSION CONFIG (CRITICAL FOR AUTH)
app.use(session({
  name: 'connect.sid',
  secret: process.env.SESSION_SECRET || 'super-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI
  }),
  cookie: {
    maxAge: 2 * 60 * 60 * 1000, // 2 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // 🔥 true in production
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' // 🔥 IMPORTANT
  }
}));

// 🔥 Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

// 🔌 Socket.io setup (optional but included)
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true
  }
});

io.on('connection', (socket) => {
  console.log('🔌 Socket connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('🔌 Socket disconnected:', socket.id);
  });
});

// Make io accessible in routes if needed
app.set('io', io);

// 🔥 AUTH ROUTES
app.use('/auth', require('./routes/auth'));

// 🔥 TEST ROUTE (VERY IMPORTANT)
app.get('/auth/me', (req, res) => {
  console.log('SESSION:', req.session);
  console.log('USER:', req.user);

  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  res.json(req.user);
});

// Optional API routes
app.use('/api/orders', require('./routes/orders'));
app.use('/api/user', require('./routes/user'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({
    message: 'Internal Server Error'
  });
});

// 🚀 Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Client URL: ${process.env.CLIENT_URL}`);
});