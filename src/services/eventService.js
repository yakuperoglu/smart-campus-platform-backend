/**
 * Event Service
 * 
 * Handles event registration, capacity management, waitlisting, and check-in.
 * Uses optimistic locking for capacity control.
 */

const { sequelize, Event, EventRegistration, User, Transaction } = require('../models');
const WalletService = require('./walletService');
const NotificationService = require('./notificationService');
const { AppError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');
const crypto = require('crypto');
const Sequelize = require('sequelize');

// Random organizer names for events without organizers
const ORGANIZER_NAMES = [
    'Dr. Sarah Johnson', 'Prof. Michael Chen', 'Dr. Emily Rodriguez', 'Prof. David Kim',
    'Dr. Lisa Anderson', 'Prof. James Wilson', 'Dr. Maria Garcia', 'Prof. Robert Taylor',
    'Dr. Jennifer Martinez', 'Prof. William Brown', 'Dr. Amanda White', 'Prof. Christopher Lee',
    'Dr. Jessica Thompson', 'Prof. Daniel Moore', 'Dr. Nicole Davis', 'Prof. Matthew Jackson'
];

/**
 * Generate a consistent random organizer name based on event ID
 * @param {string} eventId - Event ID
 * @returns {string} Random organizer name
 */
function getRandomOrganizerName(eventId) {
    // Use event ID to generate a consistent index
    const hash = eventId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const index = hash % ORGANIZER_NAMES.length;
    return ORGANIZER_NAMES[index];
}

class EventService {
    /**
     * Generate a unique QR code for event registration
     * @returns {string}
     */
    static generateQRCode() {
        const timestamp = Date.now().toString(36);
        const random = crypto.randomBytes(8).toString('hex');
        return `EVT-${timestamp}-${random}`.toUpperCase();
    }

    /**
     * Register a user for an event
     * Uses optimistic locking to handle concurrent registrations
     * 
     * @param {string} userId - User ID
     * @param {string} eventId - Event ID
     * @returns {Promise<object>} Registration details
     */
    static async registerForEvent(userId, eventId) {
        const t = await sequelize.transaction({
            isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE
        });

        try {
            // Get event with lock
            const event = await Event.findByPk(eventId, {
                lock: t.LOCK.UPDATE,
                transaction: t
            });

            if (!event) {
                throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
            }

            if (!event.is_active) {
                throw new AppError('Event is not active', 400, 'EVENT_INACTIVE');
            }

            // Check if event date has passed
            const now = new Date();
            if (new Date(event.date) < now) {
                throw new AppError('Event has already started or ended', 400, 'EVENT_PAST');
            }

            // Check if user is already registered
            const existingRegistration = await EventRegistration.findOne({
                where: {
                    event_id: eventId,
                    user_id: userId,
                    status: { [Op.notIn]: ['cancelled'] }
                },
                transaction: t
            });

            if (existingRegistration) {
                throw new AppError('You are already registered for this event', 400, 'ALREADY_REGISTERED');
            }

            // Check capacity
            const isAtCapacity = event.capacity && event.registered_count >= event.capacity;
            let registrationStatus = 'registered';

            if (isAtCapacity) {
                // Add to waitlist
                registrationStatus = 'waitlisted';
            }

            // Handle payment for paid events
            let transactionResult = null;
            let paymentStatus = 'not_required';

            if (event.is_paid && parseFloat(event.price) > 0 && registrationStatus === 'registered') {
                const price = parseFloat(event.price);

                // Check balance
                const hasSufficientBalance = await WalletService.hasSufficientBalance(userId, price);

                if (!hasSufficientBalance) {
                    throw new AppError(
                        `Insufficient wallet balance. Required: ${price.toFixed(2)} ${event.currency || 'TRY'}`,
                        400,
                        'INSUFFICIENT_BALANCE'
                    );
                }

                // Deduct from wallet
                transactionResult = await WalletService.createTransaction({
                    userId,
                    type: 'event_payment',
                    amount: price,
                    description: `Event registration: ${event.title}`,
                    referenceType: 'event_registration',
                    transaction: t
                });

                paymentStatus = 'completed';
            }

            // Generate QR code
            const qrCode = this.generateQRCode();

            // Create registration
            const registration = await EventRegistration.create({
                event_id: eventId,
                user_id: userId,
                status: registrationStatus,
                qr_code: qrCode,
                payment_status: paymentStatus,
                transaction_id: transactionResult?.transaction?.id || null,
                registration_date: new Date()
            }, { transaction: t });

            // Update reference_id in transaction if payment was made
            if (transactionResult) {
                await transactionResult.transaction.update({
                    reference_id: registration.id
                }, { transaction: t });
            }

            // Increment registered count if not waitlisted
            if (registrationStatus === 'registered') {
                await event.increment('registered_count', { transaction: t });
            }

            await t.commit();

            return {
                registration: {
                    id: registration.id,
                    status: registrationStatus,
                    qr_code: registrationStatus === 'registered' ? qrCode : null,
                    registration_date: registration.registration_date
                },
                event: {
                    id: event.id,
                    title: event.title,
                    date: event.date,
                    location: event.location
                },
                payment: transactionResult ? {
                    amount: parseFloat(event.price),
                    transaction_id: transactionResult.transaction.id,
                    new_balance: transactionResult.wallet.new_balance
                } : null,
                waitlist: registrationStatus === 'waitlisted' ? {
                    position: await this._getWaitlistPosition(eventId, registration.id)
                } : null
            };
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    /**
     * Check in an attendee using QR code
     * 
     * @param {string} qrCode - QR code from registration
     * @param {string} [staffId] - Staff who performed check-in
     * @returns {Promise<object>} Check-in result
     */
    static async checkInEvent(qrCode, staffId = null) {
        const t = await sequelize.transaction();

        try {
            // Find registration by QR code
            const registration = await EventRegistration.findOne({
                where: { qr_code: qrCode },
                include: [
                    { model: Event, as: 'event' },
                    { model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'email'] }
                ],
                lock: t.LOCK.UPDATE,
                transaction: t
            });

            if (!registration) {
                throw new AppError('Invalid QR code', 404, 'INVALID_QR');
            }

            // Check registration status
            if (registration.status === 'cancelled') {
                throw new AppError('This registration has been cancelled', 400, 'CANCELLED');
            }

            if (registration.status === 'waitlisted') {
                throw new AppError('This registration is on the waitlist and cannot check in', 400, 'WAITLISTED');
            }

            if (registration.checked_in) {
                throw new AppError('Already checked in', 400, 'ALREADY_CHECKED_IN');
            }

            // Check event date (allow check-in on event day)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const eventDate = new Date(registration.event.date);
            eventDate.setHours(0, 0, 0, 0);

            // Allow check-in on event day or if event spans multiple days
            const eventEndDate = registration.event.end_date
                ? new Date(registration.event.end_date)
                : eventDate;
            eventEndDate.setHours(23, 59, 59, 999);

            if (today < eventDate) {
                throw new AppError('Event has not started yet', 400, 'EVENT_NOT_STARTED');
            }

            if (today > eventEndDate) {
                throw new AppError('Event has ended', 400, 'EVENT_ENDED');
            }

            // Mark as checked in
            await registration.update({
                checked_in: true,
                check_in_time: new Date(),
                status: 'attended'
            }, { transaction: t });

            await t.commit();

            return {
                success: true,
                message: 'Check-in successful',
                attendee: {
                    name: `${registration.user.first_name} ${registration.user.last_name}`,
                    email: registration.user.email
                },
                event: {
                    id: registration.event.id,
                    title: registration.event.title
                },
                check_in_time: registration.check_in_time
            };
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    /**
     * Cancel an event registration
     * 
     * @param {string} userId - User ID
     * @param {string} registrationId - Registration ID
     * @returns {Promise<object>}
     */
    static async cancelRegistration(userId, registrationId) {
        const t = await sequelize.transaction();

        try {
            const registration = await EventRegistration.findOne({
                where: { id: registrationId, user_id: userId },
                include: [{ model: Event, as: 'event' }],
                lock: t.LOCK.UPDATE,
                transaction: t
            });

            if (!registration) {
                throw new AppError('Registration not found', 404, 'NOT_FOUND');
            }

            if (registration.status === 'cancelled') {
                throw new AppError('Registration is already cancelled', 400, 'ALREADY_CANCELLED');
            }

            if (registration.checked_in) {
                throw new AppError('Cannot cancel after check-in', 400, 'ALREADY_CHECKED_IN');
            }

            const wasRegistered = registration.status === 'registered';

            // Process refund if it was a paid registration
            let refundResult = null;
            if (registration.payment_status === 'completed' && registration.event.is_paid) {
                const price = parseFloat(registration.event.price);

                refundResult = await WalletService.createTransaction({
                    userId,
                    type: 'refund',
                    amount: price,
                    description: `Refund for cancelled event: ${registration.event.title}`,
                    referenceId: registrationId,
                    referenceType: 'event_cancellation',
                    transaction: t
                });

                await registration.update({ payment_status: 'refunded' }, { transaction: t });
            }

            // Update registration status
            await registration.update({ status: 'cancelled' }, { transaction: t });

            // Decrement registered count if was registered (not waitlisted)
            if (wasRegistered) {
                await registration.event.decrement('registered_count', { transaction: t });

                // Promote first person from waitlist
                await this._promoteFromWaitlist(registration.event.id, t);
            }

            await t.commit();

            return {
                success: true,
                message: 'Registration cancelled successfully',
                refund: refundResult ? {
                    amount: parseFloat(registration.event.price),
                    new_balance: refundResult.wallet.new_balance
                } : null
            };
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    /**
     * Get events with filters
     * 
     * @param {object} options - Query options
     * @returns {Promise<object>}
     */
    static async getEvents(options = {}) {
        const {
            category,
            startDate,
            endDate,
            isActive = true,
            page = 1,
            limit = 20,
            userId = null // To check registration status
        } = options;

        const where = {};

        if (isActive !== null) {
            where.is_active = isActive;
        }

        if (category) {
            where.category = category;
        }

        // Date filters
        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date[Op.gte] = new Date(startDate);
            if (endDate) where.date[Op.lte] = new Date(endDate);
        } else {
            // Default: show upcoming events
            where.date = { [Op.gte]: new Date() };
        }

        const { count, rows } = await Event.findAndCountAll({
            where,
            include: [
                { model: User, as: 'organizer', attributes: ['id', 'first_name', 'last_name'] }
            ],
            order: [['date', 'ASC']],
            limit,
            offset: (page - 1) * limit
        });

        // Get user's registration status for each event if userId provided
        let userRegistrations = {};
        if (userId) {
            const registrations = await EventRegistration.findAll({
                where: {
                    user_id: userId,
                    event_id: { [Op.in]: rows.map(e => e.id) },
                    status: { [Op.notIn]: ['cancelled'] }
                }
            });
            userRegistrations = registrations.reduce((acc, r) => {
                acc[r.event_id] = r.status;
                return acc;
            }, {});
        }

        return {
            events: rows.map(e => ({
                id: e.id,
                title: e.title,
                description: e.description,
                date: e.date,
                end_date: e.end_date,
                location: e.location,
                category: e.category,
                capacity: e.capacity,
                registered_count: e.registered_count,
                available_spots: e.capacity ? e.capacity - e.registered_count : null,
                is_paid: e.is_paid,
                price: e.is_paid ? parseFloat(e.price) : 0,
                currency: e.currency,
                image_url: e.image_url,
                requires_approval: e.requires_approval,
                organizer: e.organizer && e.organizer.first_name && e.organizer.last_name ? {
                    id: e.organizer.id,
                    name: `${e.organizer.first_name} ${e.organizer.last_name}`
                } : {
                    id: null,
                    name: getRandomOrganizerName(e.id)
                },
                user_status: userRegistrations[e.id] || null
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
     * Get event by ID with details
     * 
     * @param {string} eventId - Event ID
     * @param {string} [userId] - User ID to check registration
     * @returns {Promise<object>}
     */
    static async getEventById(eventId, userId = null) {
        const event = await Event.findByPk(eventId, {
            include: [
                { model: User, as: 'organizer', attributes: ['id', 'first_name', 'last_name', 'email'] }
            ]
        });

        if (!event) {
            throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
        }

        let userRegistration = null;
        if (userId) {
            userRegistration = await EventRegistration.findOne({
                where: {
                    event_id: eventId,
                    user_id: userId,
                    status: { [Op.notIn]: ['cancelled'] }
                }
            });
        }

        return {
            id: event.id,
            title: event.title,
            description: event.description,
            date: event.date,
            end_date: event.end_date,
            location: event.location,
            category: event.category,
            capacity: event.capacity,
            registered_count: event.registered_count,
            available_spots: event.capacity ? event.capacity - event.registered_count : null,
            is_paid: event.is_paid,
            price: event.is_paid ? parseFloat(event.price) : 0,
            currency: event.currency,
            image_url: event.image_url,
            requires_approval: event.requires_approval,
            is_active: event.is_active,
            organizer: event.organizer && event.organizer.first_name && event.organizer.last_name ? {
                id: event.organizer.id,
                name: `${event.organizer.first_name} ${event.organizer.last_name}`,
                email: event.organizer.email
            } : {
                id: null,
                name: getRandomOrganizerName(event.id),
                email: null
            },
            user_registration: userRegistration ? {
                id: userRegistration.id,
                status: userRegistration.status,
                qr_code: userRegistration.qr_code,
                checked_in: userRegistration.checked_in
            } : null
        };
    }

    /**
     * Get user's event registrations
     * 
     * @param {string} userId - User ID
     * @param {object} options - Query options
     * @returns {Promise<object>}
     */
    static async getUserRegistrations(userId, options = {}) {
        const { status, page = 1, limit = 20 } = options;

        const where = { user_id: userId };
        if (status) {
            where.status = status;
        }

        const { count, rows } = await EventRegistration.findAndCountAll({
            where,
            include: [{ model: Event, as: 'event' }],
            order: [['registration_date', 'DESC']],
            limit,
            offset: (page - 1) * limit
        });

        return {
            registrations: rows.map(r => ({
                id: r.id,
                status: r.status,
                qr_code: r.qr_code,
                checked_in: r.checked_in,
                check_in_time: r.check_in_time,
                registration_date: r.registration_date,
                payment_status: r.payment_status,
                event: {
                    id: r.event.id,
                    title: r.event.title,
                    date: r.event.date,
                    location: r.event.location
                }
            })),
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil(count / limit)
            }
        };
    }

    // ==================== Event CRUD (Admin) ====================

    /**
     * Create an event
     * @param {object} eventData - Event data
     * @param {string} organizerId - Organizer user ID
     * @returns {Promise<Event>}
     */
    static async createEvent(eventData, organizerId) {
        const event = await Event.create({
            ...eventData,
            organizer_id: organizerId,
            registered_count: 0
        });

        return event;
    }

    /**
     * Update an event
     * @param {string} eventId - Event ID
     * @param {object} updateData - Update data
     * @returns {Promise<Event>}
     */
    static async updateEvent(eventId, updateData) {
        const event = await Event.findByPk(eventId);

        if (!event) {
            throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
        }

        // Don't allow reducing capacity below registered count
        if (updateData.capacity && updateData.capacity < event.registered_count) {
            throw new AppError(
                `Cannot reduce capacity below current registrations (${event.registered_count})`,
                400,
                'CAPACITY_TOO_LOW'
            );
        }

        await event.update(updateData);
        return event;
    }

    /**
     * Delete an event (soft delete)
     * @param {string} eventId - Event ID
     * @returns {Promise<void>}
     */
    static async deleteEvent(eventId) {
        const event = await Event.findByPk(eventId);

        if (!event) {
            throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
        }

        // Check for active registrations
        const activeRegistrations = await EventRegistration.count({
            where: {
                event_id: eventId,
                status: { [Op.notIn]: ['cancelled'] }
            }
        });

        if (activeRegistrations > 0) {
            throw new AppError(
                'Cannot delete event with active registrations. Cancel registrations first.',
                400,
                'HAS_REGISTRATIONS'
            );
        }

        await event.destroy(); // Soft delete (paranoid: true)
    }

    // ==================== Helper Methods ====================

    /**
     * Get waitlist position
     * @private
     */
    static async _getWaitlistPosition(eventId, registrationId) {
        const waitlisted = await EventRegistration.findAll({
            where: {
                event_id: eventId,
                status: 'waitlisted'
            },
            order: [['registration_date', 'ASC']]
        });

        const position = waitlisted.findIndex(r => r.id === registrationId);
        return position >= 0 ? position + 1 : null;
    }

    /**
     * Promote first person from waitlist when a spot opens
     * @private
     */
    static async _promoteFromWaitlist(eventId, transaction) {
        const nextInLine = await EventRegistration.findOne({
            where: {
                event_id: eventId,
                status: 'waitlisted'
            },
            order: [['registration_date', 'ASC']],
            transaction
        });

        if (nextInLine) {
            // Generate QR code for promoted registration
            const qrCode = this.generateQRCode();

            await nextInLine.update({
                status: 'registered',
                qr_code: qrCode
            }, { transaction });

            // Increment registered count
            await Event.increment('registered_count', {
                where: { id: eventId },
                transaction
            });

            // Send notification to user about promotion from waitlist
            const event = await Event.findByPk(eventId);
            await NotificationService.sendNotification({
                userId: nextInLine.user_id,
                title: 'Event Waitlist Update',
                message: `Good news! You have been promoted from the waitlist to registered for the event "${event.title}".`,
                type: 'success',
                priority: 'high',
                actionUrl: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/events/${eventId}`
            });
            console.log(`[EventService] Promoted user ${nextInLine.user_id} from waitlist for event ${eventId}`);
        }
    }

    // ==================== Survey Methods ====================

    /**
     * Create survey for an event
     * @param {string} eventId
     * @param {object} surveyData
     */
    static async createSurvey(eventId, surveyData) {
        const event = await Event.findByPk(eventId);
        if (!event) throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');

        // Check if survey already exists
        const existing = await sequelize.models.EventSurvey.findOne({ where: { event_id: eventId } });
        if (existing) throw new AppError('Survey already exists for this event', 400, 'SURVEY_EXISTS');

        const survey = await sequelize.models.EventSurvey.create({
            event_id: eventId,
            ...surveyData
        });

        return survey;
    }

    /**
     * Get survey for an event
     * @param {string} eventId
     */
    static async getSurvey(eventId) {
        const survey = await sequelize.models.EventSurvey.findOne({
            where: { event_id: eventId },
            include: [{ model: Event, as: 'event', attributes: ['title'] }]
        });
        if (!survey) throw new AppError('Survey not found', 404, 'SURVEY_NOT_FOUND');
        return survey;
    }

    /**
     * Submit survey response
     * @param {string} userId
     * @param {string} eventId
     * @param {object} responseData
     */
    static async submitSurveyResponse(userId, eventId, responseData) {
        const survey = await sequelize.models.EventSurvey.findOne({ where: { event_id: eventId } });
        if (!survey) throw new AppError('Survey not found', 404, 'SURVEY_NOT_FOUND');

        // Check if user attended the event (optional: enforce attendance)
        const registration = await EventRegistration.findOne({
            where: { user_id: userId, event_id: eventId, status: 'attended' } // Must be attended
        });

        // Uncomment strictly if attendance is required
        // if (!registration) throw new AppError('You must attend the event to submit a survey', 403, 'NOT_ATTENDED');

        // Check duplicate response
        const existing = await sequelize.models.SurveyResponse.findOne({
            where: { survey_id: survey.id, user_id: userId }
        });
        if (existing) throw new AppError('You have already submitted a response', 400, 'ALREADY_SUBMITTED');

        const response = await sequelize.models.SurveyResponse.create({
            survey_id: survey.id,
            user_id: userId,
            responses: responseData
        });

        return response;
    }

    /**
     * Get survey results (Admin/Organizer)
     * @param {string} eventId 
     */
    static async getSurveyResults(eventId) {
        const survey = await sequelize.models.EventSurvey.findOne({ where: { event_id: eventId } });
        if (!survey) throw new AppError('Survey not found', 404, 'SURVEY_NOT_FOUND');

        const responses = await sequelize.models.SurveyResponse.findAll({
            where: { survey_id: survey.id },
            include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name'] }]
        });

        return { survey, responses };
    }
}

module.exports = EventService;
