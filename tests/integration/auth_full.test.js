const request = require('supertest');
const app = require('../../src/app');

// Mock utils
jest.mock('../../src/utils/emailService', () => ({
    sendVerificationEmail: jest.fn().mockResolvedValue(true),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
    sendWelcomeEmail: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../src/utils/jwtHelper', () => ({
    generateTokenPair: jest.fn(() => ({ accessToken: 'acc_token', refreshToken: 'ref_token' })),
    verifyRefreshToken: jest.fn()
}));

// Mock relevant models
jest.mock('../../src/models', () => ({
    User: {
        findOne: jest.fn(),
        create: jest.fn(),
        findByPk: jest.fn(),
        update: jest.fn()
    },
    Student: {
        create: jest.fn(),
        findOne: jest.fn()
    },
    Faculty: {
        create: jest.fn(),
        findOne: jest.fn()
    },
    Admin: {
        findOne: jest.fn()
    },
    Department: {
        findByPk: jest.fn()
    },
    Wallet: {
        create: jest.fn()
    },
    EmailVerification: {
        create: jest.fn(),
        findOne: jest.fn(),
        destroy: jest.fn()
    },
    PasswordReset: {
        create: jest.fn(),
        findOne: jest.fn(),
        destroy: jest.fn()
    },
    sequelize: {
        transaction: jest.fn(() => ({
            commit: jest.fn(),
            rollback: jest.fn()
        }))
    }
}));

const bcrypt = require('bcryptjs');

describe('Integration: Full Authentication Flow', () => {

    // Test Set 1: Registration
    test('POST /register - Successful student registration', async () => {
        const userData = {
            email: 'newuser@edu.tr',
            password: 'StrongPassword123!',
            first_name: 'Ali',
            last_name: 'Yilmaz',
            first_name: 'Ali',
            last_name: 'Yilmaz',
            role: 'student',
            student_number: '2025001'
        };

        // Mock DB calls
        require('../../src/models').User.findOne.mockResolvedValue(null); // No existing
        require('../../src/models').Student.findOne.mockResolvedValue(null); // No check student number
        require('../../src/models').User.create.mockResolvedValue({
            id: 1, ...userData,
            toJSON: () => ({ id: 1, email: userData.email, role: 'student' })
        });
        require('../../src/models').User.create.mockResolvedValue({
            id: 1, ...userData,
            toJSON: () => ({ id: 1, email: userData.email, role: 'student' })
        });

        const res = await request(app).post('/api/v1/auth/register').send(userData);

        if (res.status !== 201) console.log('Register Error:', res.body);
        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
    });

    // Test Set 2: Login
    test('POST /login - Success with correct credentials', async () => {
        const hash = await bcrypt.hash('password123', 10);
        require('../../src/models').User.findOne.mockResolvedValue({
            id: 1,
            email: 'user@edu.tr',
            password_hash: hash,
            role: 'student',
            is_verified: true,
            update: jest.fn(),
            profile_picture_url: null,
            refresh_token: null
        });
        require('../../src/models').Student.findOne.mockResolvedValue({ id: 1 });

        const res = await request(app).post('/api/v1/auth/login').send({
            email: 'user@edu.tr', password: 'password123'
        });

        expect(res.status).toBe(200);
        expect(res.body.data.tokens.accessToken).toBeDefined();
    });
});
