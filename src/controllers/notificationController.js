/**
 * Notification Controller
 * 
 * Handles fetching and managing user notifications.
 */

const { Notification, NotificationPreference } = require('../models');
const { AppError } = require('../middleware/errorHandler');

/**
 * Get user's notifications
 * GET /api/v1/notifications
 */
const getNotifications = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { limit = 10, page = 1 } = req.query;

        const { count, rows } = await Notification.findAndCountAll({
            where: { user_id: userId },
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        res.status(200).json({
            success: true,
            data: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                totalPages: Math.ceil(count / parseInt(limit))
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Mark notification as read
 * PUT /api/v1/notifications/:id/read
 */
const markAsRead = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const notificationId = req.params.id;

        const notification = await Notification.findOne({
            where: { id: notificationId, user_id: userId }
        });

        if (!notification) {
            return next(new AppError('Notification not found', 404, 'NOT_FOUND'));
        }

        await notification.update({ is_read: true });

        res.status(200).json({
            success: true,
            message: 'Notification marked as read'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Mark all notifications as read
 * PUT /api/v1/notifications/read-all
 */
const markAllAsRead = async (req, res, next) => {
    try {
        const userId = req.user.id;

        await Notification.update(
            { is_read: true },
            { where: { user_id: userId, is_read: false } }
        );

        res.status(200).json({
            success: true,
            message: 'All notifications marked as read'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete a notification
 * DELETE /api/v1/notifications/:id
 */
const deleteNotification = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const notificationId = req.params.id;

        const notification = await Notification.findOne({
            where: { id: notificationId, user_id: userId }
        });

        if (!notification) {
            return next(new AppError('Notification not found', 404, 'NOT_FOUND'));
        }

        await notification.destroy();

        res.status(200).json({
            success: true,
            message: 'Notification deleted'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get notification preferences
 * GET /api/v1/notifications/preferences
 */
const getPreferences = async (req, res, next) => {
    try {
        const userId = req.user.id;

        let prefs = await NotificationPreference.findOne({
            where: { user_id: userId }
        });

        if (!prefs) {
            // Create default preferences if not exist
            prefs = await NotificationPreference.create({
                user_id: userId
            });
        }

        res.status(200).json({
            success: true,
            data: prefs.preferences
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update notification preferences
 * PUT /api/v1/notifications/preferences
 */
const updatePreferences = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const newPreferences = req.body;

        let prefs = await NotificationPreference.findOne({
            where: { user_id: userId }
        });

        if (!prefs) {
            prefs = await NotificationPreference.create({
                user_id: userId,
                preferences: newPreferences
            });
        } else {
            // Merge existing with new
            const merged = { ...prefs.preferences, ...newPreferences };
            await prefs.update({ preferences: merged });
        }

        res.status(200).json({
            success: true,
            data: prefs.preferences
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getPreferences,
    updatePreferences
};
