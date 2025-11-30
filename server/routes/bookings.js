const express = require('express');
const pool = require('../config/database');
const { authenticate, isCustomer } = require('../middleware/auth');

const router = express.Router();

// Create a new booking
router.post('/', authenticate, isCustomer, async (req, res) => {
  try {
    const {
      tradespersonId,
      projectTitle,
      projectDescription,
      projectType,
      estimatedHours,
      startDate,
      location,
    } = req.body;

    // Get tradesperson's hourly rate
    const tradespersonResult = await pool.query(
      'SELECT hourly_rate FROM tradesperson_profiles WHERE id = $1',
      [tradespersonId]
    );

    if (tradespersonResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tradesperson not found' });
    }

    const hourlyRate = tradespersonResult.rows[0].hourly_rate || 0;
    const totalAmount = estimatedHours ? parseFloat(estimatedHours) * parseFloat(hourlyRate) : 0;

    const result = await pool.query(
      `INSERT INTO bookings (customer_id, tradesperson_id, project_title, project_description, project_type, estimated_hours, hourly_rate, total_amount, start_date, location)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [req.user.id, tradespersonId, projectTitle, projectDescription || null, projectType || null, estimatedHours || null, hourlyRate, totalAmount, startDate || null, location || null]
    );

    res.status(201).json({ booking: result.rows[0] });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get bookings for current user
router.get('/my-bookings', authenticate, async (req, res) => {
  try {
    let query;
    let params;

    if (req.user.role === 'customer') {
      query = `
        SELECT b.*, 
               tp.business_name, tp.profile_image_url,
               u.first_name, u.last_name, u.email
        FROM bookings b
        JOIN tradesperson_profiles tp ON b.tradesperson_id = tp.id
        JOIN users u ON tp.user_id = u.id
        WHERE b.customer_id = $1
        ORDER BY b.created_at DESC
      `;
      params = [req.user.id];
    } else {
      query = `
        SELECT b.*, 
               u.first_name, u.last_name, u.email, u.phone
        FROM bookings b
        JOIN users u ON b.customer_id = u.id
        WHERE b.tradesperson_id = $1
        ORDER BY b.created_at DESC
      `;
      const profileResult = await pool.query(
        'SELECT id FROM tradesperson_profiles WHERE user_id = $1',
        [req.user.id]
      );
      params = [profileResult.rows[0]?.id];
    }

    const result = await pool.query(query, params);
    res.json({ bookings: result.rows });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update booking status
router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Get booking
    const bookingResult = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];

    // Verify ownership
    if (req.user.role === 'customer' && booking.customer_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (req.user.role === 'tradesperson') {
      const profileResult = await pool.query(
        'SELECT id FROM tradesperson_profiles WHERE user_id = $1',
        [req.user.id]
      );
      if (booking.tradesperson_id !== profileResult.rows[0]?.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Update status
    const result = await pool.query(
      'UPDATE bookings SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );

    res.json({ booking: result.rows[0] });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

