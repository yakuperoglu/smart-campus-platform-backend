const authController = require('../../src/controllers/authController');
const { User, EmailVerification, sequelize } = require('../../src/models');
const emailService = require('../../src/utils/emailService');
const bcrypt = require('bcryptjs');

// Mock dependencies
jest.mock('../../src/models');
jest.mock('../../src/utils/emailService');
jest.mock('bcryptjs');

describe('Auth Controller Unit Tests', () => {
    let req, res, next;

    beforeEach(() => {
        req = { body: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('register', () => {
        it('should register a new user successfully', async () => {
            req.body = {
                email: 'test@example.com',
                password: 'Password123!',
                role: 'student'
            };

            // Mocks
            sequelize.transaction.mockResolvedValue({
                commit: jest.fn(),
                rollback: jest.fn()
            });
            User.findOne.mockResolvedValue(null);
            bcrypt.genSalt.mockResolvedValue('salt');
            bcrypt.hash.mockResolvedValue('hashedPassword');
            User.create.mockResolvedValue({
                id: 'user-123',
                email: 'test@example.com',
                role: 'student'
            });
            EmailVerification.create.mockResolvedValue({});
            emailService.sendVerificationEmail.mockResolvedValue(true);

            await authController.register(req, res, next);

            expect(User.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
            expect(User.create).toHaveBeenCalled();
            expect(emailService.sendVerificationEmail).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });

        it('should return error if user already exists', async () => {
            req.body = { email: 'existing@example.com' };

            sequelize.transaction.mockResolvedValue({
                rollback: jest.fn()
            });
            User.findOne.mockResolvedValue({ id: 'existing-id' });

            await authController.register(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.anything());
            // Check if the error passed to next is correct
            const errorArg = next.mock.calls[0][0];
            expect(errorArg.message).toContain('User with this email already exists');
        });
    });

    // Login tests can be added here
});
