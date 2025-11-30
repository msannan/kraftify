const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const { createServer } = require('http');
const { Server } = require('socket.io');

dotenv.config();

const app = express();
const server = createServer(app);

// CORS configuration - allow frontend origin from environment or default to localhost
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const allowedOrigins = [
  FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:3001',
  // Add your server IP/domain
  process.env.SERVER_IP ? `http://${process.env.SERVER_IP}` : null,
  process.env.SERVER_IP ? `http://${process.env.SERVER_IP}:3000` : null,
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 5001;

// Middleware - CORS with dynamic origin
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.some(allowed => origin?.includes(allowed))) {
      callback(null, true);
    } else {
      console.warn(`⚠️  CORS blocked origin: ${origin}`);
      callback(null, true); // Allow all for now, adjust if needed
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'kraftify',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected successfully');
  }
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/profiles', require('./routes/profiles'));
app.use('/api/customer-profiles', require('./routes/customer-profiles'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/search', require('./routes/search'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/bids', require('./routes/bids'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/messages', require('./routes/messages'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Kraftify API is running' });
});

// WebSocket connection handling
const connectedUsers = new Map(); // userId -> socketId

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User joins with their ID
  socket.on('join', (userId) => {
    connectedUsers.set(userId.toString(), socket.id);
    console.log(`User ${userId} joined with socket ${socket.id}`);
    console.log('Currently connected users:', Array.from(connectedUsers.keys()));
  });

  // Handle ping for keepalive
  socket.on('ping', () => {
    socket.emit('pong');
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    // Remove user from connected users
    for (const [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        console.log(`User ${userId} disconnected`);
        break;
      }
    }
  });
});

// Make io available to routes
app.set('io', io);
app.set('connectedUsers', connectedUsers);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, pool, io, connectedUsers };

