/**
 * API Routes Index
 * Combines all route modules
 */

const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');

/**
 * Mount all routes
 */
router.use('/auth', authRoutes);
router.use('/users', userRoutes);

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Smart Campus API is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
