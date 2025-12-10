const models = require('../models');
const { sequelize } = models;

/**
 * Synchronize all models with the database
 * Models are synced in dependency order to avoid foreign key errors
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

    if (force) {
      console.log('⚠️  Dropping all tables...');
      await sequelize.drop();
      console.log('✅ All tables dropped.');
    }

    // Sync models in dependency order to avoid foreign key constraint errors
    // Level 1: Independent tables (no foreign keys)
    await models.Department.sync({ alter });
    await models.User.sync({ alter });
    await models.Classroom.sync({ alter });
    await models.Cafeteria.sync({ alter });
    await models.IoTSensor.sync({ alter });

    // Level 2: Tables that depend on Level 1
    await models.Student.sync({ alter });
    await models.Faculty.sync({ alter });
    await models.Admin.sync({ alter });
    await models.Wallet.sync({ alter });
    await models.EmailVerification.sync({ alter });
    await models.PasswordReset.sync({ alter });
    await models.Notification.sync({ alter });
    await models.Course.sync({ alter });
    await models.Event.sync({ alter });
    await models.SensorData.sync({ alter });

    // Level 3: Tables that depend on Level 2
    await models.Transaction.sync({ alter });
    await models.CoursePrerequisite.sync({ alter });
    await models.CourseSection.sync({ alter });
    await models.MealMenu.sync({ alter });
    await models.EventRegistration.sync({ alter });

    // Level 4: Tables that depend on Level 3
    await models.Enrollment.sync({ alter });
    await models.AttendanceSession.sync({ alter });
    await models.MealReservation.sync({ alter });

    // Level 5: Tables that depend on Level 4
    await models.AttendanceRecord.sync({ alter });
    await models.ExcuseRequest.sync({ alter });
    
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
