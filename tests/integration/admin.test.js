const request = require('supertest');
const app = require('../../src/app');
const jwt = require('jsonwebtoken');

// Mock middlewares to bypass auth logic and focus on controller/route integration
jest.mock('../../src/middleware/authMiddleware', () => ({
    verifyToken: (req, res, next) => {
        req.user = { id: 'admin-id', role: 'admin' };
        next();
    }
}));

jest.mock('../../src/middleware/roleMiddleware', () => ({
    adminOnly: (req, res, next) => {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        next();
    }
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
                    { id: 'user-1', email: 'user@example.com', role: 'student' }
                ]
            }),
            findByPk: jest.fn()
        },
        Student: { findOne: jest.fn() },
        Faculty: { findOne: jest.fn() },
        Admin: { findOne: jest.fn() },
        Department: { findByPk: jest.fn() }
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
