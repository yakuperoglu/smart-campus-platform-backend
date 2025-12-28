/**
 * Club Routes
 * API endpoints for club management
 */

const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// Lazy load controller to avoid circular dependency
const getController = () => require('../controllers/clubController');

// Public routes
router.get('/', (req, res, next) => getController().getAllClubs(req, res, next));

// Protected routes - specific routes BEFORE :id routes
router.get('/user/my-clubs', verifyToken, (req, res, next) => getController().getMyClubs(req, res, next));

// Admin only routes
router.post('/', verifyToken, isAdmin, (req, res, next) => getController().createClub(req, res, next));

// Public - get club by ID (must be after specific routes)
router.get('/:id', (req, res, next) => getController().getClubById(req, res, next));

// Protected routes with :id parameter
router.post('/:id/join', verifyToken, (req, res, next) => getController().joinClub(req, res, next));
router.delete('/:id/leave', verifyToken, (req, res, next) => getController().leaveClub(req, res, next));
router.get('/:id/members', verifyToken, (req, res, next) => getController().getClubMembers(req, res, next));
router.put('/:id', verifyToken, isAdmin, (req, res, next) => getController().updateClub(req, res, next));
router.delete('/:id', verifyToken, isAdmin, (req, res, next) => getController().deleteClub(req, res, next));

module.exports = router;
