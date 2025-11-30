const request = require('supertest');
const express = require('express');
const bidsRoutes = require('../routes/bids');
const authRoutes = require('../routes/auth');
const jobsRoutes = require('../routes/jobs');
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

// Create a test app
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/bids', bidsRoutes);

describe('Bid Routes', () => {
  let customerToken;
  let tradespersonToken;
  let customerId;
  let tradespersonId;
  let jobId;

  beforeAll(async () => {
    // Create test customer
    const customerRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: `customer${Date.now()}@test.com`,
        password: 'test123456',
        firstName: 'Test',
        lastName: 'Customer',
        role: 'customer'
      });
    customerToken = customerRes.body.token;
    customerId = customerRes.body.user.id;

    // Create test tradesperson
    const tradespersonRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: `tradesperson${Date.now()}@test.com`,
        password: 'test123456',
        firstName: 'Test',
        lastName: 'Tradesperson',
        role: 'tradesperson'
      });
    tradespersonToken = tradespersonRes.body.token;
    tradespersonId = tradespersonRes.body.user.id;

    // Create a test job
    const jobRes = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        title: 'Test Job',
        description: 'Test job description',
        category_id: 1,
        location: 'Test Location',
        budget_min: 100,
        budget_max: 500,
        urgency: 'medium'
      });
    jobId = jobRes.body.job.id;
  });

  afterAll(async () => {
    // Cleanup
    if (jobId) {
      await pool.query('DELETE FROM job_postings WHERE id = $1', [jobId]);
    }
    if (customerId) {
      await pool.query('DELETE FROM users WHERE id = $1', [customerId]);
    }
    if (tradespersonId) {
      await pool.query('DELETE FROM users WHERE id = $1', [tradespersonId]);
    }
    await pool.end();
  });

  describe('POST /api/bids', () => {
    test('should create a bid successfully', async () => {
      const response = await request(app)
        .post('/api/bids')
        .set('Authorization', `Bearer ${tradespersonToken}`)
        .send({
          job_id: jobId,
          bid_amount: 300,
          estimated_duration: '2 days',
          proposal: 'I can fix this for you',
          availability_date: '2024-12-01'
        })
        .expect(201);

      expect(response.body.bid).toHaveProperty('id');
      expect(response.body.bid.bid_amount).toBe('300.00');
      expect(response.body.bid.proposal).toBe('I can fix this for you');
    });

    test('should reject bid without authentication', async () => {
      const response = await request(app)
        .post('/api/bids')
        .send({
          job_id: jobId,
          bid_amount: 300,
          proposal: 'Test proposal'
        })
        .expect(401);
    });

    test('should reject bid with missing required fields', async () => {
      const response = await request(app)
        .post('/api/bids')
        .set('Authorization', `Bearer ${tradespersonToken}`)
        .send({
          job_id: jobId,
          // Missing bid_amount and proposal
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('should reject bid from customer (only tradespeople can bid)', async () => {
      const response = await request(app)
        .post('/api/bids')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          job_id: jobId,
          bid_amount: 300,
          proposal: 'Test proposal'
        })
        .expect(403);
    });
  });

  describe('GET /api/bids/job/:jobId', () => {
    test('should get bids for a job (job owner)', async () => {
      const response = await request(app)
        .get(`/api/bids/job/${jobId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(Array.isArray(response.body.bids)).toBe(true);
    });

    test('should get only own bid (tradesperson)', async () => {
      const response = await request(app)
        .get(`/api/bids/job/${jobId}`)
        .set('Authorization', `Bearer ${tradespersonToken}`)
        .expect(200);

      expect(Array.isArray(response.body.bids)).toBe(true);
      // Tradesperson should only see their own bid
      if (response.body.bids.length > 0) {
        expect(response.body.bids[0].tradesperson_id).toBe(tradespersonId);
      }
    });
  });
});

