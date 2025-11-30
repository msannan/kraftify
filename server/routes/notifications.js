const express = require('express');
const pool = require('../config/database');
const { authenticate, isTradesperson } = require('../middleware/auth');

const router = express.Router();

// Get notifications for authenticated tradesperson
router.get('/', authenticate, isTradesperson, async (req, res) => {
  try {
    const { is_read, page = 1, limit = 20 } = req.query;

    let query = `
      SELECT 
        jn.*,
        jp.title as job_title,
        jp.description as job_description,
        jp.location as job_location,
        jp.budget_min,
        jp.budget_max,
        jp.urgency,
        jp.status as job_status,
        jc.name as category_name,
        jc.icon as category_icon,
        u.first_name as customer_first_name,
        u.last_name as customer_last_name,
        cp.profile_image_url as customer_image
      FROM job_notifications jn
      LEFT JOIN job_postings jp ON jn.job_id = jp.id
      LEFT JOIN job_categories jc ON jp.category_id = jc.id
      LEFT JOIN users u ON jp.customer_id = u.id
      LEFT JOIN customer_profiles cp ON u.id = cp.user_id
      WHERE jn.tradesperson_id = $1
    `;

    const queryParams = [req.user.id];

    if (is_read !== undefined) {
      query += ` AND jn.is_read = $2`;
      queryParams.push(is_read === 'true');
    }

    query += ` ORDER BY jn.created_at DESC`;

    // Add pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);

    const result = await pool.query(query, queryParams);

    // Get unread count
    const unreadCountResult = await pool.query(
      'SELECT COUNT(*) FROM job_notifications WHERE tradesperson_id = $1 AND is_read = FALSE',
      [req.user.id]
    );

    res.json({
      notifications: result.rows,
      unreadCount: parseInt(unreadCountResult.rows[0].count)
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark notification as read
router.patch('/:id/read', authenticate, isTradesperson, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE job_notifications 
       SET is_read = TRUE 
       WHERE id = $1 AND tradesperson_id = $2
       RETURNING *`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ notification: result.rows[0] });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark all notifications as read
router.patch('/mark-all-read', authenticate, isTradesperson, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE job_notifications 
       SET is_read = TRUE 
       WHERE tradesperson_id = $1 AND is_read = FALSE
       RETURNING COUNT(*)`,
      [req.user.id]
    );

    res.json({ 
      message: 'All notifications marked as read',
      updatedCount: result.rowCount 
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get unread notification count
router.get('/unread-count', authenticate, isTradesperson, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) FROM job_notifications WHERE tradesperson_id = $1 AND is_read = FALSE',
      [req.user.id]
    );

    res.json({ unreadCount: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
