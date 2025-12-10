const request = require('supertest');
const jwt = require('jsonwebtoken');

// 1. Mock middlewares BEFORE importing app
jest.mock('../../src/middleware/authMiddleware', () => ({
    verifyToken: (req, res, next) => {
        req.user = { id: 'user-123', role: 'student', email: 'user@example.com' };
        next();
    },
    optionalAuth: (req, res, next) => next(),
    loadUserProfile: (req, res, next) => next()
}));

// 2. Mock Models
jest.mock('../../src/models', () => {
    const mockUserInstance = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'student',
        password_hash: 'hashed',
        is_verified: true,
        toJSON: () => ({ id: 'user-123', email: 'user@example.com', role: 'student' }),
        update: jest.fn().mockResolvedValue(true)
    };

    return {
        sequelize: {
            transaction: jest.fn(() => ({
                commit: jest.fn(),
                rollback: jest.fn()
            })),
            authenticate: jest.fn()
        },
        User: {
            findByPk: jest.fn().mockResolvedValue(mockUserInstance),
            findOne: jest.fn().mockResolvedValue(mockUserInstance)
        },
        Student: {
            findOne: jest.fn().mockResolvedValue({
                gpa: 3.5,
                toJSON: () => ({ gpa: 3.5 })
            })
        },
        Faculty: { findOne: jest.fn() },
        Admin: { findOne: jest.fn() },
        Department: { findByPk: jest.fn() },
        Wallet: { findOne: jest.fn().mockResolvedValue({ balance: 0 }) }
    };
});

// 3. Mock bcrypt
jest.mock('bcryptjs', () => ({
    compare: jest.fn().mockResolvedValue(true),
    genSalt: jest.fn(),
    hash: jest.fn().mockResolvedValue('hashed')
}));

// Import app AFTER mocks
const app = require('../../src/app');

describe('User Integration Tests', () => {

    describe('GET /api/v1/users/me', () => {
        it('should return current user profile', async () => {
            const res = await request(app).get('/api/v1/users/me');

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.user.email).toBe('user@example.com');
        });
    });

    describe('POST /api/v1/users/me/change-password', () => {
        it('should change password successfully', async () => {
            const res = await request(app)
                .post('/api/v1/users/me/change-password')
                .send({
                    currentPassword: 'oldPassword',
                    newPassword: 'NewPassword123!',
                    confirmPassword: 'NewPassword123!'
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });
});
