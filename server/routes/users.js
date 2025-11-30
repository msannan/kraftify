const express = require('express');
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get user profile
router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, role, first_name, last_name, phone, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // If tradesperson, include profile
    if (user.role === 'tradesperson') {
      const profileResult = await pool.query(
        'SELECT * FROM tradesperson_profiles WHERE user_id = $1',
        [user.id]
      );
      user.profile = profileResult.rows[0] || null;
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

