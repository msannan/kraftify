const express = require('express');
const pool = require('../config/database');
const { authenticate, isCustomer } = require('../middleware/auth');

const router = express.Router();

// Create a review
router.post('/', authenticate, isCustomer, async (req, res) => {
  try {
    const { bookingId, rating, comment } = req.body;

    // Verify booking exists and belongs to user
    const bookingResult = await pool.query(
      'SELECT * FROM bookings WHERE id = $1 AND customer_id = $2 AND status = $3',
      [bookingId, req.user.id, 'completed']
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found or not completed' });
    }

    const booking = bookingResult.rows[0];

    // Check if review already exists
    const existingReview = await pool.query(
      'SELECT id FROM reviews WHERE booking_id = $1',
      [bookingId]
    );

    if (existingReview.rows.length > 0) {
      return res.status(400).json({ error: 'Review already exists for this booking' });
    }

    const result = await pool.query(
      `INSERT INTO reviews (booking_id, customer_id, tradesperson_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [bookingId, req.user.id, booking.tradesperson_id, rating, comment || null]
    );

    res.status(201).json({ review: result.rows[0] });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get reviews for a tradesperson
router.get('/tradesperson/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT r.*, u.first_name, u.last_name
       FROM reviews r
       JOIN users u ON r.customer_id = u.id
       WHERE r.tradesperson_id = $1
       ORDER BY r.created_at DESC`,
      [id]
    );

    res.json({ reviews: result.rows });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

