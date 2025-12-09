/**
 * Smart Campus Platform - Main Application Entry Point
 * Express server with authentication, user management, and API routes
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

const { sequelize } = require('./models');
const apiRoutes = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE
// ============================================

// Security middleware
app.use(helmet());

// CORS configuration - Allow all Vercel and localhost origins
const corsOptions = {
  origin: function (origin, callback) {
    console.log('🔍 CORS Request from origin:', origin);
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      console.log('✅ CORS: Allowed (no origin)');
      return callback(null, true);
    }
    
    // Allow localhost for development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      console.log('✅ CORS: Allowed (localhost)');
      return callback(null, true);
    }
    
    // Allow all Vercel deployments
    if (origin.includes('.vercel.app')) {
      console.log('✅ CORS: Allowed (Vercel)');
      return callback(null, true);
    }
    
    // Allow specific frontend URL from environment
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
      console.log('✅ CORS: Allowed (FRONTEND_URL)');
      return callback(null, true);
    }
    
    console.log('❌ CORS: Blocked -', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Serve static files (uploaded files)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ============================================
// ROUTES
// ============================================

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Smart Campus Platform API',
    version: '1.0.0',
    status: 'running',
    documentation: '/api-docs',
    timestamp: new Date().toISOString()
  });
});

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Smart Campus API Documentation'
}));

// Mount API routes at /api/v1
app.use('/api/v1', apiRoutes);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler - must be before error handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.originalUrl} not found`
    }
  });
});

// Global error handler - must be last
app.use(errorHandler);

// ============================================
// DATABASE CONNECTION & SERVER START
// ============================================

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

module.exports = app;

