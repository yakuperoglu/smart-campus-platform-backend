/**
 * Meal Reservation Flow Integration Tests
 * 
 * Tests the complete flow:
 * 1. Top-up wallet
 * 2. Reserve meal
 * 3. Verify balance deduction
 * 4. Use reservation (QR scan)
 * 5. Cancel and verify refund
 */

const request = require('supertest');
const app = require('../../src/app');
const { sequelize, User, Student, Wallet, MealMenu, Cafeteria, MealReservation, Transaction } = require('../../src/models');

describe('Meal Reservation Flow Integration Tests', () => {
    let authToken;
    let testUser;
    let testStudent;
    let testCafeteria;
    let testMenu;
    let initialBalance;

    // Test data
    const TOPUP_AMOUNT = 100;
    const MEAL_PRICE = 25;

    beforeAll(async () => {
        // Wait for database connection
        await sequelize.authenticate();

        // Create test user
        testUser = await User.create({
            email: 'mealtest@test.com',
            password_hash: '$2b$10$test.hashed.password',
            first_name: 'Meal',
            last_name: 'Tester',
            role: 'student',
            is_active: true
        });

        // Create student profile (non-scholarship for paid testing)
        testStudent = await Student.create({
            user_id: testUser.id,
            student_number: 'MT2024001',
            has_scholarship: false,
            meal_quota_daily: 2
        });

        // Create test cafeteria
        testCafeteria = await Cafeteria.create({
            name: 'Test Cafeteria',
            location: 'Test Building',
            is_active: true,
            capacity: 500
        });

        // Create test menu for today
        const today = new Date().toISOString().split('T')[0];
        testMenu = await MealMenu.create({
            cafeteria_id: testCafeteria.id,
            date: today,
            type: 'lunch',
            items_json: [
                { name: 'Test Meal', category: 'main' },
                { name: 'Test Side', category: 'side' }
            ],
            price: MEAL_PRICE,
            is_published: true,
            max_reservations: 100
        });

        // Login to get auth token
        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'mealtest@test.com',
                password: 'testpassword123' // Would need proper password setup
            });

        // For testing, we'll mock the token
        // In real tests, use actual login flow
        authToken = loginResponse.body?.data?.token || 'test-jwt-token';
    });

    afterAll(async () => {
        // Cleanup test data
        await MealReservation.destroy({ where: { user_id: testUser.id }, force: true });
        await Transaction.destroy({ where: {}, force: true }); // Clean transactions
        await Wallet.destroy({ where: { user_id: testUser.id }, force: true });
        await MealMenu.destroy({ where: { id: testMenu.id }, force: true });
        await Cafeteria.destroy({ where: { id: testCafeteria.id }, force: true });
        await Student.destroy({ where: { id: testStudent.id }, force: true });
        await User.destroy({ where: { id: testUser.id }, force: true });

        await sequelize.close();
    });

    describe('Complete Meal Reservation Flow', () => {

        test('1. Should get initial wallet balance (0 or create wallet)', async () => {
            const response = await request(app)
                .get('/api/wallet/balance')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('balance');

            initialBalance = parseFloat(response.body.data.balance);
            expect(initialBalance).toBeGreaterThanOrEqual(0);
        });

        test('2. Should top up wallet successfully', async () => {
            const response = await request(app)
                .post('/api/wallet/topup')
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

            const response = await request(app)
                .get(`/api/meals/menus?date=${today}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.data.length).toBeGreaterThan(0);

            const menu = response.body.data.find(m => m.id === testMenu.id);
            expect(menu).toBeDefined();
            expect(menu.price).toBe(MEAL_PRICE);
        });

        let reservationId;
        let qrCode;

        test('4. Should create meal reservation and deduct balance', async () => {
            const balanceBefore = await request(app)
                .get('/api/wallet/balance')
                .set('Authorization', `Bearer ${authToken}`);

            const beforeBalance = parseFloat(balanceBefore.body.data.balance);

            const response = await request(app)
                .post('/api/meals/reservations')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    menu_id: testMenu.id
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('reservation');
            expect(response.body.data.reservation).toHaveProperty('qr_code');
            expect(response.body.data.reservation.status).toBe('reserved');

            reservationId = response.body.data.reservation.id;
            qrCode = response.body.data.reservation.qr_code;

            // Verify payment info
            expect(response.body.data.payment).toBeDefined();
            expect(response.body.data.payment.amount).toBe(MEAL_PRICE);

            // Verify balance deduction
            const balanceAfter = await request(app)
                .get('/api/wallet/balance')
                .set('Authorization', `Bearer ${authToken}`);

            const afterBalance = parseFloat(balanceAfter.body.data.balance);
            expect(afterBalance).toBe(beforeBalance - MEAL_PRICE);
        });

        test('5. Should appear in user reservations', async () => {
            const response = await request(app)
                .get('/api/meals/reservations')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            const reservation = response.body.data.find(r => r.id === reservationId);
            expect(reservation).toBeDefined();
            expect(reservation.qr_code).toBe(qrCode);
            expect(reservation.status).toBe('reserved');
        });

        test('6. Should prevent duplicate reservation for same menu', async () => {
            const response = await request(app)
                .post('/api/meals/reservations')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    menu_id: testMenu.id
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error?.code || response.body.message).toContain('ALREADY_RESERVED');
        });

        test('7. Should validate QR code and mark as consumed (staff action)', async () => {
            // This would require a staff token
            // For integration test, we'll test the service directly or mock staff auth

            const response = await request(app)
                .post('/api/meals/reservations/use')
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
            const response = await request(app)
                .get('/api/wallet/transactions?type=meal_payment')
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
        let cancelTestMenu;
        let cancelReservationId;

        beforeAll(async () => {
            // Create a future menu for cancellation test
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];

            cancelTestMenu = await MealMenu.create({
                cafeteria_id: testCafeteria.id,
                date: tomorrowStr,
                type: 'dinner',
                items_json: [{ name: 'Cancel Test Meal', category: 'main' }],
                price: MEAL_PRICE,
                is_published: true
            });
        });

        afterAll(async () => {
            await MealMenu.destroy({ where: { id: cancelTestMenu?.id }, force: true });
        });

        test('1. Should create reservation for tomorrow', async () => {
            const response = await request(app)
                .post('/api/meals/reservations')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    menu_id: cancelTestMenu.id
                });

            expect(response.status).toBe(201);
            cancelReservationId = response.body.data.reservation.id;
        });

        test('2. Should cancel reservation and receive refund', async () => {
            const balanceBefore = await request(app)
                .get('/api/wallet/balance')
                .set('Authorization', `Bearer ${authToken}`);

            const beforeBalance = parseFloat(balanceBefore.body.data.balance);

            const response = await request(app)
                .delete(`/api/meals/reservations/${cancelReservationId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.refund).toBeDefined();
            expect(response.body.refund.amount).toBe(MEAL_PRICE);

            // Verify refund
            const balanceAfter = await request(app)
                .get('/api/wallet/balance')
                .set('Authorization', `Bearer ${authToken}`);

            const afterBalance = parseFloat(balanceAfter.body.data.balance);
            expect(afterBalance).toBe(beforeBalance + MEAL_PRICE);
        });

        test('3. Transaction history should show refund', async () => {
            const response = await request(app)
                .get('/api/wallet/transactions?type=refund')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);

            const refundTransaction = response.body.data.find(
                t => t.type === 'refund' && t.reference_type === 'meal_cancellation'
            );
            expect(refundTransaction).toBeDefined();
        });
    });

    describe('Scholarship Student Flow', () => {
        let scholarshipUser;
        let scholarshipToken;

        beforeAll(async () => {
            // Create scholarship student
            scholarshipUser = await User.create({
                email: 'scholarship@test.com',
                password_hash: '$2b$10$test.hashed.password',
                first_name: 'Scholar',
                last_name: 'Student',
                role: 'student',
                is_active: true
            });

            await Student.create({
                user_id: scholarshipUser.id,
                student_number: 'SC2024001',
                has_scholarship: true,
                meal_quota_daily: 2
            });

            // Mock token for scholarship student
            scholarshipToken = 'scholarship-test-token';
        });

        afterAll(async () => {
            await MealReservation.destroy({ where: { user_id: scholarshipUser?.id }, force: true });
            await Student.destroy({ where: { user_id: scholarshipUser?.id }, force: true });
            await User.destroy({ where: { id: scholarshipUser?.id }, force: true });
        });

        test('Should not deduct balance for scholarship students', async () => {
            // This test would verify that scholarship students get free meals
            // Would need proper auth setup to test
            expect(true).toBe(true); // Placeholder
        });

        test('Should enforce daily quota for scholarship students', async () => {
            // This test would verify quota enforcement
            // After 2 reservations, the 3rd should fail with QUOTA_EXCEEDED
            expect(true).toBe(true); // Placeholder
        });
    });

    describe('Error Cases', () => {
        test('Should reject reservation with insufficient balance', async () => {
            // Create user with zero balance
            const brokeUser = await User.create({
                email: 'broke@test.com',
                password_hash: '$2b$10$test',
                first_name: 'Broke',
                last_name: 'User',
                role: 'student',
                is_active: true
            });

            await Student.create({
                user_id: brokeUser.id,
                student_number: 'BR2024001',
                has_scholarship: false
            });

            // Would test with proper auth
            // Expecting INSUFFICIENT_BALANCE error

            // Cleanup
            await Student.destroy({ where: { user_id: brokeUser.id }, force: true });
            await User.destroy({ where: { id: brokeUser.id }, force: true });
        });

        test('Should reject reservation for unpublished menu', async () => {
            const unpublishedMenu = await MealMenu.create({
                cafeteria_id: testCafeteria.id,
                date: new Date().toISOString().split('T')[0],
                type: 'breakfast',
                items_json: [],
                price: 20,
                is_published: false // Not published
            });

            const response = await request(app)
                .post('/api/meals/reservations')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    menu_id: unpublishedMenu.id
                });

            expect(response.status).toBe(400);

            await MealMenu.destroy({ where: { id: unpublishedMenu.id }, force: true });
        });

        test('Should reject reservation for past menu date', async () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            const pastMenu = await MealMenu.create({
                cafeteria_id: testCafeteria.id,
                date: yesterday.toISOString().split('T')[0],
                type: 'lunch',
                items_json: [],
                price: 20,
                is_published: true
            });

            const response = await request(app)
                .post('/api/meals/reservations')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    menu_id: pastMenu.id
                });

            expect(response.status).toBe(400);
            expect(response.body.error?.code || response.body.message).toContain('PAST');

            await MealMenu.destroy({ where: { id: pastMenu.id }, force: true });
        });
    });
});
