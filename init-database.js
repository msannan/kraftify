#!/usr/bin/env node

// Database initialization script
// Run this to create all required tables

require('dotenv').config();
const { createTables } = require('./server/config/database');

async function init() {
  console.log('🔄 Initializing database...');
  console.log('📋 Database config:', {
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'kraftify',
    user: process.env.DB_USER || 'postgres'
  });
  
  try {
    await createTables();
    console.log('✅ Database tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail
    });
    process.exit(1);
  }
}

init();

