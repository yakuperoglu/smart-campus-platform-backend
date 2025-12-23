#!/usr/bin/env node
/**
 * Database Initialization Script for Production
 * This script initializes the database without exiting the process
 * Used by entrypoint.sh during container startup
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const syncDatabase = require('./dbSync');

/**
 * Initialize database with sync and seed
 */
async function initDatabase() {
  try {
    console.log('🔗 Database Connection Config:');
    console.log(`   Host: ${process.env.DB_HOST}`);
    console.log(`   Port: ${process.env.DB_PORT}`);
    console.log(`   Database: ${process.env.DB_NAME}`);
    console.log(`   SSL: ${process.env.DB_SSL_MODE || 'Enabled'}`);
    console.log('');

    // Check if database is already initialized
    const { sequelize } = require('../models');

    try {
      // Try to query existing tables
      const [results] = await sequelize.query(`
        SELECT COUNT(*) as table_count 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name IN ('users', 'departments', 'students', 'faculty', 'courses')
      `);

      const tableCount = parseInt(results[0].table_count);

      if (tableCount >= 5) {
        console.log('✅ Database is already initialized.');
        console.log(`   Found ${tableCount} core tables.`);
        console.log('   Skipping initialization to prevent data loss.');
        console.log('');
        return true;
      }

      console.log(`ℹ️  Found ${tableCount} core tables. Full initialization needed.`);
      console.log('');

    } catch (queryError) {
      console.log('ℹ️  Database schema check failed. Proceeding with initialization...');
      console.log('');
    }

    // Sync database (creates tables WITHOUT dropping existing ones)
    console.log('🔄 Starting database synchronization...');
    console.log('⚠️  Using safe mode: existing tables will NOT be dropped.');
    await syncDatabase({ force: false, alter: false });

    console.log('');
    console.log('✅ Database schema sync completed successfully.');
    console.log('');

    return true;

  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    console.error('');
    console.error('💡 Possible causes:');
    console.error('   - Database connection issues');
    console.error('   - Invalid credentials');
    console.error('   - Database already in use');
    console.error('');
    console.error('⚠️  Continuing anyway. Application will attempt to connect...');
    console.error('');
    return false;
  }
}

// Execute and handle result
// Note: This script will exit naturally after completion
// We always exit with code 0 to allow the container to continue
(async () => {
  try {
    const success = await initDatabase();

    // Close database connection pool cleanly
    const { sequelize } = require('../models');
    console.log('🔌 Closing database connection pool...');
    await sequelize.connectionManager.close();
    console.log('✅ Connection pool closed.');
    console.log('💡 Application will create a new connection pool on startup.');
    console.log('');

    // Give time for all pending operations to complete
    setTimeout(() => {
      process.exit(0);
    }, 1000);

  } catch (error) {
    console.error('❌ Unexpected error during initialization:', error);
    // Still exit with 0 to allow container to start
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  }
})();

