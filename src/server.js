/**
 * Smart Campus Platform - Server Entry Point
 * Handles database connection and server startup
 */

require('dotenv').config();
const { sequelize } = require('./models');
const app = require('./app');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        // Test database connection
        await sequelize.authenticate();
        console.log('✅ Database connection established successfully.');

        // Sync database (in development only)
        if (process.env.NODE_ENV === 'development' && process.env.DB_SYNC === 'true') {
            await sequelize.sync({ alter: false });
            console.log('✅ Database synchronized.');
        }

        // Start server
        app.listen(PORT, () => {
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
