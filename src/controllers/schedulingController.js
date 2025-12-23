/**
 * Scheduling Controller
 * 
 * Handles HTTP requests for course scheduling operations.
 */

const SchedulingService = require('../services/schedulingService');
const { AppError } = require('../middleware/errorHandler');

/**
 * Generate schedule for a semester
 * POST /api/scheduling/generate
 */
const generateSchedule = async (req, res, next) => {
    try {
        const { semester, year, preview_only } = req.body;

        if (!semester || !year) {
            return next(new AppError('Semester and year are required', 400, 'MISSING_PARAMS'));
        }

        // Validate semester
        const validSemesters = ['Fall', 'Spring', 'Summer'];
        if (!validSemesters.includes(semester)) {
            return next(new AppError(`Invalid semester. Must be one of: ${validSemesters.join(', ')}`, 400, 'INVALID_SEMESTER'));
        }

        // Validate year
        if (year < 2020 || year > 2100) {
            return next(new AppError('Invalid year', 400, 'INVALID_YEAR'));
        }

        let result;
        if (preview_only) {
            result = await SchedulingService.previewSchedule(semester, year);
        } else {
            result = await SchedulingService.generateSchedule(semester, year);
        }

        res.status(200).json({
            success: true,
            message: result.success
                ? 'Schedule generated successfully'
                : 'Partial schedule generated (some sections could not be scheduled)',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get current schedule
 * GET /api/scheduling/schedule
 */
const getSchedule = async (req, res, next) => {
    try {
        const { semester, year, section_id, classroom_id, instructor_id } = req.query;

        if (!semester || !year) {
            return next(new AppError('Semester and year are required', 400, 'MISSING_PARAMS'));
        }

        const schedule = await SchedulingService.getSchedule(semester, parseInt(year), {
            sectionId: section_id,
            classroomId: classroom_id,
            instructorId: instructor_id
        });

        res.status(200).json({
            success: true,
            data: schedule
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Clear schedule for a semester
 * DELETE /api/scheduling/schedule
 */
const clearSchedule = async (req, res, next) => {
    try {
        const { semester, year } = req.body;

        if (!semester || !year) {
            return next(new AppError('Semester and year are required', 400, 'MISSING_PARAMS'));
        }

        const result = await SchedulingService.clearSchedule(semester, year);

        res.status(200).json({
            success: true,
            message: `Cleared ${result.deleted_count} schedule entries`,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get scheduling statistics/info
 * GET /api/scheduling/info
 */
const getSchedulingInfo = async (req, res, next) => {
    try {
        const { CourseSection, Classroom } = require('../models');

        // Get section counts by semester
        const sectionCounts = await CourseSection.findAll({
            attributes: [
                'semester',
                'year',
                [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
            ],
            group: ['semester', 'year'],
            order: [['year', 'DESC'], ['semester', 'ASC']]
        });

        // Get classroom count
        const classroomCount = await Classroom.count({ where: { is_active: true } });

        // Get time slots and days
        const timeSlots = [
            { id: 1, start: '08:00', end: '08:50' },
            { id: 2, start: '09:00', end: '09:50' },
            { id: 3, start: '10:00', end: '10:50' },
            { id: 4, start: '11:00', end: '11:50' },
            { id: 5, start: '12:00', end: '12:50' },
            { id: 6, start: '13:00', end: '13:50' },
            { id: 7, start: '14:00', end: '14:50' },
            { id: 8, start: '15:00', end: '15:50' },
            { id: 9, start: '16:00', end: '16:50' },
            { id: 10, start: '17:00', end: '17:50' }
        ];

        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

        res.status(200).json({
            success: true,
            data: {
                sections_by_semester: sectionCounts,
                available_classrooms: classroomCount,
                time_slots: timeSlots,
                days_of_week: days,
                total_slots_per_week: timeSlots.length * days.length * classroomCount
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Export schedule to iCal
 * GET /api/scheduling/my-schedule/ical
 */
const exportScheduleToIcal = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const icalString = await SchedulingService.exportToIcal(userId);

        res.set({
            'Content-Type': 'text/calendar; charset=utf-8',
            'Content-Disposition': 'attachment; filename="course-schedule.ics"'
        });

        res.send(icalString);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    generateSchedule,
    getSchedule,
    clearSchedule,
    getSchedulingInfo,
    exportScheduleToIcal
};
