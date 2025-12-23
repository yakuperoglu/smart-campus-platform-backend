/**
 * Event Controller
 * 
 * Handles HTTP requests for event management and registration.
 */

const EventService = require('../services/eventService');
const { AppError } = require('../middleware/errorHandler');

// ==================== Event Registration ====================

/**
 * Register for an event
 * POST /api/events/:id/register
 */
const registerForEvent = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const eventId = req.params.id;

        const result = await EventService.registerForEvent(userId, eventId);

        res.status(201).json({
            success: true,
            message: result.registration.status === 'waitlisted'
                ? 'Added to waitlist'
                : 'Registration successful',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Check in to an event
 * POST /api/events/:id/checkin
 */
const checkInEvent = async (req, res, next) => {
    try {
        const { qr_code } = req.body;
        const staffId = req.user?.id;

        if (!qr_code) {
            return next(new AppError('QR code is required', 400, 'MISSING_QR_CODE'));
        }

        const result = await EventService.checkInEvent(qr_code, staffId);

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Cancel registration
 * DELETE /api/events/registrations/:id
 */
const cancelRegistration = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const registrationId = req.params.id;

        const result = await EventService.cancelRegistration(userId, registrationId);

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get user's registrations
 * GET /api/events/registrations
 */
const getMyRegistrations = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { status, page, limit } = req.query;

        const result = await EventService.getUserRegistrations(userId, {
            status,
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20
        });

        res.status(200).json({
            success: true,
            data: result.registrations,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

// ==================== Event Listing ====================

/**
 * Get events with filters
 * GET /api/events
 */
const getEvents = async (req, res, next) => {
    try {
        const { category, start_date, end_date, page, limit } = req.query;
        const userId = req.user?.id;

        const result = await EventService.getEvents({
            category,
            startDate: start_date,
            endDate: end_date,
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20,
            userId
        });

        res.status(200).json({
            success: true,
            data: result.events,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get event by ID
 * GET /api/events/:id
 */
const getEventById = async (req, res, next) => {
    try {
        const eventId = req.params.id;
        const userId = req.user?.id;

        const event = await EventService.getEventById(eventId, userId);

        res.status(200).json({
            success: true,
            data: event
        });
    } catch (error) {
        next(error);
    }
};

// ==================== Event CRUD (Admin) ====================

/**
 * Create an event
 * POST /api/events
 */
const createEvent = async (req, res, next) => {
    try {
        const organizerId = req.user.id;
        const eventData = req.body;

        if (!eventData.title || !eventData.date) {
            return next(new AppError('Title and date are required', 400, 'MISSING_FIELDS'));
        }

        const event = await EventService.createEvent(eventData, organizerId);

        res.status(201).json({
            success: true,
            message: 'Event created successfully',
            data: event
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update an event
 * PUT /api/events/:id
 */
const updateEvent = async (req, res, next) => {
    try {
        const eventId = req.params.id;
        const updateData = req.body;

        const event = await EventService.updateEvent(eventId, updateData);

        res.status(200).json({
            success: true,
            message: 'Event updated successfully',
            data: event
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete an event
 * DELETE /api/events/:id
 */
const deleteEvent = async (req, res, next) => {
    try {
        const eventId = req.params.id;

        await EventService.deleteEvent(eventId);

        res.status(200).json({
            success: true,
            message: 'Event deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// Exports moved to the end of the file

// ==================== Survey Endpoints ====================

/**
 * Create a survey (Organizer/Admin)
 * POST /api/events/:id/survey
 */
const createSurvey = async (req, res, next) => {
    try {
        const eventId = req.params.id;
        const organizerId = req.user.id;
        // Optional: Check if user is organizer of this event

        const result = await EventService.createSurvey(eventId, req.body);
        res.status(201).json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};

/**
 * Get survey for an event
 * GET /api/events/:id/survey
 */
const getSurvey = async (req, res, next) => {
    try {
        const eventId = req.params.id;
        const result = await EventService.getSurvey(eventId);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};

/**
 * Submit survey response
 * POST /api/events/:id/survey/response
 */
const submitSurvey = async (req, res, next) => {
    try {
        const eventId = req.params.id;
        const userId = req.user.id;
        const result = await EventService.submitSurveyResponse(userId, eventId, req.body.responses);
        res.status(201).json({ success: true, message: 'Survey submitted successfully', data: result });
    } catch (error) {
        next(error);
    }
};

/**
 * Get survey results (Organizer/Admin)
 * GET /api/events/:id/survey/results
 */
const getSurveyResults = async (req, res, next) => {
    try {
        const eventId = req.params.id;
        // Optional: Check permissions

        const result = await EventService.getSurveyResults(eventId);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    registerForEvent,
    checkInEvent,
    cancelRegistration,
    getMyRegistrations,
    getEvents,
    getEventById,
    createEvent,
    updateEvent,
    deleteEvent,

    // Survey Endpoints
    createSurvey,
    getSurvey,
    submitSurvey,
    getSurveyResults
};
