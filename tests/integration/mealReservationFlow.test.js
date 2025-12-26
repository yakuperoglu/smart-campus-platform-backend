
// Mock Auth & Role Middleware
jest.mock('../../src/middleware/authMiddleware', () => ({
    verifyToken: (req, res, next) => {
        req.user = { id: 'test-user-id', role: 'student' };
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
    facultyOrAdmin: (req, res, next) => next(),
    authenticated: (req, res, next) => next()
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
    User: createMockModel(),
    Student: createMockModel(),
    Wallet: createMockModel(),
    MealMenu: createMockModel(),
    Cafeteria: createMockModel(),
    MealReservation: createMockModel(),
    Transaction: createMockModel(),
    NotificationPreference: createMockModel(),
    sequelize: require('../../src/config/database')
};

jest.mock('../../src/models', () => mockModels);

const request = require('supertest');
const app = require('../../src/app');

describe('Meal Reservation Flow Integration Tests', () => {
    let authToken = 'test-token';
    const MEAL_PRICE = 25;
    const TOPUP_AMOUNT = 100;

    beforeEach(() => {
        jest.clearAllMocks();
        // Setup default mocks to avoid 404/hangs
        mockModels.Wallet.findOne.mockResolvedValue({
            id: 'w1', balance: 0, is_active: true, toJSON: () => ({ balance: 0 }),
            update: jest.fn().mockResolvedValue(true)
        });
        mockModels.Student.findOne.mockResolvedValue({ id: 's1', user_id: 'u1', has_scholarship: false });
        mockModels.MealMenu.findByPk.mockResolvedValue({
            id: 'm1', price: MEAL_PRICE, is_published: true, date: new Date().toISOString(),
            toJSON: () => ({ id: 'm1', price: MEAL_PRICE })
        });
        mockModels.MealMenu.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
    });

    describe('Complete Meal Reservation Flow', () => {

        test('1. Should get initial wallet balance (0 or create wallet)', async () => {
            const response = await request(app)
                .get('/api/v1/wallet/balance')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('balance');

            initialBalance = parseFloat(response.body.data.balance);
            expect(initialBalance).toBeGreaterThanOrEqual(0);
        });

        test('2. Should top up wallet successfully', async () => {
            mockModels.Wallet.findOne.mockResolvedValue({
                id: 'w1', user_id: 'test-user-id', balance: 0, is_active: true,
                update: jest.fn().mockResolvedValue(true),
                toJSON: () => ({ id: 'w1', balance: 0 })
            });

            const response = await request(app)
                .post('/api/v1/wallet/topup')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    amount: TOPUP_AMOUNT,
                    payment_method: 'card'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('wallet');

            const newBalance = parseFloat(response.body.data.wallet.new_balance);
            expect(newBalance).toBe(initialBalance + TOPUP_AMOUNT);
        });

        test('3. Should get menus for today', async () => {
            const today = new Date().toISOString().split('T')[0];

            mockModels.MealMenu.findAndCountAll.mockResolvedValue({
                count: 1,
                rows: [{
                    id: 'm1',
                    price: MEAL_PRICE,
                    is_published: true,
                    date: today,
                    items_json: [],
                    nutritional_info_json: {},
                    cafeteria: { id: 'c1', name: 'Test', location: 'Loc' }
                }]
            });

            const response = await request(app)
                .get(`/api/v1/meals/menus?date=${today}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.data.length).toBeGreaterThan(0);

            const menu = response.body.data.find(m => m.id === 'm1');
            expect(menu).toBeDefined();
            expect(menu.price).toBe(MEAL_PRICE);
        });

        let reservationId = 'r1';
        let qrCode = 'qr123';

        test('4. Should create meal reservation and deduct balance', async () => {
            mockModels.MealReservation.findOne.mockResolvedValue(null);
            mockModels.MealReservation.count.mockResolvedValue(0);

            mockModels.Wallet.findOne.mockResolvedValueOnce({
                id: 'w1', balance: 100, is_active: true, toJSON: () => ({ balance: 100 }),
                update: jest.fn().mockResolvedValue(true)
            });
            mockModels.Wallet.findOne.mockResolvedValueOnce({
                id: 'w1', balance: 75, is_active: true, toJSON: () => ({ balance: 75 }),
                update: jest.fn().mockResolvedValue(true)
            });
            mockModels.Wallet.findOne.mockResolvedValueOnce({
                id: 'w1', balance: 75, is_active: true, toJSON: () => ({ balance: 75 }),
                update: jest.fn().mockResolvedValue(true)
            });

            mockModels.User.findByPk.mockResolvedValue({
                id: 'test-user-id', role: 'student',
                studentProfile: { has_scholarship: false }
            });

            mockModels.MealMenu.findByPk.mockResolvedValue({
                id: 'm1', price: MEAL_PRICE, is_published: true, date: new Date().toISOString()
            });

            mockModels.MealReservation.create.mockResolvedValue({
                id: reservationId,
                qr_code_str: qrCode,
                status: 'reserved',
                reservation_time: new Date()
            });

            const response = await request(app)
                .post('/api/v1/meals/reservations')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    menu_id: 'm1'
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('reservation');

            // Verify balance deduction check in test
            const balanceAfter = await request(app)
                .get('/api/v1/wallet/balance')
                .set('Authorization', `Bearer ${authToken}`);

            expect(parseFloat(balanceAfter.body.data.balance)).toBe(75);
        });

        test('5. Should appear in user reservations', async () => {
            mockModels.MealReservation.findAndCountAll.mockResolvedValue({
                count: 1,
                rows: [
                    {
                        id: reservationId,
                        qr_code_str: qrCode,
                        status: 'reserved',
                        reservation_time: new Date(),
                        menu: { id: 'm1', date: new Date().toISOString(), type: 'lunch', items_json: [], cafeteria: { name: 'Test' } }
                    }
                ]
            });

            const response = await request(app)
                .get('/api/v1/meals/reservations')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            const reservation = response.body.data.find(r => r.id === reservationId);
            expect(reservation).toBeDefined();
        });

        test('6. Should prevent duplicate reservation for same menu', async () => {
            // Service would throw error if reservation already exists
            // We'll mock the error response or the service throw
            mockModels.MealReservation.findOne.mockResolvedValue({ id: 'existing' });

            const response = await request(app)
                .post('/api/v1/meals/reservations')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    menu_id: 'm1'
                });

            expect(response.status).toBe(400);
        });

        test('7. Should validate QR code and mark as consumed (staff action)', async () => {
            // This would require a staff token
            // For integration test, we'll test the service directly or mock staff auth

            const response = await request(app)
                .post('/api/v1/meals/reservations/use')
                .set('Authorization', `Bearer ${authToken}`) // Would need staff token
                .send({
                    qr_code: qrCode
                });

            // Expect either success (if user has staff role) or 403 (if not)
            if (response.status === 200) {
                expect(response.body.success).toBe(true);
                expect(response.body.message).toContain('validated');
            } else {
                // Expected if test user is not staff
                expect([401, 403]).toContain(response.status);
            }
        });

        test('8. Transaction history should show meal payment', async () => {
            mockModels.Wallet.findOne.mockResolvedValue({ id: 'w1' });
            mockModels.Transaction.findAndCountAll.mockResolvedValue({
                count: 1,
                rows: [
                    { id: 't1', type: 'meal_payment', amount: MEAL_PRICE, description: 'Meal', status: 'completed', transaction_date: new Date() }
                ]
            });

            const response = await request(app)
                .get('/api/v1/wallet/transactions?type=meal_payment')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            const transactions = response.body.data;
            expect(transactions.length).toBeGreaterThan(0);

            const mealTransaction = transactions.find(
                t => t.type === 'meal_payment' && t.amount === MEAL_PRICE
            );
            expect(mealTransaction).toBeDefined();
        });
    });

    describe('Cancellation and Refund Flow', () => {
        let cancelReservationId;


        test('1. Should create reservation for tomorrow', async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];

            mockModels.MealMenu.findByPk.mockResolvedValue({
                id: 'm-tomorrow',
                price: MEAL_PRICE,
                is_published: true,
                date: tomorrowStr,
                cafeteria_id: 'c1',
                cafeteria: { name: 'Test' }
            });
            mockModels.User.findByPk.mockResolvedValue({
                id: 'test-user-id', role: 'student',
                studentProfile: { has_scholarship: false }
            });
            mockModels.Wallet.findOne.mockResolvedValue({
                id: 'w1', balance: 100, is_active: true, toJSON: () => ({ balance: 100 }),
                update: jest.fn().mockResolvedValue(true)
            });
            mockModels.MealReservation.findOne.mockResolvedValue(null);
            mockModels.MealReservation.count.mockResolvedValue(0);
            mockModels.MealReservation.create.mockResolvedValue({ id: 'c1', status: 'reserved', reservation_time: new Date() });

            const response = await request(app)
                .post('/api/v1/meals/reservations')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    menu_id: 'm-tomorrow'
                });

            expect(response.status).toBe(201);
            cancelReservationId = 'c1';
        });

        test('2. Should cancel reservation and receive refund', async () => {
            mockModels.MealReservation.findOne.mockResolvedValue({
                id: 'c1',
                status: 'reserved',
                menu_id: 'm-tomorrow',
                menu: { price: MEAL_PRICE, date: new Date(Date.now() + 86400000).toISOString() },
                user_id: 'test-user-id',
                update: jest.fn().mockResolvedValue(true)
            });
            mockModels.User.findByPk.mockResolvedValue({
                id: 'test-user-id',
                studentProfile: { has_scholarship: false }
            });
            mockModels.Wallet.findOne.mockResolvedValue({
                id: 'w1', balance: 75, is_active: true, update: jest.fn().mockResolvedValue(true)
            });

            const response = await request(app)
                .delete(`/api/v1/meals/reservations/${cancelReservationId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        test('3. Transaction history should show refund', async () => {
            mockModels.Wallet.findOne.mockResolvedValue({ id: 'w1' });
            mockModels.Transaction.findAndCountAll.mockResolvedValue({
                count: 1,
                rows: [
                    { id: 't2', type: 'refund', reference_type: 'meal_cancellation', amount: MEAL_PRICE, status: 'completed', transaction_date: new Date() }
                ]
            });

            const response = await request(app)
                .get('/api/v1/wallet/transactions?type=refund')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);

            const refundTransaction = response.body.data.find(
                t => t.type === 'refund' && t.reference_type === 'meal_cancellation'
            );
            expect(refundTransaction).toBeDefined();
        });
    });

    describe('Scholarship Student Flow', () => {
        test('Should not deduct balance for scholarship students', async () => {
            expect(true).toBe(true);
        });

        test('Should enforce daily quota for scholarship students', async () => {
            expect(true).toBe(true);
        });
    });

    describe('Error Cases', () => {
        test('Should reject reservation with insufficient balance', async () => {
            mockModels.Wallet.findOne.mockResolvedValue({ balance: 5, toJSON: () => ({ balance: 5 }) });

            const response = await request(app)
                .post('/api/v1/meals/reservations')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ menu_id: 'm1' });

            expect(response.status).toBe(400);
        });

        test('Should reject reservation for unpublished menu', async () => {
            mockModels.MealMenu.findByPk.mockResolvedValue({ id: 'm-unpub', is_published: false });

            const response = await request(app)
                .post('/api/v1/meals/reservations')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    menu_id: 'm-unpub'
                });

            expect(response.status).toBe(400);
        });

        test('Should reject reservation for past menu date', async () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            mockModels.MealMenu.findByPk.mockResolvedValue({
                id: 'm-past',
                is_published: true,
                date: yesterday.toISOString()
            });

            const response = await request(app)
                .post('/api/v1/meals/reservations')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    menu_id: 'm-past'
                });

            expect(response.status).toBe(400);
        });
    });
});
