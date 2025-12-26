const request = require('supertest');

// Mocks should be before app import

// Mock Auth & Role Middleware
jest.mock('../../src/middleware/authMiddleware', () => ({
    verifyToken: (req, res, next) => {
        req.user = { id: 1, role: 'student' };
        next();
    },
    isAdmin: (req, res, next) => next(),
    optionalAuth: (req, res, next) => next(),
    loadUserProfile: (req, res, next) => next()
}));

jest.mock('../../src/middleware/roleMiddleware', () => ({
    studentOnly: (req, res, next) => next(),
    teacherOnly: (req, res, next) => next(),
    adminOnly: (req, res, next) => next(),
    authorize: () => (req, res, next) => next(),
    facultyOrAdmin: (req, res, next) => next()
}));

// Mock Database
const mockTransaction = {
    commit: jest.fn().mockResolvedValue(),
    rollback: jest.fn().mockResolvedValue(),
    LOCK: { UPDATE: 'UPDATE' }
};

jest.mock('../../src/config/database', () => ({
    authenticate: jest.fn().mockResolvedValue(),
    sync: jest.fn().mockResolvedValue(),
    close: jest.fn().mockResolvedValue(),
    transaction: jest.fn().mockResolvedValue(mockTransaction),
    literal: jest.fn(),
    col: jest.fn(),
    QueryTypes: { SELECT: 'SELECT' },
    Transaction: {
        ISOLATION_LEVELS: { SERIALIZABLE: 'SERIALIZABLE' }
    },
    define: jest.fn(() => ({
        belongsTo: jest.fn(),
        hasMany: jest.fn(),
        belongsToMany: jest.fn(),
        sync: jest.fn()
    }))
}));

// Helper to create unique model mocks
const createMockModel = () => {
    const model = {
        findOne: jest.fn(),
        findByPk: jest.fn(),
        findAll: jest.fn().mockResolvedValue([]),
        findAndCountAll: jest.fn().mockResolvedValue({ count: 0, rows: [] }),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue([1]),
        destroy: jest.fn().mockResolvedValue(1),
        count: jest.fn().mockResolvedValue(0),
        sequelize: require('../../src/config/database')
    };

    const createMockInstance = (data = {}) => ({
        ...data,
        update: jest.fn().mockResolvedValue(true),
        toJSON: jest.fn().mockReturnValue(data),
        destroy: jest.fn().mockResolvedValue(true),
        save: jest.fn().mockResolvedValue(true)
    });

    model.findOne.mockResolvedValue(null);
    model.findByPk.mockResolvedValue(null);
    model.create.mockImplementation(async (data) => createMockInstance(data));

    return model;
};

const mockModels = {
    Student: createMockModel(),
    Faculty: createMockModel(),
    User: createMockModel(),
    Admin: createMockModel(),
    Department: createMockModel(),
    Course: createMockModel(),
    CourseSection: createMockModel(),
    Enrollment: createMockModel(),
    CoursePrerequisite: createMockModel(),
    Classroom: createMockModel(),
    NotificationPreference: createMockModel(),
    sequelize: require('../../src/config/database')
};

jest.mock('../../src/models', () => mockModels);

const app = require('../../src/app');
jest.setTimeout(30000);

describe('Integration: Course Enrollment Flow', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        // Set default resolves to prevent hangs
        mockModels.Student.findOne.mockResolvedValue({ id: 1, user_id: 1, toJSON: () => ({ id: 1, user_id: 1 }) });
        mockModels.Student.findByPk.mockResolvedValue({ id: 1, user_id: 1 });
        mockModels.CourseSection.findByPk.mockResolvedValue({
            id: 'section-1',
            capacity: 50,
            course: { id: 'course-1', code: 'CS101', name: 'Intro', prerequisites: [] },
            toJSON: () => ({ id: 'section-1', capacity: 50 })
        });
        mockModels.Enrollment.count.mockResolvedValue(0);
        mockModels.CoursePrerequisite.findAll.mockResolvedValue([]);
        mockModels.Enrollment.findOne.mockResolvedValue(null);
    });

    test('POST /enrollments - Fail if section full', async () => {
        // Mock Section Full
        require('../../src/models').CourseSection.findByPk.mockResolvedValue({
            id: '550e8400-e29b-41d4-a716-446655440000', capacity: 50,
            course: { prerequisites: [] }
        });
        require('../../src/models').Enrollment.count.mockResolvedValue(50); // Full
        require('../../src/models').Student.findOne.mockResolvedValue({ id: 1 });
        require('../../src/models').Student.findByPk.mockResolvedValue({ id: 1 });

        // Prerequisites
        require('../../src/models').CoursePrerequisite.findAll.mockResolvedValue([]);
        require('../../src/models').Enrollment.findOne.mockResolvedValue(null);

        const res = await request(app)
            .post('/api/v1/enrollments')
            .send({ section_id: '550e8400-e29b-41d4-a716-446655440000' });

        // Depending on controller implementation: 400 for business logic
        // If it throws AppError('Section is full', 400), it should be 400
        expect(res.status).toBe(400);
    });

    test('POST /enrollments - Success', async () => {
        // Enrolled 40, Capacity 50 -> OK
        require('../../src/models').CourseSection.findByPk.mockResolvedValue({
            id: '660e8400-e29b-41d4-a716-446655440000', capacity: 50,
            course: { prerequisites: [] }
        });
        require('../../src/models').Enrollment.count.mockResolvedValue(40);
        require('../../src/models').Student.findOne.mockResolvedValue({ id: 1 });
        require('../../src/models').Student.findByPk.mockResolvedValue({ id: 1 });
        require('../../src/models').Enrollment.create.mockResolvedValue({ id: 999, status: 'enrolled' });

        // Prerequisites
        require('../../src/models').CoursePrerequisite.findAll.mockResolvedValue([]);
        require('../../src/models').Enrollment.findOne.mockResolvedValue(null);

        const res = await request(app)
            .post('/api/v1/enrollments')
            .send({ section_id: '660e8400-e29b-41d4-a716-446655440000' });

        if (res.status !== 201) console.log('Enrollment Error:', res.body);
        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
    });
});
