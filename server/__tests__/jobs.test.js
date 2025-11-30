const request = require('supertest');
const express = require('express');
const jobsRoutes = require('../routes/jobs');
const authRoutes = require('../routes/auth');
const pool = require('../config/database');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobsRoutes);

describe('Job Routes', () => {
  let customerToken;
  let customerId;
  let jobId;

  beforeAll(async () => {
    // Create test customer
    const customerRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: `jobcustomer${Date.now()}@test.com`,
        password: 'test123456',
        firstName: 'Job',
        lastName: 'Customer',
        role: 'customer'
      });
    customerToken = customerRes.body.token;
    customerId = customerRes.body.user.id;
  });

  afterAll(async () => {
    // Cleanup
    if (jobId) {
      await pool.query('DELETE FROM job_postings WHERE id = $1', [jobId]);
    }
    if (customerId) {
      await pool.query('DELETE FROM users WHERE id = $1', [customerId]);
    }
    await pool.end();
  });

  describe('GET /api/jobs/categories', () => {
    test('should get all job categories', async () => {
      const response = await request(app)
        .get('/api/jobs/categories')
        .expect(200);

      expect(response.body).toHaveProperty('categories');
      expect(Array.isArray(response.body.categories)).toBe(true);
    });
  });

  describe('POST /api/jobs', () => {
    test('should create a job successfully', async () => {
      const response = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          title: 'Test Job Posting',
          description: 'This is a test job description',
          category_id: 1,
          location: 'Test City',
          budget_min: 100,
          budget_max: 500,
          urgency: 'medium',
          preferred_start_date: '2024-12-01'
        })
        .expect(201);

      expect(response.body.job).toHaveProperty('id');
      expect(response.body.job.title).toBe('Test Job Posting');
      jobId = response.body.job.id;
    });

    test('should reject job creation without authentication', async () => {
      const response = await request(app)
        .post('/api/jobs')
        .send({
          title: 'Test Job',
          description: 'Test description',
          category_id: 1
        })
        .expect(401);
    });

    test('should reject job creation with missing required fields', async () => {
      const response = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          // Missing title and description
          category_id: 1
        })
        .expect(400);
    });
  });

  describe('GET /api/jobs/:id', () => {
    test('should get job by ID', async () => {
      if (!jobId) {
        // Create a job first if it doesn't exist
        const createRes = await request(app)
          .post('/api/jobs')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            title: 'Get Test Job',
            description: 'Test description',
            category_id: 1,
            location: 'Test City',
            budget_min: 100,
            budget_max: 500
          });
        jobId = createRes.body.job.id;
      }

      const response = await request(app)
        .get(`/api/jobs/${jobId}`)
        .expect(200);

      expect(response.body.job).toHaveProperty('id');
      expect(response.body.job.id).toBe(jobId);
    });

    test('should return 404 for non-existent job', async () => {
      const response = await request(app)
        .get('/api/jobs/99999')
        .expect(404);
    });
  });

  describe('GET /api/jobs/my-jobs', () => {
    test('should get customer\'s jobs', async () => {
      const response = await request(app)
        .get('/api/jobs/my-jobs')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('jobs');
      expect(Array.isArray(response.body.jobs)).toBe(true);
    });

    test('should reject without authentication', async () => {
      const response = await request(app)
        .get('/api/jobs/my-jobs')
        .expect(401);
    });
  });
});

