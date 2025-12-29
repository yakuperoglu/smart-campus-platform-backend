/**
 * Department Controller
 * Handles department-related operations
 */

const { Department } = require('../models');
const { AppError } = require('../middleware/errorHandler');

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

    // res.json({
    //   success: true,
    //   data: departments,
    //   count: departments.length
    // });
    res.json({
      success: true,
      data: departments
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/departments/:id
 * @desc    Get department by ID
 * @access  Public
 */
const getDepartmentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const department = await Department.findByPk(id);

    if (!department) {
      return next(new AppError('Department not found', 404, 'NOT_FOUND'));
    }

    res.json({
      success: true,
      data: department
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/departments
 * @desc    Create a new department
 * @access  Private/Admin
 */
const createDepartment = async (req, res, next) => {
  try {
    const { name, code, faculty_name } = req.body;

    // Check if department code already exists
    const existingDepartment = await Department.findOne({ where: { code } });
    if (existingDepartment) {
      return next(new AppError('Department with this code already exists', 400, 'DUPLICATE_CODE'));
    }

    const department = await Department.create({
      name,
      code,
      faculty_name
    });

    res.status(201).json({
      success: true,
      data: department
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/v1/departments/:id
 * @desc    Update department
 * @access  Private/Admin
 */
const updateDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code, faculty_name } = req.body;

    const department = await Department.findByPk(id);

    if (!department) {
      return next(new AppError('Department not found', 404, 'NOT_FOUND'));
    }

    // Check unique code if changed
    if (code && code !== department.code) {
      const existingDepartment = await Department.findOne({ where: { code } });
      if (existingDepartment) {
        return next(new AppError('Department with this code already exists', 400, 'DUPLICATE_CODE'));
      }
    }

    await department.update({
      name: name || department.name,
      code: code || department.code,
      faculty_name: faculty_name || department.faculty_name
    });

    res.json({
      success: true,
      data: department
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/v1/departments/:id
 * @desc    Delete department
 * @access  Private/Admin
 */
const deleteDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const department = await Department.findByPk(id);

    if (!department) {
      return next(new AppError('Department not found', 404, 'NOT_FOUND'));
    }

    await department.destroy();

    res.json({
      success: true,
      message: 'Department deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment
};

