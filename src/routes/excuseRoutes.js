/**
 * Excuse Routes
 * API endpoints for managing attendance excuse requests
 */

const express = require('express');
const router = express.Router();
const excuseController = require('../controllers/excuseController');
const { verifyToken } = require('../middleware/authMiddleware');
const { authorize, studentOnly, facultyOrAdmin } = require('../middleware/roleMiddleware');
const { uploadDocument } = require('../middleware/documentUploadMiddleware');
const { validate } = require('../middleware/validate');
const { body, param } = require('express-validator');

// ==================== Student Routes ====================

/**
 * @route   POST /api/v1/excuses
 * @desc    Create a new excuse request
 * @access  Private (Student only)
 */
router.post(
    '/',
    verifyToken,
    studentOnly,
    uploadDocument, // Multer middleware
    // Validation after upload, manual in controller usually or custom
    // But we can add body validation too. Note: body fields are text in multipart/form-data.
    // Validation middleware might struggle if body is not parsed yet, but Multer parses it.
    excuseController.createExcuseRequest
);

/**
 * @route   GET /api/v1/excuses/my-requests
 * @desc    Get my excuse requests
 * @access  Private (Student only)
 */
router.get(
    '/my-requests',
    verifyToken,
    studentOnly,
    excuseController.getMyExcuseRequests
);

// ==================== Faculty Routes ====================

/**
 * @route   GET /api/v1/excuses/faculty
 * @desc    Get excuse requests for faculty's sessions
 * @access  Private (Faculty only)
 */
router.get(
    '/faculty',
    verifyToken,
    authorize('faculty'),
    excuseController.getFacultyExcuseRequests
);

/**
 * @route   GET /api/v1/excuses/admin/all
 * @desc    Get ALL excuse requests
 * @access  Private (Admin only)
 */
router.get(
    '/admin/all',
    verifyToken,
    authorize('admin'),
    excuseController.getAllExcuseRequests
);

/**
 * @route   PUT /api/v1/excuses/:id/status
 * @desc    Approve or reject excuse request
 * @access  Private (Faculty only)
 */
router.put(
    '/:id/status',
    verifyToken,
    facultyOrAdmin,
    [
        param('id').isUUID().withMessage('Invalid ID'),
        body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected'),
        body('notes').optional().isString()
    ],
    validate,
    excuseController.updateExcuseStatus
);

module.exports = router;
