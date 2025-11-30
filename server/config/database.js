const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'kraftify',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

// Create tables if they don't exist
const createTables = async () => {
  const client = await pool.connect();
  try {
    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('tradesperson', 'customer')),
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tradesperson profiles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tradesperson_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        business_name VARCHAR(255),
        bio TEXT,
        location VARCHAR(255),
        hourly_rate DECIMAL(10, 2),
        availability_status VARCHAR(20) DEFAULT 'available',
        verification_status VARCHAR(20) DEFAULT 'pending',
        verified_at TIMESTAMP,
        profile_image_url VARCHAR(500),
        cover_image_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Customer profiles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS customer_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        bio TEXT,
        location VARCHAR(255),
        profile_image_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Skills table
    await client.query(`
      CREATE TABLE IF NOT EXISTS skills (
        id SERIAL PRIMARY KEY,
        tradesperson_id INTEGER REFERENCES tradesperson_profiles(id) ON DELETE CASCADE,
        skill_name VARCHAR(100) NOT NULL,
        experience_years INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Certifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS certifications (
        id SERIAL PRIMARY KEY,
        tradesperson_id INTEGER REFERENCES tradesperson_profiles(id) ON DELETE CASCADE,
        certification_name VARCHAR(255) NOT NULL,
        issuing_organization VARCHAR(255),
        issue_date DATE,
        expiry_date DATE,
        certificate_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Portfolio projects table
    await client.query(`
      CREATE TABLE IF NOT EXISTS portfolio_projects (
        id SERIAL PRIMARY KEY,
        tradesperson_id INTEGER REFERENCES tradesperson_profiles(id) ON DELETE CASCADE,
        project_title VARCHAR(255) NOT NULL,
        project_description TEXT,
        project_type VARCHAR(100),
        completion_date DATE,
        image_urls TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Bookings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        tradesperson_id INTEGER REFERENCES tradesperson_profiles(id) ON DELETE CASCADE,
        project_title VARCHAR(255) NOT NULL,
        project_description TEXT,
        project_type VARCHAR(100),
        estimated_hours DECIMAL(10, 2),
        hourly_rate DECIMAL(10, 2),
        total_amount DECIMAL(10, 2),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'cancelled')),
        start_date DATE,
        end_date DATE,
        location VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Reviews table
    await client.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
        customer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        tradesperson_id INTEGER REFERENCES tradesperson_profiles(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Payments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
        customer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        tradesperson_id INTEGER REFERENCES tradesperson_profiles(id) ON DELETE CASCADE,
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        payment_method VARCHAR(50),
        stripe_payment_intent_id VARCHAR(255),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Job categories table
    await client.query(`
      CREATE TABLE IF NOT EXISTS job_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        icon VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Job postings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS job_postings (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        category_id INTEGER REFERENCES job_categories(id),
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        location VARCHAR(255),
        budget_min DECIMAL(10, 2),
        budget_max DECIMAL(10, 2),
        urgency VARCHAR(20) DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high', 'urgent')),
        status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
        preferred_start_date DATE,
        estimated_duration VARCHAR(100),
        required_skills TEXT[], -- Array of skill names
        images TEXT[], -- Array of image URLs
        contact_preference VARCHAR(20) DEFAULT 'platform' CHECK (contact_preference IN ('platform', 'phone', 'email')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days')
      )
    `);

    // Job bids table
    await client.query(`
      CREATE TABLE IF NOT EXISTS job_bids (
        id SERIAL PRIMARY KEY,
        job_id INTEGER REFERENCES job_postings(id) ON DELETE CASCADE,
        tradesperson_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        bid_amount DECIMAL(10, 2) NOT NULL,
        estimated_duration VARCHAR(100),
        proposal TEXT NOT NULL,
        availability_date DATE,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(job_id, tradesperson_id)
      )
    `);

    // Job notifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS job_notifications (
        id SERIAL PRIMARY KEY,
        job_id INTEGER REFERENCES job_postings(id) ON DELETE CASCADE,
        tradesperson_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        notification_type VARCHAR(50) DEFAULT 'new_job',
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(job_id, tradesperson_id)
      )
    `);

    // Messages table for in-platform communication
    // job_id can be NULL for direct contact messages (not related to a job)
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        job_id INTEGER REFERENCES job_postings(id) ON DELETE CASCADE,
        sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
        attachment_url VARCHAR(500),
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Message threads table to group conversations
    // job_id can be NULL for direct contact messages
    await client.query(`
      CREATE TABLE IF NOT EXISTS message_threads (
        id SERIAL PRIMARY KEY,
        job_id INTEGER REFERENCES job_postings(id) ON DELETE CASCADE,
        customer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        tradesperson_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(job_id, customer_id, tradesperson_id)
      )
    `);
    
    // Update unique constraint to allow NULL job_id for direct contact
    // PostgreSQL handles NULL in UNIQUE constraints specially - multiple NULLs are allowed
    // But we want to ensure one thread per customer-tradesperson pair when job_id is NULL
    // So we'll create a partial unique index
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS message_threads_direct_contact 
      ON message_threads (customer_id, tradesperson_id) 
      WHERE job_id IS NULL
    `);

    // Insert default job categories
    await client.query(`
      INSERT INTO job_categories (name, description, icon) VALUES
        ('Automotive', 'Car repairs, maintenance, and automotive services', 'car'),
        ('Home Appliances', 'Repair and maintenance of household appliances', 'appliances'),
        ('Plumbing', 'Plumbing repairs, installations, and maintenance', 'plumbing'),
        ('Electrical', 'Electrical work, wiring, and installations', 'electrical'),
        ('HVAC', 'Heating, ventilation, and air conditioning services', 'hvac'),
        ('Carpentry', 'Wood work, furniture repair, and carpentry services', 'carpentry'),
        ('Painting', 'Interior and exterior painting services', 'painting'),
        ('Cleaning', 'House cleaning and maintenance services', 'cleaning'),
        ('Landscaping', 'Garden maintenance and landscaping services', 'landscaping'),
        ('Technology', 'Computer repair, IT support, and tech services', 'technology'),
        ('Moving', 'Moving and transportation services', 'moving'),
        ('General Handyman', 'General repair and maintenance services', 'handyman')
      ON CONFLICT (name) DO NOTHING
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_tradesperson_user_id ON tradesperson_profiles(user_id);
      CREATE INDEX IF NOT EXISTS idx_customer_user_id ON customer_profiles(user_id);
      CREATE INDEX IF NOT EXISTS idx_skills_tradesperson_id ON skills(tradesperson_id);
      CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
      CREATE INDEX IF NOT EXISTS idx_bookings_tradesperson_id ON bookings(tradesperson_id);
      CREATE INDEX IF NOT EXISTS idx_reviews_tradesperson_id ON reviews(tradesperson_id);
      CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
      CREATE INDEX IF NOT EXISTS idx_job_postings_customer_id ON job_postings(customer_id);
      CREATE INDEX IF NOT EXISTS idx_job_postings_category_id ON job_postings(category_id);
      CREATE INDEX IF NOT EXISTS idx_job_postings_status ON job_postings(status);
      CREATE INDEX IF NOT EXISTS idx_job_bids_job_id ON job_bids(job_id);
      CREATE INDEX IF NOT EXISTS idx_job_bids_tradesperson_id ON job_bids(tradesperson_id);
      CREATE INDEX IF NOT EXISTS idx_job_notifications_tradesperson_id ON job_notifications(tradesperson_id);
      CREATE INDEX IF NOT EXISTS idx_job_notifications_is_read ON job_notifications(is_read);
      CREATE INDEX IF NOT EXISTS idx_messages_job_id ON messages(job_id);
      CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
      CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
      CREATE INDEX IF NOT EXISTS idx_message_threads_job_id ON message_threads(job_id);
      CREATE INDEX IF NOT EXISTS idx_message_threads_customer_id ON message_threads(customer_id);
      CREATE INDEX IF NOT EXISTS idx_message_threads_tradesperson_id ON message_threads(tradesperson_id);
    `);

    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
  } finally {
    client.release();
  }
};

// Run table creation on module load
createTables();

module.exports = pool;

