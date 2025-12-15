/**
 * Department Routes
 */

const express = require('express');
const router = express.Router();
const { getAllDepartments } = require('../controllers/departmentController');

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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       code:
 *                         type: string
 *                         example: CE
 *                       name:
 *                         type: string
 *                         example: Computer Engineering
 */
router.get('/', getAllDepartments);

module.exports = router;

