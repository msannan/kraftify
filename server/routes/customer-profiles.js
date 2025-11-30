const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/database');
const { authenticate, isCustomer } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/customers';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'customer-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Get current customer's profile
router.get('/me', authenticate, isCustomer, async (req, res) => {
  try {
    const profileResult = await pool.query(
      `SELECT cp.*, u.first_name, u.last_name, u.email, u.phone
       FROM customer_profiles cp
       JOIN users u ON cp.user_id = u.id
       WHERE cp.user_id = $1`,
      [req.user.id]
    );

    if (profileResult.rows.length === 0) {
      // Create profile if it doesn't exist
      await pool.query(
        'INSERT INTO customer_profiles (user_id) VALUES ($1) RETURNING *',
        [req.user.id]
      );
      
      // Fetch again
      const newProfileResult = await pool.query(
        `SELECT cp.*, u.first_name, u.last_name, u.email, u.phone
         FROM customer_profiles cp
         JOIN users u ON cp.user_id = u.id
         WHERE cp.user_id = $1`,
        [req.user.id]
      );
      
      return res.json({ profile: newProfileResult.rows[0] });
    }

    res.json({ profile: profileResult.rows[0] });
  } catch (error) {
    console.error('Get customer profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload profile image
router.post('/me/upload-image', authenticate, isCustomer, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get or create customer profile
    let profileResult = await pool.query(
      'SELECT id FROM customer_profiles WHERE user_id = $1',
      [req.user.id]
    );

    if (profileResult.rows.length === 0) {
      // Create profile if it doesn't exist
      await pool.query(
        'INSERT INTO customer_profiles (user_id) VALUES ($1)',
        [req.user.id]
      );
      profileResult = await pool.query(
        'SELECT id FROM customer_profiles WHERE user_id = $1',
        [req.user.id]
      );
    }

    // Construct image URL
    const imageUrl = `/uploads/customers/${req.file.filename}`;

    // Update profile with image URL
    await pool.query(
      'UPDATE customer_profiles SET profile_image_url = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [imageUrl, req.user.id]
    );

    res.json({ imageUrl, message: 'Image uploaded successfully' });
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update customer profile
router.put('/me', authenticate, isCustomer, async (req, res) => {
  try {
    const { bio, location } = req.body;

    // Get or create customer profile
    let profileResult = await pool.query(
      'SELECT id FROM customer_profiles WHERE user_id = $1',
      [req.user.id]
    );

    if (profileResult.rows.length === 0) {
      // Create profile if it doesn't exist
      await pool.query(
        'INSERT INTO customer_profiles (user_id) VALUES ($1)',
        [req.user.id]
      );
    }

    // Update profile
    const result = await pool.query(
      `UPDATE customer_profiles
       SET bio = COALESCE($1, bio),
           location = COALESCE($2, location),
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $3
       RETURNING *`,
      [bio, location, req.user.id]
    );

    res.json({ profile: result.rows[0] });
  } catch (error) {
    console.error('Update customer profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user details (first name, last name, phone)
router.put('/me/user-details', authenticate, isCustomer, async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;

    const result = await pool.query(
      `UPDATE users
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           phone = COALESCE($3, phone),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, email, role, first_name, last_name, phone, created_at`,
      [firstName, lastName, phone, req.user.id]
    );

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Update user details error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

