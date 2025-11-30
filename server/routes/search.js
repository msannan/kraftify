const express = require('express');
const pool = require('../config/database');

const router = express.Router();

// Search tradespeople
router.get('/', async (req, res) => {
  try {
    const { query, location, skill, minRating, maxRate, sortBy = 'rating' } = req.query;

    let sqlQuery = `
      SELECT 
        tp.id,
        tp.business_name,
        tp.bio,
        tp.location,
        tp.hourly_rate,
        tp.availability_status,
        tp.verification_status,
        tp.profile_image_url,
        u.first_name,
        u.last_name,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(r.id) as total_reviews
      FROM tradesperson_profiles tp
      JOIN users u ON tp.user_id = u.id
      LEFT JOIN reviews r ON tp.id = r.tradesperson_id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 0;

    // Add filters
    if (query) {
      paramCount++;
      sqlQuery += ` AND (tp.business_name ILIKE $${paramCount} OR tp.bio ILIKE $${paramCount} OR u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount})`;
      params.push(`%${query}%`);
    }

    if (location) {
      paramCount++;
      sqlQuery += ` AND tp.location ILIKE $${paramCount}`;
      params.push(`%${location}%`);
    }

    if (skill) {
      paramCount++;
      sqlQuery += ` AND tp.id IN (SELECT tradesperson_id FROM skills WHERE skill_name ILIKE $${paramCount})`;
      params.push(`%${skill}%`);
    }

    if (maxRate) {
      paramCount++;
      sqlQuery += ` AND tp.hourly_rate <= $${paramCount}`;
      params.push(parseFloat(maxRate));
    }

    sqlQuery += ` GROUP BY tp.id, u.first_name, u.last_name`;

    if (minRating) {
      paramCount++;
      sqlQuery += ` HAVING AVG(r.rating) >= $${paramCount}`;
      params.push(parseFloat(minRating));
    }

    // Add sorting
    switch (sortBy) {
      case 'rating':
        sqlQuery += ` ORDER BY average_rating DESC, total_reviews DESC`;
        break;
      case 'rate_low':
        sqlQuery += ` ORDER BY tp.hourly_rate ASC`;
        break;
      case 'rate_high':
        sqlQuery += ` ORDER BY tp.hourly_rate DESC`;
        break;
      default:
        sqlQuery += ` ORDER BY average_rating DESC`;
    }

    const result = await pool.query(sqlQuery, params);

    res.json({ tradespeople: result.rows });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

