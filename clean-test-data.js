#!/usr/bin/env node

// Script to clean all test data from the application
// This will delete test users and all associated data

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'kraftify',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function cleanTestData() {
  const client = await pool.connect();
  
  try {
    console.log('🧹 Starting test data cleanup...\n');

    // Start transaction
    await client.query('BEGIN');

    // 1. Delete test users (emails containing 'test', 'example', or integration test patterns)
    console.log('📋 Identifying test users...');
    const testUsersResult = await client.query(`
      SELECT id, email, role 
      FROM users 
      WHERE email LIKE '%test%' 
         OR email LIKE '%example%' 
         OR email LIKE '%@test.%'
         OR email LIKE 'testcustomer%@%'
         OR email LIKE 'testtrade%@%'
         OR email LIKE 'jobcustomer%@%'
         OR email LIKE 'bidtradesperson%@%'
         OR email LIKE 'viewbidscustomer%@%'
         OR email LIKE 'tradesperson%@%'
         OR email LIKE 'anothertrade%@%'
         OR email LIKE 'nonowner%@%'
         OR email LIKE 'jobowner%@%'
      ORDER BY id
    `);

    const testUserIds = testUsersResult.rows.map(u => u.id);
    let testJobsResult = { rows: [] };
    
    if (testUserIds.length === 0) {
      console.log('✅ No test users found.\n');
    } else {
      console.log(`Found ${testUserIds.length} test users:`);
      testUsersResult.rows.forEach(u => {
        console.log(`  - ${u.email} (${u.role}, ID: ${u.id})`);
      });
      console.log('');

      // Delete in order to respect foreign key constraints
      console.log('🗑️  Deleting test data...');

      // Delete notifications (uses tradesperson_id, not user_id)
      await client.query('DELETE FROM job_notifications WHERE tradesperson_id = ANY($1)', [testUserIds]);
      console.log('  ✓ Deleted job notifications');

      // Delete messages
      await client.query('DELETE FROM messages WHERE sender_id = ANY($1) OR receiver_id = ANY($1)', [testUserIds]);
      console.log('  ✓ Deleted messages');

      // Delete message threads (uses customer_id and tradesperson_id)
      await client.query('DELETE FROM message_threads WHERE customer_id = ANY($1) OR tradesperson_id = ANY($1)', [testUserIds]);
      console.log('  ✓ Deleted message threads');

      // Delete bids
      await client.query('DELETE FROM job_bids WHERE tradesperson_id = ANY($1)', [testUserIds]);
      console.log('  ✓ Deleted bids');

      // Delete jobs posted by test customers
      try {
        testJobsResult = await client.query('SELECT id FROM job_postings WHERE customer_id = ANY($1)', [testUserIds]);
        const testJobIds = testJobsResult.rows.map(j => j.id);
        if (testJobIds.length > 0) {
          await client.query('DELETE FROM job_notifications WHERE job_id = ANY($1)', [testJobIds]);
          await client.query('DELETE FROM job_bids WHERE job_id = ANY($1)', [testJobIds]);
          await client.query('DELETE FROM job_postings WHERE id = ANY($1)', [testJobIds]);
          console.log(`  ✓ Deleted ${testJobIds.length} test jobs and associated data`);
        }
      } catch (err) {
        // If query fails, continue
        console.log('  ⚠️  Could not delete test jobs:', err.message);
      }

      // Delete reviews
      await client.query('DELETE FROM reviews WHERE customer_id = ANY($1) OR tradesperson_id = ANY($1)', [testUserIds]);
      console.log('  ✓ Deleted reviews');

      // Delete portfolio projects
      await client.query(`
        DELETE FROM portfolio_projects 
        WHERE tradesperson_id IN (
          SELECT id FROM tradesperson_profiles WHERE user_id = ANY($1)
        )
      `, [testUserIds]);
      console.log('  ✓ Deleted portfolio projects');

      // Delete certifications
      await client.query(`
        DELETE FROM certifications 
        WHERE tradesperson_id IN (
          SELECT id FROM tradesperson_profiles WHERE user_id = ANY($1)
        )
      `, [testUserIds]);
      console.log('  ✓ Deleted certifications');

      // Delete skills
      await client.query(`
        DELETE FROM skills 
        WHERE tradesperson_id IN (
          SELECT id FROM tradesperson_profiles WHERE user_id = ANY($1)
        )
      `, [testUserIds]);
      console.log('  ✓ Deleted skills');

      // Delete tradesperson profiles
      await client.query('DELETE FROM tradesperson_profiles WHERE user_id = ANY($1)', [testUserIds]);
      console.log('  ✓ Deleted tradesperson profiles');

      // Delete customer profiles
      await client.query('DELETE FROM customer_profiles WHERE user_id = ANY($1)', [testUserIds]);
      console.log('  ✓ Deleted customer profiles');

      // Finally, delete users (CASCADE will handle related data)
      await client.query('DELETE FROM users WHERE id = ANY($1)', [testUserIds]);
      console.log(`  ✓ Deleted ${testUserIds.length} test users\n`);
    }

    // 2. Reset sequences
    console.log('🔄 Resetting sequences...');
    const sequences = [
      'users_id_seq',
      'tradesperson_profiles_id_seq',
      'customer_profiles_id_seq',
      'job_postings_id_seq',
      'job_bids_id_seq',
      'messages_id_seq',
      'message_threads_id_seq',
      'job_notifications_id_seq',
      'reviews_id_seq',
      'skills_id_seq',
      'certifications_id_seq',
      'portfolio_projects_id_seq'
    ];

    for (const seq of sequences) {
      try {
        await client.query(`SELECT setval('${seq}', (SELECT COALESCE(MAX(id), 1) FROM ${seq.replace('_id_seq', '').replace('_seq', '')}))`);
      } catch (err) {
        // Sequence might not exist or table might be empty, skip
      }
    }
    console.log('  ✓ Sequences reset\n');

    // Commit transaction
    await client.query('COMMIT');
    console.log('✅ Database cleanup completed!\n');

    // 3. Clean up test uploads
    console.log('🧹 Cleaning up test uploads...');
    const uploadDirs = ['uploads/profiles', 'uploads/jobs', 'uploads/customers', 'uploads/messages'];
    
    let deletedFiles = 0;
    for (const dir of uploadDirs) {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          // Delete test files (you can customize this pattern)
          if (file.includes('test') || file.includes('example') || file.includes('profile-')) {
            try {
              fs.unlinkSync(path.join(dir, file));
              deletedFiles++;
            } catch (err) {
              console.log(`  ⚠️  Could not delete ${dir}/${file}: ${err.message}`);
            }
          }
        }
      }
    }
    console.log(`  ✓ Deleted ${deletedFiles} test upload files\n`);

    console.log('✨ Test data cleanup completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Deleted ${testUserIds.length} test users`);
    const testJobsCount = testJobsResult?.rows?.length || 0;
    console.log(`   - Deleted ${testJobsCount} test jobs`);
    console.log(`   - Deleted ${deletedFiles} test upload files`);
    console.log('   - Reset all sequences');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run cleanup
cleanTestData()
  .then(() => {
    console.log('\n✅ Cleanup script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Cleanup failed:', error);
    process.exit(1);
  });

