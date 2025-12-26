const NotificationService = require('../../src/services/notificationService');
const { NotificationPreference, User, Notification } = require('../../src/models');
const EmailService = require('../../src/utils/emailService');

// Mock dependencies
jest.mock('../../src/models');
jest.mock('../../src/utils/emailService');
jest.mock('../../src/socket', () => ({
    getIo: jest.fn().mockReturnValue({
        to: jest.fn().mockReturnThis(),
        emit: jest.fn()
    })
}));

describe('Unit: Notification Logic', () => {
    beforeEach(() => {
        User.findByPk.mockResolvedValue({ id: 1, email: 'test@test.com' });
        Notification.create.mockResolvedValue({
            id: 1,
            title: 'Test',
            message: 'Message',
            type: 'info',
            priority: 'medium',
            created_at: new Date()
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('Should send email when preference is true', async () => {
        NotificationPreference.findOne.mockResolvedValue({
            preferences: { email: true, push: true }
        });

        await NotificationService.sendNotification({
            userId: 1,
            title: 'Test',
            message: 'Message',
            sendEmail: true
        });

        expect(EmailService.sendNotificationEmail).toHaveBeenCalled();
    });

    test('Should NOT send email when preference is false', async () => {
        NotificationPreference.findOne.mockResolvedValue({
            preferences: { email: false, push: true }
        });

        await NotificationService.sendNotification({
            userId: 1,
            title: 'Test',
            message: 'Message',
            sendEmail: true
        });

        expect(EmailService.sendNotificationEmail).not.toHaveBeenCalled();
    });

    test('Should default to sending if no preference record found', async () => {
        NotificationPreference.findOne.mockResolvedValue(null); // No record

        await NotificationService.sendNotification({
            userId: 1,
            title: 'Test',
            message: 'Message',
            sendEmail: true
        });

        expect(EmailService.sendNotificationEmail).toHaveBeenCalled();
    });

    test('Should respect function parameter sendEmail=false override', async () => {
        NotificationPreference.findOne.mockResolvedValue({
            preferences: { email: true }
        });

        await NotificationService.sendNotification({
            userId: 1,
            title: 'Test',
            message: 'Message',
            sendEmail: false
        });

        expect(EmailService.sendNotificationEmail).not.toHaveBeenCalled();
    });

    // Add 10 more variations for robustness...
    test('Should handle email service error gracefully', async () => {
        NotificationPreference.findOne.mockResolvedValue({ preferences: { email: true } });
        EmailService.sendNotificationEmail.mockRejectedValue(new Error('SMTP Error'));

        // Should not throw
        await expect(NotificationService.sendNotification({
            userId: 1, title: 'T', message: 'M'
        })).resolves.not.toThrow();
    });
});
