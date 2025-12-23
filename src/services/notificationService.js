/**
 * Notification Service
 * 
 * Handles sending notifications via multiple channels (Database, Email).
 * Centralizes notification logic.
 */

const { sequelize, Notification, User } = require('../models');
const EmailService = require('../utils/emailService');

class NotificationService {
    /**
     * Send a notification to a user
     * @param {object} params
     * @param {string} params.userId - User ID
     * @param {string} params.title - Notification title
     * @param {string} params.message - Notification message
     * @param {string} [params.type='info'] - Type (info, warning, success, error, announcement)
     * @param {string} [params.priority='medium'] - Priority (low, medium, high, urgent)
     * @param {string} [params.actionUrl] - Optional action URL
     * @param {boolean} [params.sendEmail=true] - Whether to send an email
     */
    static async sendNotification({
        userId,
        title,
        message,
        type = 'info',
        priority = 'medium',
        actionUrl = null,
        sendEmail = true
    }) {
        try {
            // 1. Create Database Notification
            const notification = await Notification.create({
                user_id: userId,
                title,
                message,
                type,
                priority,
                action_url: actionUrl,
                is_read: false
            });

            // 2. Send Email (Fire and forget, don't block)
            if (sendEmail) {
                this._sendEmailNotification(userId, title, message, actionUrl).catch(err => {
                    console.error(`[NotificationService] Failed to send email to user ${userId}:`, err);
                });
            }

            return notification;
        } catch (error) {
            console.error('[NotificationService] Error sending notification:', error);
            // Don't throw error to avoid breaking the calling flow (notifications are auxiliary)
            return null;
        }
    }

    /**
     * Helper to send email
     * @private
     */
    static async _sendEmailNotification(userId, title, message, actionUrl) {
        const user = await User.findByPk(userId);
        if (!user || !user.email) return;

        // Construct simple HTML email
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 5px; overflow: hidden;">
                <div style="background-color: #3f51b5; color: white; padding: 20px;">
                    <h2 style="margin: 0;">${title}</h2>
                </div>
                <div style="padding: 20px;">
                    <p style="font-size: 16px; color: #333;">${message}</p>
                    
                    ${actionUrl ? `
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="${actionUrl}" style="background-color: #3f51b5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                            View Details
                        </a>
                    </div>
                    ` : ''}
                </div>
                <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #777;">
                    <p>Smart Campus Platform Notification</p>
                </div>
            </div>
        `;

        await EmailService.sendNotificationEmail(user.email, title, html);
    }
}

module.exports = NotificationService;
