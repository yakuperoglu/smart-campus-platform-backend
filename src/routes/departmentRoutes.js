/**
 * Department Routes
 */

const express = require('express');
const router = express.Router();
const {
    getAllDepartments,
    getDepartmentById,
    createDepartment,
    updateDepartment,
    deleteDepartment
} = require('../controllers/departmentController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

/**
 * @swagger
 * /departments:
 *   get:
 *     summary: Get all departments
 *     description: Returns a list of all academic departments
 *     tags: [Departments]
 *     responses:
 *       200:
 *         description: List of departments
 */
router.get('/', getAllDepartments);

/**
 * @swagger
 * /departments/{id}:
 *   get:
 *     summary: Get department by ID
 *     tags: [Departments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Department details
 */
router.get('/:id', getDepartmentById);

/**
 * @swagger
 * /departments:
 *   post:
 *     summary: Create a department
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     description: Admin only
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - code
 *               - faculty_name
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               faculty_name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Department created
 */
router.post('/', verifyToken, isAdmin, createDepartment);

/**
 * @swagger
 * /departments/{id}:
 *   put:
 *     summary: Update a department
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     description: Admin only
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Department updated
 */
router.put('/:id', verifyToken, isAdmin, updateDepartment);

/**
 * @swagger
 * /departments/{id}:
 *   delete:
 *     summary: Delete a department
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     description: Admin only
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Department deleted
 */
router.delete('/:id', verifyToken, isAdmin, deleteDepartment);

module.exports = router;

