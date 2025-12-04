const request = require('supertest');
const express = require('express');
const authRoutes = require('../routes/auth');
const jobsRoutes = require('../routes/jobs');
const bidsRoutes = require('../routes/bids');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/bids', bidsRoutes);

describe('Kraftify Integration Tests', () => {
  let customerToken;
  let tradespersonToken;
  let jobId;
  let categoryId;

  // Test Case 1: User Registration and Login Flow
  test('Test 1: Register customer and login successfully', async () => {
    // Register
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: `testcustomer${Date.now()}@example.com`,
        password: 'test123456',
        role: 'customer',
        firstName: 'John',
        lastName: 'Doe'
      })
      .expect(201);

    // Expected: User registered with token
    expect(registerResponse.body).toHaveProperty('token');
    expect(registerResponse.body.user.role).toBe('customer');
    customerToken = registerResponse.body.token;

    // Login
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: registerResponse.body.user.email,
        password: 'test123456'
      })
      .expect(200);

    // Expected: Login returns token
    expect(loginResponse.body).toHaveProperty('token');
    expect(loginResponse.body.message).toBe('Login successful');

    console.log('✅ Test 1 PASSED: Registration and Login');
    console.log('   Expected: User registered and logged in with tokens');
    console.log('   Actual: Registration and login successful');
  });

  // Test Case 2: Customer Creates Job Posting
  test('Test 2: Customer creates a job posting', async () => {
    // Register customer
    const customerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: `jobcustomer${Date.now()}@example.com`,
        password: 'test123456',
        role: 'customer',
        firstName: 'Job',
        lastName: 'Customer'
      });
    customerToken = customerResponse.body.token;

    // Get category
    const categoriesResponse = await request(app)
      .get('/api/jobs/categories');
    categoryId = categoriesResponse.body.categories?.[0]?.id || 1;

    // Create job
    const jobResponse = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        title: 'Fix car engine',
        description: 'Car engine making strange noises',
        category_id: categoryId,
        location: 'New York, NY',
        budget_min: 200,
        budget_max: 500
      })
      .expect(201);

    // Expected: Job created with ID and status open
    expect(jobResponse.body.job).toHaveProperty('id');
    expect(jobResponse.body.job.status).toBe('open');
    expect(jobResponse.body.job.title).toBe('Fix car engine');
    jobId = jobResponse.body.job.id;

    console.log('✅ Test 2 PASSED: Job Creation');
    console.log('   Expected: Job created with ID and open status');
    console.log(`   Actual: Job created with ID ${jobId}, status: open`);
  });

  // Test Case 3: Tradesperson Submits Bid on Job
  test('Test 3: Tradesperson submits bid on customer job', async () => {
    // Register tradesperson
    const tradespersonResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: `bidtradesperson${Date.now()}@example.com`,
        password: 'test123456',
        role: 'tradesperson',
        firstName: 'Bid',
        lastName: 'Tradesperson'
      });
    tradespersonToken = tradespersonResponse.body.token;

    // Create job if not exists
    if (!jobId) {
      const customerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: `jobowner${Date.now()}@example.com`,
          password: 'test123456',
          role: 'customer',
          firstName: 'Job',
          lastName: 'Owner'
        });
      
      const categoriesResponse = await request(app)
        .get('/api/jobs/categories');
      categoryId = categoriesResponse.body.categories?.[0]?.id || 1;

      const jobResponse = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${customerResponse.body.token}`)
        .send({
          title: 'Plumbing repair',
          description: 'Fix leaky faucet',
          category_id: categoryId,
          location: 'Chicago, IL'
        });
      jobId = jobResponse.body.job.id;
    }

    // Submit bid
    const bidResponse = await request(app)
      .post('/api/bids')
      .set('Authorization', `Bearer ${tradespersonToken}`)
      .send({
        job_id: jobId,
        bid_amount: 250,
        proposal: 'I can fix this within 2 hours',
        estimated_duration: '2 hours'
      })
      .expect(201);

    // Expected: Bid created with pending status
    expect(bidResponse.body.bid).toHaveProperty('id');
    expect(bidResponse.body.bid.status).toBe('pending');
    expect(parseFloat(bidResponse.body.bid.bid_amount)).toBe(250);

    console.log('✅ Test 3 PASSED: Bid Submission');
    console.log('   Expected: Bid created with pending status');
    console.log(`   Actual: Bid created with ID ${bidResponse.body.bid.id}, status: pending`);
  });

  // Test Case 4: Customer Views Bids on Their Job
  test('Test 4: Customer can view all bids on their job', async () => {
    // Setup: Create customer, job, and bids
    const customerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: `viewbidscustomer${Date.now()}@example.com`,
        password: 'test123456',
        role: 'customer',
        firstName: 'View',
        lastName: 'Bids'
      });
    customerToken = customerResponse.body.token;

    const categoriesResponse = await request(app)
      .get('/api/jobs/categories');
    categoryId = categoriesResponse.body.categories?.[0]?.id || 1;

    const jobResponse = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        title: 'Electrical work',
        description: 'Need electrician',
        category_id: categoryId,
        location: 'Los Angeles, CA'
      });
    const testJobId = jobResponse.body.job.id;

    // Create two tradespeople and bids
    const tradesperson1 = await request(app)
      .post('/api/auth/register')
      .send({
        email: `tradesperson1${Date.now()}@example.com`,
        password: 'test123456',
        role: 'tradesperson',
        firstName: 'Trade',
        lastName: 'Person1'
      });

    const tradesperson2 = await request(app)
      .post('/api/auth/register')
      .send({
        email: `tradesperson2${Date.now()}@example.com`,
        password: 'test123456',
        role: 'tradesperson',
        firstName: 'Trade',
        lastName: 'Person2'
      });

    await request(app)
      .post('/api/bids')
      .set('Authorization', `Bearer ${tradesperson1.body.token}`)
      .send({
        job_id: testJobId,
        bid_amount: 300,
        proposal: 'First bid'
      });

    await request(app)
      .post('/api/bids')
      .set('Authorization', `Bearer ${tradesperson2.body.token}`)
      .send({
        job_id: testJobId,
        bid_amount: 250,
        proposal: 'Second bid'
      });

    // Customer views bids
    const bidsResponse = await request(app)
      .get(`/api/bids/job/${testJobId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    // Expected: Customer sees all bids
    expect(bidsResponse.body.bids).toBeInstanceOf(Array);
    expect(bidsResponse.body.bids.length).toBeGreaterThanOrEqual(2);

    console.log('✅ Test 4 PASSED: Customer Views Bids');
    console.log('   Expected: Customer sees all bids on their job');
    console.log(`   Actual: Retrieved ${bidsResponse.body.bids.length} bids`);
  });

  // Test Case 5: Unauthorized Access is Rejected
  test('Test 5: Unauthorized access to protected endpoints', async () => {
    // Try to create job without token
    const jobResponse = await request(app)
      .post('/api/jobs')
      .send({
        title: 'Unauthorized job',
        description: 'Should fail',
        category_id: 1
      })
      .expect(401);

    // Expected: 401 Unauthorized
    expect(jobResponse.body).toHaveProperty('error');

    // Try to submit bid without token
    const bidResponse = await request(app)
      .post('/api/bids')
      .send({
        job_id: 1,
        bid_amount: 100,
        proposal: 'Should fail'
      })
      .expect(401);

    // Expected: 401 Unauthorized
    expect(bidResponse.body).toHaveProperty('error');

    console.log('✅ Test 5 PASSED: Unauthorized Access Rejected');
    console.log('   Expected: 401 errors for unauthorized requests');
    console.log('   Actual: Both requests returned 401 errors');
  });
});

