/**
 * Department Controller
 * Handles department-related operations
 */

const { Department } = require('../models');

/**
 * @route   GET /api/v1/departments
 * @desc    Get all departments
 * @access  Public
 */
const getAllDepartments = async (req, res, next) => {
  try {
    const departments = await Department.findAll({
      attributes: ['id', 'name', 'code', 'faculty_name'],
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: departments,
      count: departments.length
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllDepartments
};

