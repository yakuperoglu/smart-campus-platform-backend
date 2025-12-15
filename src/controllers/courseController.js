/**
 * Course Controller
 * Handles course listing and details for students
 */

const { Op } = require('sequelize');
const {
    Course,
    CourseSection,
    Department,
    Faculty,
    User,
    Classroom,
    CoursePrerequisite
} = require('../models');
const { AppError } = require('../middleware/errorHandler');

/**
 * @route   GET /api/v1/courses
 * @desc    Get all courses with available sections
 * @access  Private (Authenticated users)
 */
const getCourses = async (req, res, next) => {
    try {
        const {
            semester,
            year,
            department_id,
            search,
            page = 1,
            limit = 50
        } = req.query;

        // Build course filter
        const courseWhere = {};
        if (department_id) {
            courseWhere.department_id = department_id;
        }
        if (search) {
            courseWhere[Op.or] = [
                { code: { [Op.iLike]: `%${search}%` } },
                { name: { [Op.iLike]: `%${search}%` } }
            ];
        }

        // Build section filter
        const sectionWhere = {};
        if (semester) {
            sectionWhere.semester = semester;
        }
        if (year) {
            sectionWhere.year = parseInt(year);
        }

        // Get courses with sections
        const courses = await Course.findAll({
            where: courseWhere,
            include: [
                {
                    model: Department,
                    as: 'department',
                    attributes: ['id', 'name', 'code']
                },
                {
                    model: CourseSection,
                    as: 'sections',
                    where: Object.keys(sectionWhere).length > 0 ? sectionWhere : undefined,
                    required: false,
                    include: [
                        {
                            model: Faculty,
                            as: 'instructor',
                            attributes: ['id', 'title', 'employee_number'],
                            include: [
                                {
                                    model: User,
                                    as: 'user',
                                    attributes: ['email']
                                }
                            ]
                        },
                        {
                            model: Classroom,
                            as: 'classroom',
                            attributes: ['id', 'building', 'room_number']
                        }
                    ]
                }
            ],
            order: [
                ['code', 'ASC'],
                [{ model: CourseSection, as: 'sections' }, 'section_number', 'ASC']
            ],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        // Get total count for pagination
        const totalCount = await Course.count({ where: courseWhere });

        // Format response
        const formattedCourses = courses.map(course => ({
            id: course.id,
            code: course.code,
            name: course.name,
            description: course.description,
            credits: course.credits,
            ects: course.ects,
            department: course.department ? {
                id: course.department.id,
                name: course.department.name,
                code: course.department.code
            } : null,
            sections: course.sections.map(section => ({
                id: section.id,
                section_number: section.section_number,
                semester: section.semester,
                year: section.year,
                capacity: section.capacity,
                enrolled_count: section.enrolled_count,
                available_seats: section.capacity - section.enrolled_count,
                schedule: section.schedule_json || [],
                instructor: section.instructor ? {
                    id: section.instructor.id,
                    name: section.instructor.title
                        ? `${section.instructor.title}${section.instructor.user?.email ? ' (' + section.instructor.user.email.split('@')[0] + ')' : ''}`
                        : (section.instructor.user?.email?.split('@')[0] || 'TBA')
                } : { name: 'TBA' },
                classroom: section.classroom ? {
                    id: section.classroom.id,
                    building: section.classroom.building,
                    room: section.classroom.room_number
                } : null
            }))
        }));

        // Filter out courses with no sections if semester/year filter is applied
        const filteredCourses = (semester || year)
            ? formattedCourses.filter(c => c.sections.length > 0)
            : formattedCourses;

        res.status(200).json({
            success: true,
            data: {
                courses: filteredCourses,
                pagination: {
                    total: totalCount,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(totalCount / parseInt(limit))
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/v1/courses/:courseId
 * @desc    Get single course with all details
 * @access  Private (Authenticated users)
 */
const getCourseById = async (req, res, next) => {
    try {
        const { courseId } = req.params;

        const course = await Course.findByPk(courseId, {
            include: [
                {
                    model: Department,
                    as: 'department',
                    attributes: ['id', 'name', 'code']
                },
                {
                    model: CourseSection,
                    as: 'sections',
                    include: [
                        {
                            model: Faculty,
                            as: 'instructor',
                            attributes: ['id', 'title', 'employee_number'],
                            include: [
                                {
                                    model: User,
                                    as: 'user',
                                    attributes: ['email']
                                }
                            ]
                        },
                        {
                            model: Classroom,
                            as: 'classroom',
                            attributes: ['id', 'building', 'room_number']
                        }
                    ]
                },
                {
                    model: Course,
                    as: 'prerequisites',
                    through: { attributes: [] },
                    attributes: ['id', 'code', 'name']
                }
            ]
        });

        if (!course) {
            return next(new AppError('Course not found', 404, 'COURSE_NOT_FOUND'));
        }

        // Format response
        const formattedCourse = {
            id: course.id,
            code: course.code,
            name: course.name,
            description: course.description,
            credits: course.credits,
            ects: course.ects,
            department: course.department ? {
                id: course.department.id,
                name: course.department.name,
                code: course.department.code
            } : null,
            prerequisites: course.prerequisites.map(prereq => ({
                id: prereq.id,
                code: prereq.code,
                name: prereq.name
            })),
            sections: course.sections.map(section => ({
                id: section.id,
                section_number: section.section_number,
                semester: section.semester,
                year: section.year,
                capacity: section.capacity,
                enrolled_count: section.enrolled_count,
                available_seats: section.capacity - section.enrolled_count,
                schedule: section.schedule_json || [],
                instructor: section.instructor ? {
                    id: section.instructor.id,
                    name: section.instructor.title
                        ? `${section.instructor.title}${section.instructor.user?.email ? ' (' + section.instructor.user.email.split('@')[0] + ')' : ''}`
                        : (section.instructor.user?.email?.split('@')[0] || 'TBA')
                } : { name: 'TBA' },
                classroom: section.classroom ? {
                    id: section.classroom.id,
                    building: section.classroom.building,
                    room: section.classroom.room_number
                } : null
            }))
        };

        res.status(200).json({
            success: true,
            data: formattedCourse
        });
    } catch (error) {
        next(error);
    }
};

// ============================================
// ADMIN ENDPOINTS
// ============================================

/**
 * @route   POST /api/v1/courses
 * @desc    Create a new course
 * @access  Private (Admin only)
 */
const createCourse = async (req, res, next) => {
    try {
        const { code, name, description, credits, ects, department_id } = req.body;

        // Check if course code already exists
        const existingCourse = await Course.findOne({ where: { code } });
        if (existingCourse) {
            return next(new AppError('Course code already exists', 400, 'DUPLICATE_COURSE_CODE'));
        }

        // Verify department exists if provided
        if (department_id) {
            const department = await Department.findByPk(department_id);
            if (!department) {
                return next(new AppError('Department not found', 404, 'DEPARTMENT_NOT_FOUND'));
            }
        }

        const course = await Course.create({
            code,
            name,
            description,
            credits: credits || 3,
            ects,
            department_id
        });

        res.status(201).json({
            success: true,
            message: 'Course created successfully',
            data: {
                id: course.id,
                code: course.code,
                name: course.name,
                description: course.description,
                credits: course.credits,
                ects: course.ects,
                department_id: course.department_id
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   PUT /api/v1/courses/:courseId
 * @desc    Update a course
 * @access  Private (Admin only)
 */
const updateCourse = async (req, res, next) => {
    try {
        const { courseId } = req.params;
        const { code, name, description, credits, ects, department_id } = req.body;

        const course = await Course.findByPk(courseId);
        if (!course) {
            return next(new AppError('Course not found', 404, 'COURSE_NOT_FOUND'));
        }

        // Check if new code conflicts with another course
        if (code && code !== course.code) {
            const existingCourse = await Course.findOne({ where: { code } });
            if (existingCourse) {
                return next(new AppError('Course code already exists', 400, 'DUPLICATE_COURSE_CODE'));
            }
        }

        // Verify department exists if provided
        if (department_id) {
            const department = await Department.findByPk(department_id);
            if (!department) {
                return next(new AppError('Department not found', 404, 'DEPARTMENT_NOT_FOUND'));
            }
        }

        await course.update({
            code: code || course.code,
            name: name || course.name,
            description: description !== undefined ? description : course.description,
            credits: credits !== undefined ? credits : course.credits,
            ects: ects !== undefined ? ects : course.ects,
            department_id: department_id !== undefined ? department_id : course.department_id
        });

        res.status(200).json({
            success: true,
            message: 'Course updated successfully',
            data: course
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   DELETE /api/v1/courses/:courseId
 * @desc    Delete a course
 * @access  Private (Admin only)
 */
const deleteCourse = async (req, res, next) => {
    try {
        const { courseId } = req.params;

        const course = await Course.findByPk(courseId);
        if (!course) {
            return next(new AppError('Course not found', 404, 'COURSE_NOT_FOUND'));
        }

        // Soft delete (paranoid mode)
        await course.destroy();

        res.status(200).json({
            success: true,
            message: 'Course deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/v1/courses/:courseId/sections
 * @desc    Create a new section for a course
 * @access  Private (Admin only)
 */
const createSection = async (req, res, next) => {
    try {
        const { courseId } = req.params;
        const { semester, year, section_number, capacity, schedule_json, classroom_id } = req.body;

        // Verify course exists
        const course = await Course.findByPk(courseId);
        if (!course) {
            return next(new AppError('Course not found', 404, 'COURSE_NOT_FOUND'));
        }

        // Check for duplicate section
        const existingSection = await CourseSection.findOne({
            where: {
                course_id: courseId,
                semester,
                year,
                section_number: section_number || '01'
            }
        });
        if (existingSection) {
            return next(new AppError('Section already exists for this course/semester/year', 400, 'DUPLICATE_SECTION'));
        }

        // Verify classroom exists if provided
        if (classroom_id) {
            const classroom = await Classroom.findByPk(classroom_id);
            if (!classroom) {
                return next(new AppError('Classroom not found', 404, 'CLASSROOM_NOT_FOUND'));
            }
        }

        const section = await CourseSection.create({
            course_id: courseId,
            semester,
            year,
            section_number: section_number || '01',
            capacity: capacity || 30,
            schedule_json: schedule_json || [],
            classroom_id,
            enrolled_count: 0
        });

        res.status(201).json({
            success: true,
            message: 'Section created successfully',
            data: {
                id: section.id,
                course_id: section.course_id,
                semester: section.semester,
                year: section.year,
                section_number: section.section_number,
                capacity: section.capacity,
                enrolled_count: section.enrolled_count,
                schedule_json: section.schedule_json
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   PUT /api/v1/courses/:courseId/sections/:sectionId
 * @desc    Update a section
 * @access  Private (Admin only)
 */
const updateSection = async (req, res, next) => {
    try {
        const { courseId, sectionId } = req.params;
        const { semester, year, section_number, capacity, schedule_json, classroom_id, instructor_id } = req.body;

        // Verify course exists
        const course = await Course.findByPk(courseId);
        if (!course) {
            return next(new AppError('Course not found', 404, 'COURSE_NOT_FOUND'));
        }

        const section = await CourseSection.findOne({
            where: { id: sectionId, course_id: courseId }
        });
        if (!section) {
            return next(new AppError('Section not found', 404, 'SECTION_NOT_FOUND'));
        }

        // Check for duplicate if changing semester/year/section_number
        if (semester || year || section_number) {
            const newSemester = semester || section.semester;
            const newYear = year || section.year;
            const newSectionNumber = section_number || section.section_number;

            const existingSection = await CourseSection.findOne({
                where: {
                    course_id: courseId,
                    semester: newSemester,
                    year: newYear,
                    section_number: newSectionNumber,
                    id: { [Op.ne]: sectionId }
                }
            });
            if (existingSection) {
                return next(new AppError('Section already exists for this course/semester/year', 400, 'DUPLICATE_SECTION'));
            }
        }

        await section.update({
            semester: semester || section.semester,
            year: year || section.year,
            section_number: section_number || section.section_number,
            capacity: capacity !== undefined ? capacity : section.capacity,
            schedule_json: schedule_json !== undefined ? schedule_json : section.schedule_json,
            classroom_id: classroom_id !== undefined ? classroom_id : section.classroom_id,
            instructor_id: instructor_id !== undefined ? instructor_id : section.instructor_id
        });

        res.status(200).json({
            success: true,
            message: 'Section updated successfully',
            data: section
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   DELETE /api/v1/courses/:courseId/sections/:sectionId
 * @desc    Delete a section
 * @access  Private (Admin only)
 */
const deleteSection = async (req, res, next) => {
    try {
        const { courseId, sectionId } = req.params;

        const section = await CourseSection.findOne({
            where: { id: sectionId, course_id: courseId }
        });
        if (!section) {
            return next(new AppError('Section not found', 404, 'SECTION_NOT_FOUND'));
        }

        // Check if there are enrollments
        if (section.enrolled_count > 0) {
            return next(new AppError(
                `Cannot delete section with ${section.enrolled_count} enrolled students`,
                400,
                'SECTION_HAS_ENROLLMENTS'
            ));
        }

        await section.destroy();

        res.status(200).json({
            success: true,
            message: 'Section deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getCourses,
    getCourseById,
    createCourse,
    updateCourse,
    deleteCourse,
    createSection,
    updateSection,
    deleteSection
};
