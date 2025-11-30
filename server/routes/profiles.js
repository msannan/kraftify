const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/database');
const { authenticate, isTradesperson } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/profiles';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
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

// Get current user's profile
router.get('/me', authenticate, isTradesperson, async (req, res) => {
  try {
    const profileResult = await pool.query(
      `SELECT tp.*, u.first_name, u.last_name, u.email, u.phone
       FROM tradesperson_profiles tp
       JOIN users u ON tp.user_id = u.id
       WHERE tp.user_id = $1`,
      [req.user.id]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const profile = profileResult.rows[0];

    // Get skills
    const skillsResult = await pool.query(
      'SELECT * FROM skills WHERE tradesperson_id = $1 ORDER BY created_at DESC',
      [profile.id]
    );

    // Get certifications (education)
    const certsResult = await pool.query(
      'SELECT * FROM certifications WHERE tradesperson_id = $1 ORDER BY issue_date DESC',
      [profile.id]
    );

    // Get portfolio projects
    const projectsResult = await pool.query(
      'SELECT * FROM portfolio_projects WHERE tradesperson_id = $1 ORDER BY completion_date DESC',
      [profile.id]
    );

    res.json({
      profile: {
        ...profile,
        skills: skillsResult.rows,
        certifications: certsResult.rows,
        portfolio: projectsResult.rows,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get tradesperson profile by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get profile
    const profileResult = await pool.query(
      `SELECT tp.*, u.first_name, u.last_name, u.email, u.phone
       FROM tradesperson_profiles tp
       JOIN users u ON tp.user_id = u.id
       WHERE tp.id = $1`,
      [id]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const profile = profileResult.rows[0];

    // Get skills
    const skillsResult = await pool.query(
      'SELECT * FROM skills WHERE tradesperson_id = $1 ORDER BY created_at DESC',
      [id]
    );

    // Get certifications
    const certsResult = await pool.query(
      'SELECT * FROM certifications WHERE tradesperson_id = $1 ORDER BY issue_date DESC',
      [id]
    );

    // Get portfolio projects
    const projectsResult = await pool.query(
      'SELECT * FROM portfolio_projects WHERE tradesperson_id = $1 ORDER BY completion_date DESC',
      [id]
    );

    // Get reviews and average rating
    const reviewsResult = await pool.query(
      `SELECT r.*, u.first_name, u.last_name
       FROM reviews r
       JOIN users u ON r.customer_id = u.id
       WHERE r.tradesperson_id = $1
       ORDER BY r.created_at DESC`,
      [id]
    );

    const avgRatingResult = await pool.query(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews FROM reviews WHERE tradesperson_id = $1',
      [id]
    );

    res.json({
      profile: {
        ...profile,
        skills: skillsResult.rows,
        certifications: certsResult.rows,
        portfolio: projectsResult.rows,
        reviews: reviewsResult.rows,
        averageRating: parseFloat(avgRatingResult.rows[0]?.avg_rating || 0),
        totalReviews: parseInt(avgRatingResult.rows[0]?.total_reviews || 0),
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload profile image
router.post('/me/upload-image', authenticate, isTradesperson, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get user's profile
    const profileResult = await pool.query(
      'SELECT id FROM tradesperson_profiles WHERE user_id = $1',
      [req.user.id]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Construct image URL (in production, this would be a CDN URL)
    const imageUrl = `/uploads/profiles/${req.file.filename}`;

    // Update profile with image URL
    await pool.query(
      'UPDATE tradesperson_profiles SET profile_image_url = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [imageUrl, req.user.id]
    );

    res.json({ imageUrl, message: 'Image uploaded successfully' });
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update tradesperson profile
router.put('/me', authenticate, isTradesperson, async (req, res) => {
  try {
    const {
      businessName,
      bio,
      aboutMe,
      portfolioDescription,
      location,
      hourlyRate,
      availabilityStatus,
    } = req.body;

    // Get user's profile ID
    const profileResult = await pool.query(
      'SELECT id FROM tradesperson_profiles WHERE user_id = $1',
      [req.user.id]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const profileId = profileResult.rows[0].id;

    // Update profile - using bio for aboutMe if aboutMe is provided
    const updateBio = aboutMe || bio;
    const result = await pool.query(
      `UPDATE tradesperson_profiles
       SET business_name = COALESCE($1, business_name),
           bio = COALESCE($2, bio),
           location = COALESCE($3, location),
           hourly_rate = COALESCE($4, hourly_rate),
           availability_status = COALESCE($5, availability_status),
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $6
       RETURNING *`,
      [businessName, updateBio, location, hourlyRate, availabilityStatus, req.user.id]
    );

    // Store portfolio description in a portfolio project if provided
    if (portfolioDescription) {
      // Check if a portfolio description project exists
      const existingPortfolio = await pool.query(
        'SELECT id FROM portfolio_projects WHERE tradesperson_id = $1 AND project_title = $2',
        [profileId, 'Portfolio Description']
      );

      if (existingPortfolio.rows.length > 0) {
        await pool.query(
          'UPDATE portfolio_projects SET project_description = $1 WHERE id = $2',
          [portfolioDescription, existingPortfolio.rows[0].id]
        );
      } else {
        await pool.query(
          'INSERT INTO portfolio_projects (tradesperson_id, project_title, project_description) VALUES ($1, $2, $3)',
          [profileId, 'Portfolio Description', portfolioDescription]
        );
      }
    }

    res.json({ profile: result.rows[0] });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add education/certification
router.post('/me/education', authenticate, isTradesperson, async (req, res) => {
  try {
    const { certificationName, issuingOrganization, issueDate, expiryDate, certificateUrl } = req.body;

    // Get user's profile ID
    const profileResult = await pool.query(
      'SELECT id FROM tradesperson_profiles WHERE user_id = $1',
      [req.user.id]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const profileId = profileResult.rows[0].id;

    const result = await pool.query(
      `INSERT INTO certifications (tradesperson_id, certification_name, issuing_organization, issue_date, expiry_date, certificate_url)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [profileId, certificationName, issuingOrganization || null, issueDate || null, expiryDate || null, certificateUrl || null]
    );

    res.status(201).json({ certification: result.rows[0] });
  } catch (error) {
    console.error('Add education error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get education/certifications
router.get('/me/education', authenticate, isTradesperson, async (req, res) => {
  try {
    const profileResult = await pool.query(
      'SELECT id FROM tradesperson_profiles WHERE user_id = $1',
      [req.user.id]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const result = await pool.query(
      'SELECT * FROM certifications WHERE tradesperson_id = $1 ORDER BY issue_date DESC',
      [profileResult.rows[0].id]
    );

    res.json({ certifications: result.rows });
  } catch (error) {
    console.error('Get education error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete education/certification
router.delete('/me/education/:id', authenticate, isTradesperson, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const profileResult = await pool.query(
      'SELECT id FROM tradesperson_profiles WHERE user_id = $1',
      [req.user.id]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const certResult = await pool.query(
      'SELECT tradesperson_id FROM certifications WHERE id = $1',
      [id]
    );

    if (certResult.rows.length === 0) {
      return res.status(404).json({ error: 'Certification not found' });
    }

    if (certResult.rows[0].tradesperson_id !== profileResult.rows[0].id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await pool.query('DELETE FROM certifications WHERE id = $1', [id]);

    res.json({ message: 'Education entry deleted successfully' });
  } catch (error) {
    console.error('Delete education error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update tradesperson profile (by ID - for backward compatibility)
router.put('/:id', authenticate, isTradesperson, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      businessName,
      bio,
      location,
      hourlyRate,
      availabilityStatus,
      profileImageUrl,
      coverImageUrl,
    } = req.body;

    // Verify ownership
    const profileCheck = await pool.query(
      'SELECT user_id FROM tradesperson_profiles WHERE id = $1',
      [id]
    );

    if (profileCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    if (profileCheck.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update profile
    const result = await pool.query(
      `UPDATE tradesperson_profiles
       SET business_name = COALESCE($1, business_name),
           bio = COALESCE($2, bio),
           location = COALESCE($3, location),
           hourly_rate = COALESCE($4, hourly_rate),
           availability_status = COALESCE($5, availability_status),
           profile_image_url = COALESCE($6, profile_image_url),
           cover_image_url = COALESCE($7, cover_image_url),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [businessName, bio, location, hourlyRate, availabilityStatus, profileImageUrl, coverImageUrl, id]
    );

    res.json({ profile: result.rows[0] });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add skill
router.post('/:id/skills', authenticate, isTradesperson, async (req, res) => {
  try {
    const { id } = req.params;
    const { skillName, experienceYears } = req.body;

    // Verify ownership
    const profileCheck = await pool.query(
      'SELECT user_id FROM tradesperson_profiles WHERE id = $1',
      [id]
    );

    if (profileCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    if (profileCheck.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      'INSERT INTO skills (tradesperson_id, skill_name, experience_years) VALUES ($1, $2, $3) RETURNING *',
      [id, skillName, experienceYears || null]
    );

    res.status(201).json({ skill: result.rows[0] });
  } catch (error) {
    console.error('Add skill error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add certification
router.post('/:id/certifications', authenticate, isTradesperson, async (req, res) => {
  try {
    const { id } = req.params;
    const { certificationName, issuingOrganization, issueDate, expiryDate, certificateUrl } = req.body;

    // Verify ownership
    const profileCheck = await pool.query(
      'SELECT user_id FROM tradesperson_profiles WHERE id = $1',
      [id]
    );

    if (profileCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    if (profileCheck.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      `INSERT INTO certifications (tradesperson_id, certification_name, issuing_organization, issue_date, expiry_date, certificate_url)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, certificationName, issuingOrganization || null, issueDate || null, expiryDate || null, certificateUrl || null]
    );

    res.status(201).json({ certification: result.rows[0] });
  } catch (error) {
    console.error('Add certification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add portfolio project
router.post('/:id/portfolio', authenticate, isTradesperson, async (req, res) => {
  try {
    const { id } = req.params;
    const { projectTitle, projectDescription, projectType, completionDate, imageUrls } = req.body;

    // Verify ownership
    const profileCheck = await pool.query(
      'SELECT user_id FROM tradesperson_profiles WHERE id = $1',
      [id]
    );

    if (profileCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    if (profileCheck.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      `INSERT INTO portfolio_projects (tradesperson_id, project_title, project_description, project_type, completion_date, image_urls)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, projectTitle, projectDescription || null, projectType || null, completionDate || null, imageUrls || []]
    );

    res.status(201).json({ project: result.rows[0] });
  } catch (error) {
    console.error('Add portfolio project error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
