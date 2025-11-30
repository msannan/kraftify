const express = require('express');
const pool = require('../config/database');
const { authenticate, isTradesperson, isCustomer } = require('../middleware/auth');

const router = express.Router();

// Create a bid on a job (tradespeople only)
router.post('/', authenticate, isTradesperson, async (req, res) => {
  try {
    const {
      job_id,
      bid_amount,
      estimated_duration,
      proposal,
      availability_date
    } = req.body;

    // Validate required fields
    if (!job_id || !bid_amount || !proposal) {
      return res.status(400).json({ error: 'Job ID, bid amount, and proposal are required' });
    }

    // Check if job exists and is open
    const jobResult = await pool.query(
      'SELECT * FROM job_postings WHERE id = $1 AND status = $2',
      [job_id, 'open']
    );

    if (jobResult.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found or not accepting bids' });
    }

    const job = jobResult.rows[0];

    // Check if tradesperson already bid on this job
    const existingBidResult = await pool.query(
      'SELECT id, status FROM job_bids WHERE job_id = $1 AND tradesperson_id = $2',
      [job_id, req.user.id]
    );

    if (existingBidResult.rows.length > 0) {
      const existingBid = existingBidResult.rows[0];
      
      // Allow re-bidding if previous bid was rejected or withdrawn
      if (existingBid.status === 'rejected' || existingBid.status === 'withdrawn') {
        // Delete the old rejected/withdrawn bid to allow new bid
        await pool.query(
          'DELETE FROM job_bids WHERE id = $1',
          [existingBid.id]
        );
        console.log(`✅ Deleted ${existingBid.status} bid ${existingBid.id} to allow re-bidding`);
      } else {
        // Block if bid is pending or accepted
        return res.status(400).json({ 
          error: `You have already bid on this job. Your bid status is: ${existingBid.status}` 
        });
      }
    }

    // Create the bid
    const result = await pool.query(
      `INSERT INTO job_bids (
        job_id, tradesperson_id, bid_amount, estimated_duration, 
        proposal, availability_date
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        job_id,
        req.user.id,
        bid_amount,
        estimated_duration,
        proposal,
        availability_date || null
      ]
    );

    const bid = result.rows[0];

    // Get bid details with tradesperson info
    const bidDetailsResult = await pool.query(
      `SELECT 
        jb.*,
        u.first_name,
        u.last_name,
        tp.business_name,
        tp.profile_image_url,
        tp.hourly_rate,
        tp.verification_status
      FROM job_bids jb
      LEFT JOIN users u ON jb.tradesperson_id = u.id
      LEFT JOIN tradesperson_profiles tp ON u.id = tp.user_id
      WHERE jb.id = $1`,
      [bid.id]
    );

    res.status(201).json({ bid: bidDetailsResult.rows[0] });
  } catch (error) {
    console.error('Create bid error:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(400).json({ error: 'You have already bid on this job' });
    } else {
      res.status(500).json({ error: 'Server error' });
    }
  }
});

// Get bids for a specific job (job owner only)
router.get('/job/:jobId', authenticate, async (req, res) => {
  try {
    const { jobId } = req.params;

    // Check if user owns the job (for customers) or if it's a tradesperson viewing their own bid
    const jobResult = await pool.query(
      'SELECT customer_id FROM job_postings WHERE id = $1',
      [jobId]
    );

    if (jobResult.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = jobResult.rows[0];
    const isJobOwner = job.customer_id === req.user.id;
    const isTradesperson = req.user.role === 'tradesperson';

    if (!isJobOwner && !isTradesperson) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    let query = `
      SELECT 
        jb.*,
        u.first_name,
        u.last_name,
        tp.business_name,
        tp.profile_image_url,
        tp.hourly_rate,
        tp.verification_status,
        tp.bio,
        (SELECT AVG(rating) FROM reviews WHERE tradesperson_id = jb.tradesperson_id) as avg_rating,
        (SELECT COUNT(*) FROM reviews WHERE tradesperson_id = jb.tradesperson_id) as review_count
      FROM job_bids jb
      LEFT JOIN users u ON jb.tradesperson_id = u.id
      LEFT JOIN tradesperson_profiles tp ON u.id = tp.user_id
      WHERE jb.job_id = $1
    `;

    const queryParams = [jobId];

    // If it's a tradesperson, only show their own bid
    if (isTradesperson && !isJobOwner) {
      query += ` AND jb.tradesperson_id = $2`;
      queryParams.push(req.user.id);
    }

    query += ` ORDER BY jb.created_at ASC`;

    const result = await pool.query(query, queryParams);

    res.json({ bids: result.rows });
  } catch (error) {
    console.error('Get job bids error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get tradesperson's own bids
router.get('/my-bids', authenticate, isTradesperson, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    let query = `
      SELECT 
        jb.*,
        jp.title as job_title,
        jp.description as job_description,
        jp.location as job_location,
        jp.status as job_status,
        jp.urgency,
        jc.name as category_name,
        u.first_name as customer_first_name,
        u.last_name as customer_last_name,
        cp.profile_image_url as customer_image
      FROM job_bids jb
      LEFT JOIN job_postings jp ON jb.job_id = jp.id
      LEFT JOIN job_categories jc ON jp.category_id = jc.id
      LEFT JOIN users u ON jp.customer_id = u.id
      LEFT JOIN customer_profiles cp ON u.id = cp.user_id
      WHERE jb.tradesperson_id = $1
    `;

    const queryParams = [req.user.id];

    if (status) {
      query += ` AND jb.status = $2`;
      queryParams.push(status);
    }

    query += ` ORDER BY jb.created_at DESC`;

    // Add pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);

    const result = await pool.query(query, queryParams);

    res.json({ bids: result.rows });
  } catch (error) {
    console.error('Get my bids error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update bid status (accept/reject - customers only)
router.patch('/:bidId/status', authenticate, isCustomer, async (req, res) => {
  try {
    const { bidId } = req.params;
    const { status } = req.body;

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "accepted" or "rejected"' });
    }

    // Get bid and verify ownership
    const bidResult = await pool.query(
      `SELECT jb.*, jp.customer_id, jp.id as job_id
       FROM job_bids jb
       LEFT JOIN job_postings jp ON jb.job_id = jp.id
       WHERE jb.id = $1`,
      [bidId]
    );

    if (bidResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bid not found' });
    }

    const bid = bidResult.rows[0];

    if (bid.customer_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update bid status
      await client.query(
        'UPDATE job_bids SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [status, bidId]
      );

      if (status === 'accepted') {
        // Reject all other bids for this job
        await client.query(
          'UPDATE job_bids SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE job_id = $2 AND id != $3 AND status = $4',
          ['rejected', bid.job_id, bidId, 'pending']
        );

        // Update job status to in_progress
        await client.query(
          'UPDATE job_postings SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          ['in_progress', bid.job_id]
        );
      }

      await client.query('COMMIT');

      // Get updated bid with details
      const updatedBidResult = await client.query(
        `SELECT 
          jb.*,
          u.first_name,
          u.last_name,
          tp.business_name,
          tp.profile_image_url
        FROM job_bids jb
        LEFT JOIN users u ON jb.tradesperson_id = u.id
        LEFT JOIN tradesperson_profiles tp ON u.id = tp.user_id
        WHERE jb.id = $1`,
        [bidId]
      );

      res.json({ bid: updatedBidResult.rows[0] });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Update bid status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Withdraw bid (tradespeople only)
router.patch('/:bidId/withdraw', authenticate, isTradesperson, async (req, res) => {
  try {
    const { bidId } = req.params;

    const result = await pool.query(
      `UPDATE job_bids 
       SET status = 'withdrawn', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND tradesperson_id = $2 AND status = 'pending'
       RETURNING *`,
      [bidId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bid not found or cannot be withdrawn' });
    }

    res.json({ bid: result.rows[0] });
  } catch (error) {
    console.error('Withdraw bid error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update bid details (tradespeople only, before acceptance)
router.put('/:bidId', authenticate, isTradesperson, async (req, res) => {
  try {
    const { bidId } = req.params;
    const {
      bid_amount,
      estimated_duration,
      proposal,
      availability_date
    } = req.body;

    const result = await pool.query(
      `UPDATE job_bids 
       SET 
         bid_amount = COALESCE($1, bid_amount),
         estimated_duration = COALESCE($2, estimated_duration),
         proposal = COALESCE($3, proposal),
         availability_date = COALESCE($4, availability_date),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND tradesperson_id = $6 AND status = 'pending'
       RETURNING *`,
      [bid_amount, estimated_duration, proposal, availability_date, bidId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bid not found or cannot be updated' });
    }

    res.json({ bid: result.rows[0] });
  } catch (error) {
    console.error('Update bid error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
