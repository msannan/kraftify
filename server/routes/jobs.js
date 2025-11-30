const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/database');
const { authenticate, optionalAuthenticate, isCustomer, isTradesperson } = require('../middleware/auth');
const { calculateSemanticSimilarity } = require('../utils/semanticMatching');

const router = express.Router();

// Configure multer for job image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/jobs';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'job-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
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

// Get all job categories
router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM job_categories ORDER BY name ASC'
    );
    res.json({ categories: result.rows });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a new job posting (customers only)
router.post('/', authenticate, isCustomer, upload.array('images', 5), async (req, res) => {
  try {
    const {
      title,
      description,
      category_id,
      location,
      budget_min,
      budget_max,
      urgency,
      preferred_start_date,
      estimated_duration,
      required_skills,
      contact_preference
    } = req.body;

    // Validate required fields
    if (!title || !description || !category_id) {
      return res.status(400).json({ error: 'Title, description, and category are required' });
    }

    // Process uploaded images
    const imageUrls = req.files ? req.files.map(file => `/uploads/jobs/${file.filename}`) : [];

    // Parse required_skills if it's a string
    let skillsArray = [];
    if (required_skills) {
      try {
        skillsArray = typeof required_skills === 'string' 
          ? JSON.parse(required_skills) 
          : required_skills;
      } catch (e) {
        skillsArray = [required_skills]; // If it's just a single skill as string
      }
    }

    const result = await pool.query(
      `INSERT INTO job_postings (
        customer_id, category_id, title, description, location,
        budget_min, budget_max, urgency, preferred_start_date,
        estimated_duration, required_skills, images, contact_preference
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        req.user.id,
        category_id,
        title,
        description,
        location,
        budget_min || null,
        budget_max || null,
        urgency || 'medium',
        preferred_start_date || null,
        estimated_duration,
        skillsArray,
        imageUrls,
        contact_preference || 'platform'
      ]
    );

    const jobPosting = result.rows[0];

    // Create notifications for matching tradespeople
    await createJobNotifications(jobPosting);

    res.status(201).json({ job: jobPosting });
  } catch (error) {
    console.error('Create job posting error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get job postings (with filters)
router.get('/', async (req, res) => {
  try {
    const { 
      category_id, 
      location, 
      budget_min, 
      budget_max, 
      urgency, 
      status = 'open',
      page = 1, 
      limit = 10 
    } = req.query;

    let query = `
      SELECT 
        jp.*,
        jc.name as category_name,
        jc.icon as category_icon,
        u.first_name,
        u.last_name,
        cp.profile_image_url as customer_image,
        (SELECT COUNT(*) FROM job_bids WHERE job_id = jp.id) as bid_count
      FROM job_postings jp
      LEFT JOIN job_categories jc ON jp.category_id = jc.id
      LEFT JOIN users u ON jp.customer_id = u.id
      LEFT JOIN customer_profiles cp ON u.id = cp.user_id
      WHERE jp.status = $1
    `;

    const queryParams = [status];
    let paramCount = 1;

    if (category_id) {
      paramCount++;
      query += ` AND jp.category_id = $${paramCount}`;
      queryParams.push(category_id);
    }

    if (location) {
      paramCount++;
      query += ` AND jp.location ILIKE $${paramCount}`;
      queryParams.push(`%${location}%`);
    }

    if (budget_min) {
      paramCount++;
      query += ` AND (jp.budget_max IS NULL OR jp.budget_max >= $${paramCount})`;
      queryParams.push(budget_min);
    }

    if (budget_max) {
      paramCount++;
      query += ` AND (jp.budget_min IS NULL OR jp.budget_min <= $${paramCount})`;
      queryParams.push(budget_max);
    }

    if (urgency) {
      paramCount++;
      query += ` AND jp.urgency = $${paramCount}`;
      queryParams.push(urgency);
    }

    query += ` ORDER BY jp.created_at DESC`;

    // Add pagination
    const offset = (page - 1) * limit;
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    queryParams.push(limit);
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    queryParams.push(offset);

    const result = await pool.query(query, queryParams);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) 
      FROM job_postings jp 
      WHERE jp.status = $1
    `;
    const countParams = [status];
    let countParamIndex = 1;

    if (category_id) {
      countParamIndex++;
      countQuery += ` AND jp.category_id = $${countParamIndex}`;
      countParams.push(category_id);
    }

    if (location) {
      countParamIndex++;
      countQuery += ` AND jp.location ILIKE $${countParamIndex}`;
      countParams.push(`%${location}%`);
    }

    if (budget_min) {
      countParamIndex++;
      countQuery += ` AND (jp.budget_max IS NULL OR jp.budget_max >= $${countParamIndex})`;
      countParams.push(budget_min);
    }

    if (budget_max) {
      countParamIndex++;
      countQuery += ` AND (jp.budget_min IS NULL OR jp.budget_min <= $${countParamIndex})`;
      countParams.push(budget_max);
    }

    if (urgency) {
      countParamIndex++;
      countQuery += ` AND jp.urgency = $${countParamIndex}`;
      countParams.push(urgency);
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalJobs = parseInt(countResult.rows[0].count);

    res.json({
      jobs: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalJobs,
        totalPages: Math.ceil(totalJobs / limit)
      }
    });
  } catch (error) {
    console.error('Get job postings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get jobs for authenticated tradesperson (using semantic matching)
router.get('/for-me', authenticate, isTradesperson, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    console.log(`🔍 Fetching jobs for tradesperson ${req.user.id} using semantic matching`);

    // Get tradesperson profile with skills and portfolio
    const profileResult = await pool.query(`
      SELECT 
        tp.id as profile_id,
        tp.user_id,
        tp.bio,
        tp.business_name,
        ARRAY_AGG(DISTINCT s.skill_name) as skills
      FROM tradesperson_profiles tp
      LEFT JOIN skills s ON tp.id = s.tradesperson_id
      WHERE tp.user_id = $1
      GROUP BY tp.id, tp.user_id, tp.bio, tp.business_name
    `, [req.user.id]);

    if (profileResult.rows.length === 0) {
      return res.json({ jobs: [] });
    }

    const tradesperson = profileResult.rows[0];

    // Get portfolio projects
    const portfolioResult = await pool.query(
      `SELECT project_title, project_description 
       FROM portfolio_projects 
       WHERE tradesperson_id = $1
       ORDER BY completion_date DESC`,
      [tradesperson.profile_id]
    );

    const portfolio = portfolioResult.rows || [];

    // Prepare tradesperson data for semantic matching
    const tradespersonData = {
      bio: tradesperson.bio || '',
      business_name: tradesperson.business_name || '',
      skills: tradesperson.skills.filter(skill => skill !== null),
      portfolio: portfolio,
    };

    // Log profile data for debugging
    console.log(`📋 Tradesperson ${req.user.id} profile data:`, {
      hasBio: !!tradespersonData.bio,
      bioLength: tradespersonData.bio.length,
      hasBusinessName: !!tradespersonData.business_name,
      skillsCount: tradespersonData.skills.length,
      skills: tradespersonData.skills,
      portfolioCount: tradespersonData.portfolio.length,
    });

    // Get all open jobs
    const allJobsResult = await pool.query(`
      SELECT 
        jp.*,
        jc.name as category_name,
        jc.icon as category_icon,
        u.first_name,
        u.last_name,
        cp.profile_image_url as customer_image,
        (SELECT COUNT(*) FROM job_bids WHERE job_id = jp.id) as bid_count,
        (SELECT COUNT(*) FROM job_bids WHERE job_id = jp.id AND tradesperson_id = $1 AND status IN ('pending', 'accepted')) as my_bid_count
      FROM job_postings jp
      LEFT JOIN job_categories jc ON jp.category_id = jc.id
      LEFT JOIN users u ON jp.customer_id = u.id
      LEFT JOIN customer_profiles cp ON u.id = cp.user_id
      WHERE jp.status = 'open' 
        AND jp.expires_at > CURRENT_TIMESTAMP
      ORDER BY jp.created_at DESC
    `, [req.user.id]);

    const allJobs = allJobsResult.rows;
    console.log(`📊 Found ${allJobs.length} open jobs in database`);

    // Check if profile has enough data for semantic matching
    const hasProfileData = tradespersonData.bio || 
                          tradespersonData.business_name || 
                          tradespersonData.skills.length > 0 || 
                          tradespersonData.portfolio.length > 0;

    if (!hasProfileData) {
      console.warn(`⚠️ Tradesperson ${req.user.id} has minimal profile data. Consider adding bio, skills, or portfolio for better matching.`);
    }

    const matchedJobs = [];
    const similarityScores = []; // For debugging

    // Helper function for keyword-based matching (fallback) - STRICT matching only
    const calculateKeywordMatch = (job, tradespersonData) => {
      const jobText = `${job.title || ''} ${job.description || ''} ${(job.required_skills || []).join(' ')}`.toLowerCase();
      const profileText = `${tradespersonData.bio || ''} ${tradespersonData.business_name || ''} ${tradespersonData.skills.join(' ')} ${tradespersonData.portfolio.map(p => `${p.project_title || ''} ${p.project_description || ''}`).join(' ')}`.toLowerCase();

      // Define trade categories with their keywords and EXCLUSION keywords
      const tradeCategories = {
        mechanic: {
          keywords: ['mechanic', 'car', 'auto', 'automotive', 'vehicle', 'engine', 'repair', 'diagnostic', 'bmw', 'toyota', 'honda', 'ford', 'brake', 'transmission', 'battery', 'starter', 'oil change', 'tire', 'wheel', 'motor', 'drivetrain'],
          exclude: ['electric', 'wiring', 'circuit', 'electrical', 'plumb', 'pipe', 'drain', 'carpenter', 'wood', 'hvac', 'heating', 'cooling']
        },
        electrician: {
          keywords: ['electric', 'wiring', 'circuit', 'outlet', 'electrical', 'voltage', 'breaker', 'panel', 'wire', 'socket', 'switch'],
          exclude: ['mechanic', 'car', 'auto', 'automotive', 'engine', 'plumb', 'pipe', 'drain', 'carpenter', 'wood']
        },
        plumber: {
          keywords: ['plumb', 'pipe', 'drain', 'faucet', 'toilet', 'sink', 'water', 'sewer', 'leak', 'fixture'],
          exclude: ['mechanic', 'car', 'auto', 'electric', 'wiring', 'carpenter', 'wood']
        },
        carpenter: {
          keywords: ['carpenter', 'wood', 'furniture', 'cabinet', 'door', 'window', 'frame', 'trim', 'cabinetry'],
          exclude: ['mechanic', 'car', 'auto', 'electric', 'wiring', 'plumb', 'pipe']
        },
        hvac: {
          keywords: ['hvac', 'heating', 'cooling', 'air conditioning', 'furnace', 'ac', 'air conditioner', 'ventilation'],
          exclude: ['mechanic', 'car', 'auto', 'electric', 'wiring', 'plumb', 'pipe', 'carpenter', 'wood']
        }
      };

      // Determine which trade category the profile belongs to
      let profileTrade = null;
      let maxProfileMatches = 0;

      for (const [trade, data] of Object.entries(tradeCategories)) {
        const matches = data.keywords.filter(keyword => profileText.includes(keyword)).length;
        if (matches > maxProfileMatches) {
          maxProfileMatches = matches;
          profileTrade = trade;
        }
      }

      // If we can't determine the profile trade, don't use keyword matching
      if (!profileTrade || maxProfileMatches === 0) {
        return 0;
      }

      const profileTradeData = tradeCategories[profileTrade];

      // Check if job has EXCLUSION keywords (opposite trades) - if yes, definitely exclude
      const hasExclusionKeywords = profileTradeData.exclude.some(keyword => jobText.includes(keyword));
      if (hasExclusionKeywords) {
        console.log(`🚫 Job ${job.id} excluded: Has exclusion keywords for ${profileTrade}`);
        return 0; // Explicitly exclude
      }

      // Check if job has matching keywords for the profile's trade
      const jobHasMatchingKeywords = profileTradeData.keywords.some(keyword => jobText.includes(keyword));
      
      // Only match if BOTH job and profile have matching keywords for the SAME trade
      if (jobHasMatchingKeywords) {
        console.log(`🔑 Keyword match: Job ${job.id} matches ${profileTrade} profile`);
        return 0.4; // 40% match score for keyword fallback (lower than semantic)
      }

      return 0;
    };

    // Calculate semantic similarity for each job
    for (const job of allJobs) {
      try {
        let similarityScore = 0;
        
        // Try semantic matching first
        try {
          similarityScore = await calculateSemanticSimilarity(
            {
              title: job.title || '',
              description: job.description || '',
              required_skills: job.required_skills || [],
            },
            tradespersonData
          );
        } catch (semanticError) {
          console.warn(`⚠️ Semantic matching failed for job ${job.id}, using keyword fallback`);
          similarityScore = 0;
        }

        // If semantic score is low, try keyword matching as fallback
        // But keyword matching has exclusion logic, so always check it
        const keywordScore = calculateKeywordMatch(job, tradespersonData);
        
        // If keyword matching explicitly excludes (returns 0 after checking exclusions), don't include
        if (keywordScore === 0 && similarityScore < 0.35) {
          // Check if job has exclusion keywords - if so, skip this job entirely
          const jobText = `${job.title || ''} ${job.description || ''}`.toLowerCase();
          const profileText = `${tradespersonData.bio || ''} ${tradespersonData.business_name || ''}`.toLowerCase();
          
          // Quick exclusion check: if profile is clearly a mechanic and job is clearly electrician, exclude
          const isMechanicProfile = profileText.includes('mechanic') || profileText.includes('car') || profileText.includes('auto');
          const isElectricianJob = jobText.includes('electric') || jobText.includes('wiring') || jobText.includes('circuit');
          
          if (isMechanicProfile && isElectricianJob) {
            console.log(`🚫 Explicitly excluding job ${job.id} "${job.title}" - mechanic profile vs electrician job`);
            continue; // Skip this job
          }
        }
        
        // Use the higher of semantic or keyword score
        const finalScore = Math.max(similarityScore, keywordScore);
        
        if (keywordScore > 0) {
          console.log(`🔑 Keyword match found for job ${job.id}: "${job.title}" (score: ${finalScore.toFixed(2)})`);
        }

        similarityScores.push({
          jobId: job.id,
          title: job.title,
          score: finalScore,
          semanticScore: similarityScore,
          keywordScore: keywordScore,
          method: similarityScore >= 0.35 ? 'semantic' : (keywordScore > 0 ? 'keyword' : 'none')
        });

        // Use stricter threshold: 0.35 (35% match) for semantic, 0.4 for keyword
        // This ensures better matching and excludes irrelevant jobs
        const threshold = keywordScore > 0 ? 0.4 : 0.35;
        
        if (finalScore >= threshold) {
          matchedJobs.push({
            ...job,
            similarity_score: finalScore, // Include for debugging/sorting
          });
        }
      } catch (error) {
        console.error(`❌ Error processing job ${job.id}:`, error);
        // If everything fails, include job anyway (last resort fallback)
        matchedJobs.push({
          ...job,
          similarity_score: 0.3, // Default score for fallback
        });
      }
    }

    // Log similarity scores for debugging
    if (similarityScores.length > 0) {
      console.log(`📊 Similarity scores (top 5):`, 
        similarityScores
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
          .map(s => `Job ${s.jobId} (${s.title.substring(0, 30)}...): ${(s.score * 100).toFixed(1)}%`)
      );
    }

    // If very few jobs total (< 5), show all jobs regardless of match (temporary fallback for testing)
    // This helps diagnose if the issue is matching or lack of jobs
    if (allJobs.length > 0 && allJobs.length < 5 && matchedJobs.length === 0) {
      console.warn(`⚠️ Very few jobs (${allJobs.length}) and none matched. Showing all jobs as fallback.`);
      allJobs.forEach(job => {
        if (!matchedJobs.find(mj => mj.id === job.id)) {
          matchedJobs.push({
            ...job,
            similarity_score: 0.3, // Default score
          });
        }
      });
    }

    // Sort by similarity score (highest first), then by creation date
    matchedJobs.sort((a, b) => {
      if (b.similarity_score !== a.similarity_score) {
        return b.similarity_score - a.similarity_score;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // Apply pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const paginatedJobs = matchedJobs.slice(offset, offset + parseInt(limit));

    // Remove similarity_score from response (internal use only)
    const jobsWithoutScore = paginatedJobs.map(({ similarity_score, ...job }) => job);

    console.log(`✅ Found ${matchedJobs.length} matching jobs for tradesperson ${req.user.id} (showing ${jobsWithoutScore.length} on page ${page})`);

    if (matchedJobs.length === 0 && allJobs.length > 0) {
      console.warn(`⚠️ No jobs matched for tradesperson ${req.user.id} despite ${allJobs.length} open jobs.`);
      console.warn(`   Profile completeness: bio=${!!tradespersonData.bio}, skills=${tradespersonData.skills.length}, portfolio=${tradespersonData.portfolio.length}`);
      console.warn(`   Profile text sample: "${tradespersonData.bio.substring(0, 50)}..."`);
      if (allJobs.length > 0) {
        console.warn(`   Sample job titles: ${allJobs.slice(0, 3).map(j => `"${j.title}"`).join(', ')}`);
      }
      console.warn(`   Consider: 1) Adding more details to profile (bio, skills, portfolio) 2) Checking if jobs match your expertise`);
    }

    res.json({ 
      jobs: jobsWithoutScore,
      total: matchedJobs.length,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(matchedJobs.length / parseInt(limit))
    });
  } catch (error) {
    console.error('❌ Get jobs for tradesperson error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Server error',
      message: error.message 
    });
  }
});

// Get customer's own job postings
router.get('/my-jobs', authenticate, isCustomer, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        jp.*,
        jc.name as category_name,
        jc.icon as category_icon,
        (SELECT COUNT(*) FROM job_bids WHERE job_id = jp.id) as bid_count
      FROM job_postings jp
      LEFT JOIN job_categories jc ON jp.category_id = jc.id
      WHERE jp.customer_id = $1
      ORDER BY jp.created_at DESC`,
      [req.user.id]
    );

    res.json({ jobs: result.rows });
  } catch (error) {
    console.error('Get my jobs error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single job posting with details
// Note: Authentication is optional - public can view job, but bids are filtered
router.get('/:id', optionalAuthenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        jp.*,
        jc.name as category_name,
        jc.icon as category_icon,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        cp.profile_image_url as customer_image,
        cp.location as customer_location
      FROM job_postings jp
      LEFT JOIN job_categories jc ON jp.category_id = jc.id
      LEFT JOIN users u ON jp.customer_id = u.id
      LEFT JOIN customer_profiles cp ON u.id = cp.user_id
      WHERE jp.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job posting not found' });
    }

    const job = result.rows[0];

    // Get bids for this job - PRIVATE: Only show to job owner OR the tradesperson who placed the bid
    // Other tradespeople cannot see other tradespeople's bids
    const isJobOwner = req.user && job.customer_id === req.user.id;
    const isTradesperson = req.user && req.user.role === 'tradesperson';
    
    let bidsQuery = `
      SELECT 
        jb.*,
        u.first_name,
        u.last_name,
        tp.business_name,
        tp.profile_image_url,
        tp.hourly_rate,
        tp.verification_status,
        (SELECT AVG(rating) FROM reviews WHERE tradesperson_id = jb.tradesperson_id) as avg_rating,
        (SELECT COUNT(*) FROM reviews WHERE tradesperson_id = jb.tradesperson_id) as review_count
      FROM job_bids jb
      LEFT JOIN users u ON jb.tradesperson_id = u.id
      LEFT JOIN tradesperson_profiles tp ON u.id = tp.user_id
      WHERE jb.job_id = $1
    `;
    
    const bidsParams = [id];
    
    if (isJobOwner) {
      // Job owner (customer) can see ALL bids
      // No additional filter needed
    } else if (isTradesperson && req.user) {
      // Tradesperson can ONLY see their own bid
      bidsQuery += ` AND jb.tradesperson_id = $2`;
      bidsParams.push(req.user.id);
    } else {
      // Not authenticated or not job owner/tradesperson - don't show any bids
      bidsQuery += ` AND 1 = 0`; // Always false - no bids shown
    }
    
    bidsQuery += ` ORDER BY jb.created_at ASC`;
    
    const bidsResult = await pool.query(bidsQuery, bidsParams);
    job.bids = bidsResult.rows;
    
    // Hide total bid count from tradespeople (only show to job owner)
    // Calculate actual bid count for job owner, hide it for others
    if (isJobOwner) {
      // Job owner sees actual bid count
      const totalBidCountResult = await pool.query(
        'SELECT COUNT(*) FROM job_bids WHERE job_id = $1',
        [id]
      );
      job.bid_count = parseInt(totalBidCountResult.rows[0].count);
    } else {
      // For tradespeople or unauthenticated users, don't reveal total bid count
      // Only show count of bids they can see (their own)
      job.bid_count = job.bids.length;
    }

    res.json({ job });
  } catch (error) {
    console.error('Get job details error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update job posting status
router.patch('/:id/status', authenticate, isCustomer, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['open', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Get current job status
    const currentJobResult = await pool.query(
      'SELECT status, customer_id FROM job_postings WHERE id = $1',
      [id]
    );

    if (currentJobResult.rows.length === 0) {
      return res.status(404).json({ error: 'Job posting not found' });
    }

    const currentJob = currentJobResult.rows[0];

    // Verify ownership
    if (currentJob.customer_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized: You can only update your own job postings' });
    }

    // If canceling, handle accepted bids
    if (status === 'cancelled') {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Update job status to cancelled
        await client.query(
          `UPDATE job_postings 
           SET status = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $2`,
          [status, id]
        );

        // If there are accepted bids, mark them as rejected
        const acceptedBidsResult = await client.query(
          'SELECT id FROM job_bids WHERE job_id = $1 AND status = $2',
          [id, 'accepted']
        );

        if (acceptedBidsResult.rows.length > 0) {
          await client.query(
            'UPDATE job_bids SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE job_id = $2 AND status = $3',
            ['rejected', id, 'accepted']
          );
          console.log(`✅ Cancelled job ${id}: Rejected ${acceptedBidsResult.rows.length} accepted bid(s)`);
        }

        await client.query('COMMIT');

        // Get updated job
        const updatedJobResult = await client.query(
          'SELECT * FROM job_postings WHERE id = $1',
          [id]
        );

        res.json({ job: updatedJobResult.rows[0] });
        client.release();
      } catch (error) {
        await client.query('ROLLBACK');
        client.release();
        throw error;
      }
    } else {
      // For other status updates, just update normally
      const result = await pool.query(
        `UPDATE job_postings 
         SET status = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2 AND customer_id = $3 
         RETURNING *`,
        [status, id, req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Job posting not found or unauthorized' });
      }

      res.json({ job: result.rows[0] });
    }
  } catch (error) {
    console.error('Update job status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete job posting (customers only)
router.delete('/:id', authenticate, isCustomer, async (req, res) => {
  try {
    const { id } = req.params;

    // First, verify the job exists and belongs to the customer
    const jobCheck = await pool.query(
      'SELECT id, customer_id, title FROM job_postings WHERE id = $1',
      [id]
    );

    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Job posting not found' });
    }

    const job = jobCheck.rows[0];

    // Verify ownership
    if (job.customer_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized: You can only delete your own job postings' });
    }

    // Check if job has accepted bids (prevent deletion if work has started)
    const acceptedBidsResult = await pool.query(
      'SELECT COUNT(*) FROM job_bids WHERE job_id = $1 AND status = $2',
      [id, 'accepted']
    );

    const acceptedBidsCount = parseInt(acceptedBidsResult.rows[0].count);

    // Allow deletion if job is already cancelled
    const jobStatus = jobCheck.rows[0].status;
    if (acceptedBidsCount > 0 && jobStatus !== 'cancelled') {
      return res.status(400).json({ 
        error: 'Cannot delete job: This job has accepted bids. Please cancel the job first, then you can delete it.' 
      });
    }

    // Delete the job (CASCADE will handle related records: bids, notifications, messages)
    await pool.query(
      'DELETE FROM job_postings WHERE id = $1',
      [id]
    );

    console.log(`✅ Job ${id} "${job.title}" deleted by customer ${req.user.id}`);

    res.json({ 
      message: 'Job posting deleted successfully',
      deletedJobId: id
    });
  } catch (error) {
    console.error('Delete job posting error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Helper function to calculate skill similarity score
function calculateSkillSimilarity(jobSkills, tradePersonSkills) {
  if (!jobSkills || jobSkills.length === 0) return 1; // If no specific skills required, match everyone
  if (!tradePersonSkills || tradePersonSkills.length === 0) return 0; // If tradesperson has no skills, no match

  const jobSkillsLower = jobSkills.map(skill => skill.toLowerCase().trim());
  const tradePersonSkillsLower = tradePersonSkills.map(skill => skill.toLowerCase().trim());

  // Direct skill matches
  const directMatches = jobSkillsLower.filter(jobSkill => 
    tradePersonSkillsLower.some(tpSkill => 
      tpSkill.includes(jobSkill) || jobSkill.includes(tpSkill)
    )
  ).length;

  // Category-based matching (automotive, plumbing, etc.)
  const categoryKeywords = {
    automotive: ['mechanic', 'car', 'auto', 'vehicle', 'engine', 'brake', 'transmission'],
    plumbing: ['plumber', 'pipe', 'water', 'drain', 'faucet', 'toilet', 'sink'],
    electrical: ['electrician', 'electric', 'wiring', 'outlet', 'circuit', 'voltage'],
    hvac: ['heating', 'cooling', 'air conditioning', 'furnace', 'hvac', 'ventilation'],
    carpentry: ['carpenter', 'wood', 'furniture', 'cabinet', 'door', 'window'],
    appliances: ['appliance', 'refrigerator', 'washer', 'dryer', 'dishwasher', 'oven']
  };

  let categoryMatches = 0;
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    const jobHasCategory = jobSkillsLower.some(skill => 
      keywords.some(keyword => skill.includes(keyword))
    );
    const tpHasCategory = tradePersonSkillsLower.some(skill => 
      keywords.some(keyword => skill.includes(keyword))
    );
    if (jobHasCategory && tpHasCategory) {
      categoryMatches++;
    }
  }

  // Calculate similarity score (0-1)
  const directScore = directMatches / jobSkillsLower.length;
  const categoryScore = categoryMatches > 0 ? 0.5 : 0;
  
  return Math.min(directScore + categoryScore, 1);
}

// Helper function to create notifications for matching tradespeople
async function createJobNotifications(jobPosting) {
  try {
    console.log(`🔍 Starting semantic matching for job ${jobPosting.id}: "${jobPosting.title}"`);

    // Get all available tradespeople with their skills and portfolio
    const tradespeopleResult = await pool.query(`
      SELECT 
        tp.id as profile_id,
        tp.user_id,
        tp.bio,
        tp.business_name,
        ARRAY_AGG(DISTINCT s.skill_name) as skills
      FROM tradesperson_profiles tp
      LEFT JOIN skills s ON tp.id = s.tradesperson_id
      WHERE tp.availability_status = 'available'
      GROUP BY tp.id, tp.user_id, tp.bio, tp.business_name
    `);

    const matchingTradespeople = [];

    // Process each tradesperson and calculate semantic similarity
    for (const tradesperson of tradespeopleResult.rows) {
      try {
        // Get portfolio projects for this tradesperson
        const portfolioResult = await pool.query(
          `SELECT project_title, project_description 
           FROM portfolio_projects 
           WHERE tradesperson_id = $1
           ORDER BY completion_date DESC`,
          [tradesperson.profile_id]
        );

        const portfolio = portfolioResult.rows || [];

        // Prepare tradesperson data for semantic matching
        const tradespersonData = {
          bio: tradesperson.bio || '',
          business_name: tradesperson.business_name || '',
          skills: tradesperson.skills.filter(skill => skill !== null),
          portfolio: portfolio,
        };

        // Calculate semantic similarity using embeddings
        const similarityScore = await calculateSemanticSimilarity(
          {
            title: jobPosting.title || '',
            description: jobPosting.description || '',
            required_skills: jobPosting.required_skills || [],
          },
          tradespersonData
        );

        console.log(`  📊 User ${tradesperson.user_id}: similarity = ${similarityScore.toFixed(3)}`);

        // Only notify if similarity score is above threshold (0.4 = 40% match)
        // This threshold ensures we only notify relevant tradespeople
        if (similarityScore >= 0.4) {
          matchingTradespeople.push({
            user_id: tradesperson.user_id,
            score: similarityScore,
          });
        }
      } catch (error) {
        console.error(`Error processing tradesperson ${tradesperson.user_id}:`, error);
        // Continue with next tradesperson if one fails
        continue;
      }
    }

    // Sort by similarity score (highest first)
    matchingTradespeople.sort((a, b) => b.score - a.score);

    // Create notifications for matching tradespeople
    for (const tradesperson of matchingTradespeople) {
      await pool.query(
        `INSERT INTO job_notifications (job_id, tradesperson_id, notification_type)
         VALUES ($1, $2, 'new_job')
         ON CONFLICT (job_id, tradesperson_id) DO NOTHING`,
        [jobPosting.id, tradesperson.user_id]
      );
    }

    console.log(`✅ Created notifications for ${matchingTradespeople.length} matching tradespeople for job ${jobPosting.id}`);
    if (matchingTradespeople.length > 0) {
      console.log('🏆 Top matches:', matchingTradespeople.slice(0, 5).map(t => `User ${t.user_id}: ${(t.score * 100).toFixed(1)}%`));
    }
  } catch (error) {
    console.error('❌ Error creating job notifications:', error);
    // Don't throw - we don't want job creation to fail if matching fails
  }
}

module.exports = router;
