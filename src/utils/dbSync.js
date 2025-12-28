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
      console.log('⚠️  Dropping all tables manually...');
      // Drop tables in reverse dependency order
      await sequelize.query('DROP TABLE IF EXISTS "excuse_requests" CASCADE;');
      await sequelize.query('DROP TABLE IF EXISTS "attendance_records" CASCADE;');
      await sequelize.query('DROP TABLE IF EXISTS "meal_reservations" CASCADE;');
      await sequelize.query('DROP TABLE IF EXISTS "attendance_sessions" CASCADE;');
      await sequelize.query('DROP TABLE IF EXISTS "enrollments" CASCADE;');
      await sequelize.query('DROP TABLE IF EXISTS "event_registrations" CASCADE;');
      await sequelize.query('DROP TABLE IF EXISTS "meal_menus" CASCADE;');
      await sequelize.query('DROP TABLE IF EXISTS "course_sections" CASCADE;');
      await sequelize.query('DROP TABLE IF EXISTS "course_prerequisites" CASCADE;');
      await sequelize.query('DROP TABLE IF EXISTS "transactions" CASCADE;');
      await sequelize.query('DROP TABLE IF EXISTS "sensor_data" CASCADE;');
      await sequelize.query('DROP TABLE IF EXISTS "events" CASCADE;');
      await sequelize.query('DROP TABLE IF EXISTS "courses" CASCADE;');
      await sequelize.query('DROP TABLE IF EXISTS "notifications" CASCADE;');
      await sequelize.query('DROP TABLE IF EXISTS "password_resets" CASCADE;');
      await sequelize.query('DROP TABLE IF EXISTS "email_verifications" CASCADE;');
      await sequelize.query('DROP TABLE IF EXISTS "wallets" CASCADE;');
      await models.ClubMembership.sync({ force: true }); // Drop specific table
      await sequelize.query('DROP TABLE IF EXISTS "club_memberships" CASCADE;');
      await sequelize.query('DROP TABLE IF EXISTS "clubs" CASCADE;');
      await sequelize.query('DROP TABLE IF EXISTS "admins" CASCADE;');
      await sequelize.query('DROP TABLE IF EXISTS "faculty" CASCADE;');
      await sequelize.query('DROP TABLE IF EXISTS "students" CASCADE;');
      await sequelize.query('DROP TABLE IF EXISTS "iot_sensors" CASCADE;');
      await sequelize.query('DROP TABLE IF EXISTS "cafeterias" CASCADE;');
      await sequelize.query('DROP TABLE IF EXISTS "classrooms" CASCADE;');
      await sequelize.query('DROP TABLE IF EXISTS "users" CASCADE;');
      await sequelize.query('DROP TABLE IF EXISTS "departments" CASCADE;');
      // Drop enums
      await sequelize.query('DROP TYPE IF EXISTS "enum_notifications_type" CASCADE;');
      await sequelize.query('DROP TYPE IF EXISTS "enum_notifications_priority" CASCADE;');
      await sequelize.query('DROP TYPE IF EXISTS "enum_transactions_type" CASCADE;');
      await sequelize.query('DROP TYPE IF EXISTS "enum_meal_menus_meal_type" CASCADE;');
      await sequelize.query('DROP TYPE IF EXISTS "enum_attendance_records_status" CASCADE;');
      await sequelize.query('DROP TYPE IF EXISTS "enum_excuse_requests_status" CASCADE;');
      await sequelize.query('DROP TYPE IF EXISTS "enum_iot_sensors_sensor_type" CASCADE;');
      console.log('✅ All tables dropped.');
    }

    // Sync models in dependency order to avoid foreign key constraint errors
    // Level 1: Independent tables (no foreign keys)
    await models.Department.sync({ force: false, alter });
    await models.User.sync({ force: false, alter });
    await models.Classroom.sync({ force: false, alter });
    await models.Cafeteria.sync({ force: false, alter });
    await models.IoTSensor.sync({ force: false, alter });

    // Level 2: Tables that depend on Level 1
    await models.Student.sync({ force: false, alter });
    await models.Faculty.sync({ force: false, alter });
    await models.Admin.sync({ force: false, alter });
    await models.Wallet.sync({ force: false, alter });
    await models.EmailVerification.sync({ force: false, alter });
    await models.PasswordReset.sync({ force: false, alter });
    await models.Notification.sync({ force: false, alter });
    await models.Course.sync({ force: false, alter });
    await models.Event.sync({ force: false, alter });
    await models.SensorData.sync({ force: false, alter });

    // Level 3: Tables that depend on Level 2
    await models.Transaction.sync({ force: false, alter });
    await models.CoursePrerequisite.sync({ force: false, alter });
    await models.CourseSection.sync({ force: false, alter });
    await models.MealMenu.sync({ force: false, alter });
    await models.EventRegistration.sync({ force: false, alter });
    await models.Club.sync({ force: false, alter });
    await models.ClubMembership.sync({ force: false, alter });

    // Level 4: Tables that depend on Level 3
    await models.Enrollment.sync({ force: false, alter });
    await models.AttendanceSession.sync({ force: false, alter });
    await models.MealReservation.sync({ force: false, alter });

    // Level 5: Tables that depend on Level 4
    await models.AttendanceRecord.sync({ force: false, alter });
    await models.ExcuseRequest.sync({ force: false, alter });

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
