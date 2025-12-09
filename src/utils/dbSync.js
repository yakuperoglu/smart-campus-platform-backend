const { sequelize } = require('../models');

/**
 * Synchronize all models with the database
 * @param {boolean} force - If true, drops existing tables before creating new ones
 * @param {boolean} alter - If true, alters existing tables to match models
 */
async function syncDatabase(options = {}) {
  const { force = false, alter = false } = options;

  try {
    console.log('🔄 Starting database synchronization...');
    
    // Test the connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    // Sync all models
    await sequelize.sync({ force, alter });
    
    if (force) {
      console.log('⚠️  All tables have been dropped and recreated.');
    } else if (alter) {
      console.log('✅ Database tables have been altered to match models.');
    } else {
      console.log('✅ Database tables have been synchronized.');
    }

    console.log('🎉 Database synchronization completed successfully!');
  } catch (error) {
    console.error('❌ Unable to sync database:', error);
    throw error;
  }
}

// Allow running this script directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const alter = args.includes('--alter');

  syncDatabase({ force, alter })
    .then(() => {
      console.log('✅ Script completed successfully.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = syncDatabase;
