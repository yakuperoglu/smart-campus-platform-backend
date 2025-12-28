/**
 * Smart Campus Platform - Server Entry Point
 * Handles database connection and server startup
 */

require('dotenv').config();
const { sequelize } = require('./models');
const app = require('./app');
const http = require('http');
const { initSocket } = require('./socket');

const server = http.createServer(app);

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        // Test database connection
        await sequelize.authenticate();
        console.log('✅ Database connection established successfully.');

        // Auto-initialize database (always enabled - uses safe findOrCreate for users)
        if (process.env.AUTO_INIT_DB !== 'false') {
            console.log('🔄 Checking database initialization status...');

            try {
                // Check if core tables exist
                const [results] = await sequelize.query(`
                    SELECT COUNT(*) as table_count 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_type = 'BASE TABLE'
                    AND table_name IN ('users', 'departments', 'students', 'faculty', 'courses')
                `);

                const tableCount = parseInt(results[0].table_count);

                if (tableCount < 5) {
                    console.log(`ℹ️  Found ${tableCount}/5 core tables. Syncing database schema...`);

                    // Import and run database sync (schema only, no seeding)
                    const syncDatabase = require('./utils/dbSync');
                    await syncDatabase({ force: false, alter: false });

                    console.log('✅ Database schema sync completed.');

                    // Run seeder to create demo users
                    console.log('🌱 Seeding database with demo data...');
                    const seedDatabase = require('./utils/seedDatabase');
                    await seedDatabase();
                    console.log('✅ Database seeding completed.');
                } else {
                    console.log(`✅ Database already initialized (${tableCount}/5 core tables found).`);

                    // Always run seeder to ensure demo users exist
                    console.log('🌱 Ensuring demo users exist...');
                    const seedDatabase = require('./utils/seedDatabase');
                    await seedDatabase();
                    console.log('✅ Demo users verified.');
                }
            } catch (initError) {
                console.error('⚠️  Database initialization error:', initError.message);
                console.log('⚠️  Continuing with server startup...');
            }
        }

        // Sync database (in development only)
        if (process.env.NODE_ENV === 'development' && process.env.DB_SYNC === 'true') {
            await sequelize.sync({ alter: false });
            console.log('✅ Database synchronized.');
        }

        // Initialize Background Jobs
        const initJobs = require('./jobs');
        initJobs();

        // Initialize WebSocket
        initSocket(server);

        // Start server
        server.listen(PORT, () => {
            console.log('');
            console.log('🚀 ========================================');
            console.log(`   Smart Campus Platform API Server`);
            console.log('   ========================================');
            console.log(`   🌐 Server: http://localhost:${PORT}`);
            console.log(`   📝 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`   🗄️  Database: ${process.env.DB_NAME}`);
            console.log('   ========================================');
            console.log('');
        });

    } catch (error) {
        console.error('❌ Unable to start server:', error);
        process.exit(1);
    }
};

// Start the server
startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Promise Rejection:', err);
    // Close server & exit process
    process.exit(1);
});
