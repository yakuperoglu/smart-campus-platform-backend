const request = require('supertest');
const app = require('../../src/app');
const { User, Student, Faculty, EmailVerification, sequelize } = require('../../src/models');
const bcrypt = require('bcryptjs');

// Mock specific model methods using pure Jest mocks
jest.mock('../../src/models', () => {
    const mockModel = () => ({
        belongsTo: jest.fn(),
        hasOne: jest.fn(),
        hasMany: jest.fn(),
        belongsToMany: jest.fn(),
        create: jest.fn(),
        findOne: jest.fn(),
        destroy: jest.fn(),
        update: jest.fn(),
        findByPk: jest.fn()
    });

    const UserMock = mockModel();
    const StudentMock = mockModel();
    const EmailVerificationMock = mockModel();

    return {
        sequelize: {
            transaction: jest.fn(() => ({
                commit: jest.fn(),
                rollback: jest.fn()
            })),
            close: jest.fn(),
            authenticate: jest.fn()
        },
        User: UserMock,
        Student: StudentMock,
        Faculty: mockModel(),
        Admin: mockModel(),
        Department: mockModel(),
        EmailVerification: EmailVerificationMock,
        PasswordReset: mockModel(),
        Wallet: mockModel()
    };
});

// Mock Email Service
jest.mock('../../src/utils/emailService', () => ({
    sendVerificationEmail: jest.fn().mockResolvedValue(true)
}));

describe('Auth Integration Tests', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/v1/auth/register', () => {

        it('should register a new student successfully', async () => {
            // Mock User.findOne to return null (user doesn't exist)
            require('../../src/models').User.findOne = jest.fn().mockResolvedValue(null);
            // Mock User.create
            const mockUser = {
                id: 'new-user-id',
                email: 'newstudent@example.com',
                role: 'student',
                is_verified: false
            };
            require('../../src/models').User.create = jest.fn().mockResolvedValue(mockUser);
            require('../../src/models').Student.create = jest.fn().mockResolvedValue({});
            require('../../src/models').EmailVerification.create = jest.fn().mockResolvedValue({});

            const res = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: 'newstudent@example.com',
                    password: 'Password123!',
                    role: 'student',
                    student_number: '2024100'
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toContain('Registration successful');
        });

        it('should return 400 if email already exists', async () => {
            // Mock User.findOne to return existing user
            require('../../src/models').User.findOne = jest.fn().mockResolvedValue({ id: 'existing-id' });

            const res = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: 'existing@example.com',
                    password: 'Password123!',
                    role: 'student',
                    student_number: '2024101'
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.error.code).toBe('USER_EXISTS');
        });
    });
});
