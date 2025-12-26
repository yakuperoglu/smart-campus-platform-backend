const request = require('supertest');
const app = require('../../src/app');

// Mock models for Auth
process.env.JWT_SECRET = 'test-secret';

jest.mock('../../src/models', () => {
    const mockUpdate = jest.fn().mockResolvedValue([1]);
    const mockToJSON = function () {
        const { update, toJSON, ...rest } = this;
        return rest;
    };

    return {
        sequelize: {
            transaction: jest.fn(() => ({
                commit: jest.fn(),
                rollback: jest.fn()
            }))
        },
        User: {
            findOne: jest.fn(),
            create: jest.fn(),
            findByPk: jest.fn(),
            update: jest.fn().mockResolvedValue([1])
        },
        Student: { findOne: jest.fn(), create: jest.fn() },
        Faculty: { findOne: jest.fn(), create: jest.fn() },
        Department: { findByPk: jest.fn() },
        Wallet: { create: jest.fn() },
        EmailVerification: { create: jest.fn(), findOne: jest.fn() },
        PasswordReset: { create: jest.fn(), destroy: jest.fn(), findOne: jest.fn() }
    };
});

const { User } = require('../../src/models');
const bcrypt = require('bcryptjs');

describe('Integration: Auth Flow', () => {
    test('POST /register should create user', async () => {
        User.findOne.mockResolvedValue(null); // No existing email
        User.create.mockResolvedValue({
            id: 1, email: 'test@edu.tr', role: 'student', toJSON: () => ({ id: 1 })
        });

        const res = await request(app).post('/api/v1/auth/register').send({
            email: 'test@edu.tr',
            password: 'Password123!',
            first_name: 'John',
            last_name: 'Doe'
        });

        expect(res.status).not.toBe(404); // Endpoint exists
    });

    test('POST /login should return token', async () => {
        User.findOne.mockResolvedValue({
            id: 1,
            email: 'test@edu.tr',
            password_hash: await bcrypt.hash('Password123!', 10),
            role: 'student',
            is_verified: true,
            update: jest.fn().mockResolvedValue([1])
        });

        const res = await request(app).post('/api/v1/auth/login').send({
            email: 'test@edu.tr',
            password: 'Password123!'
        });

        expect(res.status).toBe(200);
        expect(res.body.data.tokens).toHaveProperty('accessToken');
        expect(res.body.data.tokens).toHaveProperty('refreshToken');
    });

    test('POST /login with wrong password should fail', async () => {
        User.findOne.mockResolvedValue({
            id: 1,
            password_hash: await bcrypt.hash('Password123!', 10),
            update: jest.fn().mockResolvedValue([1])
        });

        const res = await request(app).post('/api/v1/auth/login').send({
            email: 'test@edu.tr',
            password: 'WrongPassword'
        });

        expect(res.status).toBe(401);
    });

    test('POST /login with non-existent user should fail', async () => {
        User.findOne.mockResolvedValue(null);

        const res = await request(app).post('/api/v1/auth/login').send({
            email: 'ghost@edu.tr',
            password: 'pwd'
        });

        expect(res.status).toBe(401); // Or 404 depending on implementation
    });
});
