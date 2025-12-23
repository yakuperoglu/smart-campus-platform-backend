/**
 * Reservation Controller
 * 
 * Handles HTTP requests for classroom reservations.
 */

const ReservationService = require('../services/reservationService');
const { AppError } = require('../middleware/errorHandler');

/**
 * Request a classroom reservation
 * POST /api/reservations
 */
const requestReservation = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const {
            classroom_id,
            date,
            start_time,
            end_time,
            title,
            purpose,
            description,
            attendee_count
        } = req.body;

        const result = await ReservationService.requestReservation({
            userId,
            classroomId: classroom_id,
            date,
            startTime: start_time,
            endTime: end_time,
            title,
            purpose,
            description,
            attendeeCount: attendee_count
        });

        res.status(201).json({
            success: true,
            message: result.message,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get user's reservations
 * GET /api/reservations
 */
const getMyReservations = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { status, page, limit } = req.query;

        const result = await ReservationService.getUserReservations(userId, {
            status,
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20
        });

        res.status(200).json({
            success: true,
            data: result.reservations,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Cancel a reservation
 * DELETE /api/reservations/:id
 */
const cancelReservation = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const reservationId = req.params.id;

        const result = await ReservationService.cancelReservation(userId, reservationId);

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get pending reservations (Admin)
 * GET /api/reservations/pending
 */
const getPendingReservations = async (req, res, next) => {
    try {
        const { page, limit } = req.query;

        const result = await ReservationService.getPendingReservations({
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20
        });

        res.status(200).json({
            success: true,
            data: result.reservations,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Approve a reservation (Admin)
 * POST /api/reservations/:id/approve
 */
const approveReservation = async (req, res, next) => {
    try {
        const adminId = req.user.id;
        const reservationId = req.params.id;

        const result = await ReservationService.approveReservation(adminId, reservationId);

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Reject a reservation (Admin)
 * POST /api/reservations/:id/reject
 */
const rejectReservation = async (req, res, next) => {
    try {
        const adminId = req.user.id;
        const reservationId = req.params.id;
        const { reason } = req.body;

        const result = await ReservationService.rejectReservation(adminId, reservationId, reason);

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get classroom availability
 * GET /api/reservations/availability/:classroomId
 */
const getClassroomAvailability = async (req, res, next) => {
    try {
        const classroomId = req.params.classroomId;
        const { date } = req.query;

        if (!date) {
            return next(new AppError('Date is required', 400, 'MISSING_DATE'));
        }

        const availability = await ReservationService.getClassroomAvailability(classroomId, date);

        res.status(200).json({
            success: true,
            data: availability
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all classrooms with availability
 * GET /api/reservations/classrooms
 */
const getClassroomsWithAvailability = async (req, res, next) => {
    try {
        const { date } = req.query;

        if (!date) {
            return next(new AppError('Date is required', 400, 'MISSING_DATE'));
        }

        const classrooms = await ReservationService.getClassroomsWithAvailability(date);

        res.status(200).json({
            success: true,
            data: classrooms
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    requestReservation,
    getMyReservations,
    cancelReservation,
    getPendingReservations,
    approveReservation,
    rejectReservation,
    getClassroomAvailability,
    getClassroomsWithAvailability
};
