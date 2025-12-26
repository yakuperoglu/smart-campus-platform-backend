const request = require('supertest');
const app = require('../../src/app');
const jwt = require('jsonwebtoken');

// Mock middlewares to bypass auth logic and focus on controller/route integration
jest.mock('../../src/middleware/authMiddleware', () => ({
    verifyToken: (req, res, next) => {
        req.user = { id: 'admin-id', role: 'admin' };
        next();
    },
    loadUserProfile: (req, res, next) => next(),
    optionalAuth: (req, res, next) => next(),
    isAdmin: (req, res, next) => next()
}));

jest.mock('../../src/middleware/roleMiddleware', () => ({
    adminOnly: (req, res, next) => {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        next();
    },
    studentOnly: (req, res, next) => next(),
    teacherOnly: (req, res, next) => next(),
    authorize: (...roles) => (req, res, next) => next(),
    facultyOrAdmin: (req, res, next) => next()
}));

// Mock Models
jest.mock('../../src/models', () => {
    return {
        sequelize: {
            transaction: jest.fn(() => ({
                commit: jest.fn(),
                rollback: jest.fn()
            })),
            authenticate: jest.fn()
        },
        User: {
            findAndCountAll: jest.fn().mockResolvedValue({
                count: 1,
                rows: [
                    {
                        id: 'user-1',
                        email: 'user@example.com',
                        role: 'student',
                        toJSON: function () {
                            const { toJSON, ...rest } = this;
                            return rest;
                        }
                    }
                ]
            }),
            findByPk: jest.fn()
        },
        Student: { findOne: jest.fn().mockResolvedValue(null) },
        Faculty: { findOne: jest.fn().mockResolvedValue(null) },
        Admin: { findOne: jest.fn().mockResolvedValue(null) },
        Department: { findByPk: jest.fn() },
        Wallet: { findOne: jest.fn().mockResolvedValue(null) },
        NotificationPreference: { findOne: jest.fn().mockResolvedValue(null) },
        Enrollment: { findOne: jest.fn(), findAll: jest.fn(), create: jest.fn() },
        CourseSection: { findByPk: jest.fn(), update: jest.fn() },
        Course: { findByPk: jest.fn() }
    };
});

describe('Admin Integration Tests', () => {
    describe('GET /api/v1/users', () => {
        it('should return list of users for admin', async () => {
            const res = await request(app).get('/api/v1/users');

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.users).toHaveLength(1);
        });
    });
});
