/**
 * Reservation Service
 * 
 * Handles classroom reservation requests, approval workflow,
 * and availability checking against both schedules and existing reservations.
 */

const { sequelize, ClassroomReservation, Classroom, Schedule, User, CourseSection, Course } = require('../models');
const { AppError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');

class ReservationService {
    /**
     * Request a classroom reservation
     * Checks availability against schedules and existing reservations
     * 
     * @param {object} params - Reservation parameters
     * @param {string} params.userId - Requesting user ID
     * @param {string} params.classroomId - Classroom ID
     * @param {string} params.date - Reservation date (YYYY-MM-DD)
     * @param {string} params.startTime - Start time (HH:MM)
     * @param {string} params.endTime - End time (HH:MM)
     * @param {string} params.title - Reservation title
     * @param {string} params.purpose - Purpose (meeting, event, study, etc.)
     * @param {string} [params.description] - Additional description
     * @param {number} [params.attendeeCount] - Expected attendees
     * @returns {Promise<object>} Reservation details
     */
    static async requestReservation(params) {
        const {
            userId,
            classroomId,
            date,
            startTime,
            endTime,
            title,
            purpose,
            description,
            attendeeCount
        } = params;

        // Validate inputs
        if (!classroomId || !date || !startTime || !endTime || !title || !purpose) {
            throw new AppError('Missing required fields', 400, 'MISSING_FIELDS');
        }

        // Validate time format and range
        if (startTime >= endTime) {
            throw new AppError('Start time must be before end time', 400, 'INVALID_TIME_RANGE');
        }

        // Validate date is not in the past
        const reservationDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (reservationDate < today) {
            throw new AppError('Cannot make reservations for past dates', 400, 'PAST_DATE');
        }

        const t = await sequelize.transaction();

        try {
            // Check classroom exists and is active
            const classroom = await Classroom.findByPk(classroomId, { transaction: t });

            if (!classroom) {
                throw new AppError('Classroom not found', 404, 'CLASSROOM_NOT_FOUND');
            }

            if (!classroom.is_active) {
                throw new AppError('Classroom is not available for reservations', 400, 'CLASSROOM_INACTIVE');
            }

            // Check capacity if attendee count provided
            if (attendeeCount && attendeeCount > classroom.capacity) {
                throw new AppError(
                    `Attendee count (${attendeeCount}) exceeds classroom capacity (${classroom.capacity})`,
                    400,
                    'CAPACITY_EXCEEDED'
                );
            }

            // Check for conflicts with course schedules
            const scheduleConflict = await this._checkScheduleConflict(
                classroomId, date, startTime, endTime, t
            );

            if (scheduleConflict) {
                throw new AppError(
                    `Classroom is scheduled for a class at this time: ${scheduleConflict.course}`,
                    409,
                    'SCHEDULE_CONFLICT'
                );
            }

            // Check for conflicts with existing reservations
            const reservationConflict = await this._checkReservationConflict(
                classroomId, date, startTime, endTime, null, t
            );

            if (reservationConflict) {
                throw new AppError(
                    `Classroom already has a reservation at this time: ${reservationConflict.title}`,
                    409,
                    'RESERVATION_CONFLICT'
                );
            }

            // Create reservation with pending status
            const reservation = await ClassroomReservation.create({
                classroom_id: classroomId,
                user_id: userId,
                title,
                purpose,
                description,
                date,
                start_time: startTime + ':00',
                end_time: endTime + ':00',
                status: 'pending',
                attendee_count: attendeeCount
            }, { transaction: t });

            await t.commit();

            return {
                reservation: {
                    id: reservation.id,
                    title: reservation.title,
                    purpose: reservation.purpose,
                    date: reservation.date,
                    start_time: reservation.start_time,
                    end_time: reservation.end_time,
                    status: reservation.status
                },
                classroom: {
                    id: classroom.id,
                    building: classroom.building,
                    room_number: classroom.room_number,
                    capacity: classroom.capacity
                },
                message: 'Reservation request submitted. Awaiting admin approval.'
            };
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    /**
     * Approve a reservation request
     * 
     * @param {string} adminId - Admin user ID
     * @param {string} reservationId - Reservation ID
     * @returns {Promise<object>}
     */
    static async approveReservation(adminId, reservationId) {
        const t = await sequelize.transaction();

        try {
            const reservation = await ClassroomReservation.findByPk(reservationId, {
                include: [{ model: Classroom, as: 'classroom' }],
                lock: t.LOCK.UPDATE,
                transaction: t
            });

            if (!reservation) {
                throw new AppError('Reservation not found', 404, 'NOT_FOUND');
            }

            if (reservation.status !== 'pending') {
                throw new AppError(
                    `Cannot approve reservation with status: ${reservation.status}`,
                    400,
                    'INVALID_STATUS'
                );
            }

            // Re-check for conflicts (in case something was scheduled since request)
            const scheduleConflict = await this._checkScheduleConflict(
                reservation.classroom_id,
                reservation.date,
                reservation.start_time,
                reservation.end_time,
                t
            );

            if (scheduleConflict) {
                throw new AppError(
                    'Cannot approve: classroom now has a scheduled class at this time',
                    409,
                    'SCHEDULE_CONFLICT'
                );
            }

            const reservationConflict = await this._checkReservationConflict(
                reservation.classroom_id,
                reservation.date,
                reservation.start_time,
                reservation.end_time,
                reservationId, // Exclude current reservation
                t
            );

            if (reservationConflict) {
                throw new AppError(
                    'Cannot approve: another reservation was approved for this time',
                    409,
                    'RESERVATION_CONFLICT'
                );
            }

            // Approve the reservation
            await reservation.update({
                status: 'approved',
                approved_by: adminId,
                approved_at: new Date()
            }, { transaction: t });

            await t.commit();

            return {
                success: true,
                message: 'Reservation approved',
                reservation: {
                    id: reservation.id,
                    status: 'approved',
                    approved_at: reservation.approved_at
                }
            };
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    /**
     * Reject a reservation request
     * 
     * @param {string} adminId - Admin user ID
     * @param {string} reservationId - Reservation ID
     * @param {string} reason - Rejection reason
     * @returns {Promise<object>}
     */
    static async rejectReservation(adminId, reservationId, reason) {
        const reservation = await ClassroomReservation.findByPk(reservationId);

        if (!reservation) {
            throw new AppError('Reservation not found', 404, 'NOT_FOUND');
        }

        if (reservation.status !== 'pending') {
            throw new AppError(
                `Cannot reject reservation with status: ${reservation.status}`,
                400,
                'INVALID_STATUS'
            );
        }

        await reservation.update({
            status: 'rejected',
            approved_by: adminId,
            rejection_reason: reason || 'Request rejected by administrator'
        });

        return {
            success: true,
            message: 'Reservation rejected',
            reservation: {
                id: reservation.id,
                status: 'rejected',
                rejection_reason: reservation.rejection_reason
            }
        };
    }

    /**
     * Cancel a reservation (by the user who made it)
     * 
     * @param {string} userId - User ID
     * @param {string} reservationId - Reservation ID
     * @returns {Promise<object>}
     */
    static async cancelReservation(userId, reservationId) {
        const reservation = await ClassroomReservation.findByPk(reservationId);

        if (!reservation) {
            throw new AppError('Reservation not found', 404, 'NOT_FOUND');
        }

        // Only the user who made it or admin can cancel
        if (reservation.user_id !== userId) {
            throw new AppError('You can only cancel your own reservations', 403, 'FORBIDDEN');
        }

        if (['cancelled', 'rejected'].includes(reservation.status)) {
            throw new AppError('Reservation is already cancelled/rejected', 400, 'ALREADY_CANCELLED');
        }

        // Check if reservation date has passed
        const now = new Date();
        const reservationDateTime = new Date(`${reservation.date}T${reservation.start_time}`);

        if (reservationDateTime < now) {
            throw new AppError('Cannot cancel past reservations', 400, 'PAST_RESERVATION');
        }

        await reservation.update({ status: 'cancelled' });

        return {
            success: true,
            message: 'Reservation cancelled'
        };
    }

    /**
     * Get user's reservations
     * 
     * @param {string} userId - User ID
     * @param {object} options - Query options
     * @returns {Promise<object>}
     */
    static async getUserReservations(userId, options = {}) {
        const { status, page = 1, limit = 20 } = options;

        const where = { user_id: userId };
        if (status) where.status = status;

        const { count, rows } = await ClassroomReservation.findAndCountAll({
            where,
            include: [
                { model: Classroom, as: 'classroom' },
                { model: User, as: 'approver', attributes: ['id', 'first_name', 'last_name'] }
            ],
            order: [['date', 'DESC'], ['start_time', 'ASC']],
            limit,
            offset: (page - 1) * limit
        });

        return {
            reservations: rows.map(r => this._formatReservation(r)),
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil(count / limit)
            }
        };
    }

    /**
     * Get all pending reservations (for admin)
     * 
     * @param {object} options - Query options
     * @returns {Promise<object>}
     */
    static async getPendingReservations(options = {}) {
        const { page = 1, limit = 20 } = options;

        const { count, rows } = await ClassroomReservation.findAndCountAll({
            where: { status: 'pending' },
            include: [
                { model: Classroom, as: 'classroom' },
                { model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'email'] }
            ],
            order: [['created_at', 'ASC']], // FIFO
            limit,
            offset: (page - 1) * limit
        });

        return {
            reservations: rows.map(r => ({
                ...this._formatReservation(r),
                requester: r.user ? {
                    id: r.user.id,
                    name: `${r.user.first_name} ${r.user.last_name}`,
                    email: r.user.email
                } : null
            })),
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil(count / limit)
            }
        };
    }

    /**
     * Get classroom availability for a date
     * 
     * @param {string} classroomId - Classroom ID
     * @param {string} date - Date (YYYY-MM-DD)
     * @returns {Promise<object>}
     */
    static async getClassroomAvailability(classroomId, date) {
        const classroom = await Classroom.findByPk(classroomId);

        if (!classroom) {
            throw new AppError('Classroom not found', 404, 'CLASSROOM_NOT_FOUND');
        }

        // Get day of week from date
        const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });

        // Get scheduled classes for this day
        const schedules = await Schedule.findAll({
            where: {
                classroom_id: classroomId,
                day_of_week: dayOfWeek,
                is_active: true
            },
            include: [
                {
                    model: CourseSection,
                    as: 'section',
                    include: [{ model: Course, as: 'course' }]
                }
            ],
            order: [['start_time', 'ASC']]
        });

        // Get approved reservations for this date
        const reservations = await ClassroomReservation.findAll({
            where: {
                classroom_id: classroomId,
                date,
                status: 'approved'
            },
            include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name'] }],
            order: [['start_time', 'ASC']]
        });

        // Get pending reservations (to show as tentative)
        const pendingReservations = await ClassroomReservation.findAll({
            where: {
                classroom_id: classroomId,
                date,
                status: 'pending'
            },
            order: [['start_time', 'ASC']]
        });

        // Build time slots with availability
        const timeSlots = this._buildTimeSlots();
        const bookedSlots = [];

        // Mark scheduled class times
        schedules.forEach(s => {
            bookedSlots.push({
                type: 'class',
                start: s.start_time,
                end: s.end_time,
                title: s.section?.course?.name || 'Scheduled Class',
                course_code: s.section?.course?.code
            });
        });

        // Mark approved reservations
        reservations.forEach(r => {
            bookedSlots.push({
                type: 'reservation',
                start: r.start_time,
                end: r.end_time,
                title: r.title,
                reserved_by: r.user ? `${r.user.first_name} ${r.user.last_name}` : 'Reserved'
            });
        });

        // Mark pending reservations
        pendingReservations.forEach(r => {
            bookedSlots.push({
                type: 'pending',
                start: r.start_time,
                end: r.end_time,
                title: r.title + ' (pending)'
            });
        });

        return {
            classroom: {
                id: classroom.id,
                building: classroom.building,
                room_number: classroom.room_number,
                capacity: classroom.capacity,
                type: classroom.classroom_type
            },
            date,
            day_of_week: dayOfWeek,
            booked_slots: bookedSlots.sort((a, b) => a.start.localeCompare(b.start)),
            available_slots: this._getAvailableSlots(timeSlots, bookedSlots)
        };
    }

    /**
     * Get all classrooms with availability summary
     * 
     * @param {string} date - Date to check
     * @returns {Promise<Array>}
     */
    static async getClassroomsWithAvailability(date) {
        const classrooms = await Classroom.findAll({
            where: { is_active: true },
            order: [['building', 'ASC'], ['room_number', 'ASC']]
        });

        const result = [];

        for (const classroom of classrooms) {
            const availability = await this.getClassroomAvailability(classroom.id, date);
            result.push({
                ...availability.classroom,
                available_slots_count: availability.available_slots.length,
                booked_slots_count: availability.booked_slots.length
            });
        }

        return result;
    }

    // ==================== Private Helper Methods ====================

    /**
     * Check for conflicts with course schedules
     */
    static async _checkScheduleConflict(classroomId, date, startTime, endTime, transaction) {
        const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });

        // Normalize time format
        const start = startTime.substring(0, 5);
        const end = endTime.substring(0, 5);

        const conflict = await Schedule.findOne({
            where: {
                classroom_id: classroomId,
                day_of_week: dayOfWeek,
                is_active: true,
                [Op.or]: [
                    // New reservation starts during existing schedule
                    {
                        start_time: { [Op.lte]: start + ':00' },
                        end_time: { [Op.gt]: start + ':00' }
                    },
                    // New reservation ends during existing schedule
                    {
                        start_time: { [Op.lt]: end + ':00' },
                        end_time: { [Op.gte]: end + ':00' }
                    },
                    // New reservation completely contains existing schedule
                    {
                        start_time: { [Op.gte]: start + ':00' },
                        end_time: { [Op.lte]: end + ':00' }
                    }
                ]
            },
            include: [
                {
                    model: CourseSection,
                    as: 'section',
                    include: [{ model: Course, as: 'course' }]
                }
            ],
            transaction
        });

        if (conflict) {
            return {
                course: conflict.section?.course?.name || 'Scheduled class',
                time: `${conflict.start_time} - ${conflict.end_time}`
            };
        }

        return null;
    }

    /**
     * Check for conflicts with existing reservations
     */
    static async _checkReservationConflict(classroomId, date, startTime, endTime, excludeId, transaction) {
        const start = startTime.substring(0, 5);
        const end = endTime.substring(0, 5);

        const where = {
            classroom_id: classroomId,
            date,
            status: { [Op.in]: ['pending', 'approved'] },
            [Op.or]: [
                {
                    start_time: { [Op.lte]: start + ':00' },
                    end_time: { [Op.gt]: start + ':00' }
                },
                {
                    start_time: { [Op.lt]: end + ':00' },
                    end_time: { [Op.gte]: end + ':00' }
                },
                {
                    start_time: { [Op.gte]: start + ':00' },
                    end_time: { [Op.lte]: end + ':00' }
                }
            ]
        };

        if (excludeId) {
            where.id = { [Op.ne]: excludeId };
        }

        const conflict = await ClassroomReservation.findOne({
            where,
            transaction
        });

        if (conflict) {
            return {
                title: conflict.title,
                time: `${conflict.start_time} - ${conflict.end_time}`,
                status: conflict.status
            };
        }

        return null;
    }

    /**
     * Build standard time slots
     */
    static _buildTimeSlots() {
        return [
            { start: '08:00', end: '09:00' },
            { start: '09:00', end: '10:00' },
            { start: '10:00', end: '11:00' },
            { start: '11:00', end: '12:00' },
            { start: '12:00', end: '13:00' },
            { start: '13:00', end: '14:00' },
            { start: '14:00', end: '15:00' },
            { start: '15:00', end: '16:00' },
            { start: '16:00', end: '17:00' },
            { start: '17:00', end: '18:00' }
        ];
    }

    /**
     * Get available time slots
     */
    static _getAvailableSlots(timeSlots, bookedSlots) {
        return timeSlots.filter(slot => {
            // Check if this slot overlaps with any booked slot
            return !bookedSlots.some(booked => {
                const bookedStart = booked.start.substring(0, 5);
                const bookedEnd = booked.end.substring(0, 5);

                return (
                    (slot.start >= bookedStart && slot.start < bookedEnd) ||
                    (slot.end > bookedStart && slot.end <= bookedEnd) ||
                    (slot.start <= bookedStart && slot.end >= bookedEnd)
                );
            });
        });
    }

    /**
     * Format reservation for response
     */
    static _formatReservation(r) {
        return {
            id: r.id,
            title: r.title,
            purpose: r.purpose,
            description: r.description,
            date: r.date,
            start_time: r.start_time,
            end_time: r.end_time,
            status: r.status,
            attendee_count: r.attendee_count,
            rejection_reason: r.rejection_reason,
            approved_at: r.approved_at,
            created_at: r.created_at,
            classroom: r.classroom ? {
                id: r.classroom.id,
                building: r.classroom.building,
                room_number: r.classroom.room_number,
                capacity: r.classroom.capacity
            } : null,
            approver: r.approver ? {
                id: r.approver.id,
                name: `${r.approver.first_name} ${r.approver.last_name}`
            } : null
        };
    }
}

module.exports = ReservationService;
