const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to verify JWT token
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided, authorization denied' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user from database
    const result = await pool.query('SELECT id, email, role FROM users WHERE id = $1', [decoded.userId]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Middleware to check if user is a tradesperson
const isTradesperson = (req, res, next) => {
  if (req.user.role !== 'tradesperson') {
    return res.status(403).json({ error: 'Access denied. Tradesperson role required.' });
  }
  next();
};

// Middleware to check if user is a customer
const isCustomer = (req, res, next) => {
  if (req.user.role !== 'customer') {
    return res.status(403).json({ error: 'Access denied. Customer role required.' });
  }
  next();
};

// Optional authentication - sets req.user if token is provided, but doesn't fail if not
const optionalAuthenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      // No token provided - continue without setting req.user
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user from database
    const result = await pool.query('SELECT id, email, role FROM users WHERE id = $1', [decoded.userId]);
    
    if (result.rows.length > 0) {
      req.user = result.rows[0];
    }
    
    next();
  } catch (error) {
    // Invalid token - continue without setting req.user
    next();
  }
};

module.exports = { authenticate, optionalAuthenticate, isTradesperson, isCustomer, JWT_SECRET };

