/**
 * Excuse Controller
 * Handles student excuse requests for attendance
 */

const {
    ExcuseRequest,
    AttendanceSession,
    AttendanceRecord,
    CourseSection,
    Course,
    Student,
    User
} = require('../models');
const { AppError } = require('../middleware/errorHandler');

/**
 * Create a new excuse request
 * @route POST /api/v1/excuses
 */
exports.createExcuseRequest = async (req, res, next) => {
    try {
        const { session_id, reason } = req.body;
        const documentUrl = req.file ? `/uploads/documents/${req.file.filename}` : null;
        const studentId = req.user.student?.id;

        if (!studentId) {
            return next(new AppError('Only students can create excuse requests', 403, 'NOT_STUDENT'));
        }

        // specific validation manually since we are using form-data for file upload
        if (!session_id) {
            return next(new AppError('Session ID is required', 400, 'MISSING_FIELD'));
        }
        if (!reason) {
            return next(new AppError('Reason is required', 400, 'MISSING_FIELD'));
        }

        // Verify session exists
        const session = await AttendanceSession.findByPk(session_id);
        if (!session) {
            return next(new AppError('Attendance session not found', 404, 'SESSION_NOT_FOUND'));
        }

        // Check if request already exists
        const existingRequest = await ExcuseRequest.findOne({
            where: {
                student_id: studentId,
                session_id
            }
        });

        if (existingRequest) {
            return next(new AppError('An excuse request for this session already exists', 400, 'DUPLICATE_REQUEST'));
        }

        const excuseRequest = await ExcuseRequest.create({
            student_id: studentId,
            session_id,
            reason,
            document_url: documentUrl,
            status: 'pending'
        });

        res.status(201).json({
            success: true,
            data: {
                excuse_request: excuseRequest
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get student's excuse requests
 * @route GET /api/v1/excuses/my-requests
 */
exports.getMyExcuseRequests = async (req, res, next) => {
    try {
        const studentId = req.user.student?.id;
        if (!studentId) {
            return next(new AppError('Only students can view their requests', 403, 'NOT_STUDENT'));
        }

        const requests = await ExcuseRequest.findAll({
            where: { student_id: studentId },
            include: [
                {
                    model: AttendanceSession,
                    as: 'session',
                    include: [
                        {
                            model: CourseSection,
                            as: 'section',
                            include: [
                                {
                                    model: Course,
                                    as: 'course',
                                    attributes: ['name', 'code']
                                }
                            ]
                        }
                    ]
                }
            ],
            order: [['created_at', 'DESC']]
        });

        res.status(200).json({
            success: true,
            data: {
                requests
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get excuse requests for a faculty member's courses
 * @route GET /api/v1/excuses/faculty
 */
exports.getFacultyExcuseRequests = async (req, res, next) => {
    try {
        const instructorId = req.user.faculty?.id;
        if (!instructorId) {
            return next(new AppError('Only faculty can view requests', 403, 'NOT_FACULTY'));
        }

        // Find sessions taught by this instructor
        // Then find excuse requests for those sessions
        // This query might be complex, so relying on Sequelize associations is better.
        // ExcuseRequest -> AttendanceSession -> CourseSection (where instructor_id)

        // Since complex nested filtering can be tricky in one go, 
        // we can fetch sessions first or use include with required: true

        const requests = await ExcuseRequest.findAll({
            include: [
                {
                    model: AttendanceSession,
                    as: 'session',
                    required: true,
                    include: [
                        {
                            model: CourseSection,
                            as: 'section',
                            required: true,
                            where: { instructor_id: instructorId },
                            include: [
                                {
                                    model: Course,
                                    as: 'course',
                                    attributes: ['name', 'code']
                                }
                            ]
                        }
                    ]
                },
                {
                    model: Student,
                    as: 'student',
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: ['email', 'profile_picture_url'] // Removed name, user doesn't strictly have name in schema sometimes? Wait, User usually has just email/role. Student has number.
                            // Actually User table usually doesn't have name, maybe. Let's check schema/seed or assume profile might.
                            // Looking at previous auth work, User often has just email password.
                            // Profile info is usually on Student/Faculty or User attributes if added.
                            // Wait, previous dashboard.js showed user.profile.name? No.
                            // dashboard.js: user.email. Profile edit had name.
                            // Let's assume User doesn't guarantee name, but Student might have.
                            // Actually let's just stick to email and student number.
                        }
                    ]
                }
            ],
            order: [['created_at', 'DESC']]
        });

        res.status(200).json({
            success: true,
            data: {
                requests
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update excuse request status (Approve/Reject)
 * @route PUT /api/v1/excuses/:id/status
 */
exports.updateExcuseStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;
        const instructorId = req.user.faculty?.id;

        if (!['approved', 'rejected'].includes(status)) {
            return next(new AppError('Invalid status. Must be approved or rejected', 400, 'INVALID_STATUS'));
        }

        const request = await ExcuseRequest.findByPk(id, {
            include: [
                {
                    model: AttendanceSession,
                    as: 'session',
                    include: [{ model: CourseSection, as: 'section' }]
                }
            ]
        });

        if (!request) {
            return next(new AppError('Excuse request not found', 404, 'NOT_FOUND'));
        }

        // Verify instructor owns this session
        if (request.session.section.instructor_id !== instructorId && req.user.role !== 'admin') {
            return next(new AppError('Not authorized to manage this request', 403, 'FORBIDDEN'));
        }

        // Update Request
        await request.update({
            status,
            notes,
            reviewed_by: req.user.id,
            reviewed_at: new Date()
        });

        // If approved, update attendance record
        if (status === 'approved') {
            let record = await AttendanceRecord.findOne({
                where: {
                    session_id: request.session_id,
                    student_id: request.student_id
                }
            });

            if (record) {
                await record.update({ status: 'excused', is_flagged: false });
            } else {
                // Create record if it doesn't exist (e.g. completely absent)
                await AttendanceRecord.create({
                    session_id: request.session_id,
                    student_id: request.student_id,
                    status: 'excused',
                    check_in_time: null, // No checkin
                    latitude: null,
                    longitude: null
                });
            }
        }

        res.status(200).json({
            success: true,
            data: {
                request
            }
        });
    } catch (error) {
        next(error);
    }
};
