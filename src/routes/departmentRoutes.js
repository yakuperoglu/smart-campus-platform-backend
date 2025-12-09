/**
 * Department Routes
 */

const express = require('express');
const router = express.Router();
const { getAllDepartments } = require('../controllers/departmentController');

/**
 * @route   GET /api/v1/departments
 * @desc    Get all departments
 * @access  Public
 */
router.get('/', getAllDepartments);

module.exports = router;

