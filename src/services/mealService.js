/**
 * Meal Service
 * 
 * Handles meal reservations, menu management, and QR code validation.
 * Supports scholarship (free) and paid meal models.
 */

const { sequelize, MealReservation, MealMenu, Cafeteria, Student, User, Wallet } = require('../models');
const WalletService = require('./walletService');
const { AppError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');
const crypto = require('crypto');
const Sequelize = require('sequelize');

class MealService {
    /**
     * Generate a unique QR code string
     * @returns {string}
     */
    static generateQRCode() {
        const timestamp = Date.now().toString(36);
        const random = crypto.randomBytes(8).toString('hex');
        return `MEAL-${timestamp}-${random}`.toUpperCase();
    }

    /**
     * Create a meal reservation
     * Handles both scholarship (free) and paid users
     * 
     * @param {string} userId - User ID
     * @param {string} menuId - Menu ID to reserve
     * @returns {Promise<object>} Reservation details
     */
    static async createReservation(userId, menuId) {
        const t = await sequelize.transaction({
            isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE
        });

        try {
            // Get the menu with cafeteria
            const menu = await MealMenu.findByPk(menuId, {
                include: [{ model: Cafeteria, as: 'cafeteria' }],
                transaction: t
            });

            if (!menu) {
                throw new AppError('Menu not found', 404, 'MENU_NOT_FOUND');
            }

            if (!menu.is_published) {
                throw new AppError('Menu is not available for reservation', 400, 'MENU_NOT_PUBLISHED');
            }

            // Check if menu date is in the future or today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const menuDate = new Date(menu.date);
            menuDate.setHours(0, 0, 0, 0);

            if (menuDate < today) {
                throw new AppError('Cannot reserve past meals', 400, 'PAST_MENU');
            }

            // Check if user already has a reservation for this menu
            const existingReservation = await MealReservation.findOne({
                where: {
                    user_id: userId,
                    menu_id: menuId,
                    status: { [Op.notIn]: ['cancelled'] }
                },
                transaction: t
            });

            if (existingReservation) {
                throw new AppError('You already have a reservation for this meal', 400, 'ALREADY_RESERVED');
            }

            // Check max reservations for this menu
            if (menu.max_reservations) {
                const reservationCount = await MealReservation.count({
                    where: {
                        menu_id: menuId,
                        status: { [Op.notIn]: ['cancelled', 'no_show'] }
                    },
                    transaction: t
                });

                if (reservationCount >= menu.max_reservations) {
                    throw new AppError('This meal is fully booked', 400, 'FULLY_BOOKED');
                }
            }

            // Get user with student profile
            const user = await User.findByPk(userId, {
                include: [{ model: Student, as: 'studentProfile' }],
                transaction: t
            });

            if (!user) {
                throw new AppError('User not found', 404, 'USER_NOT_FOUND');
            }

            const isStudent = user.role === 'student' && user.studentProfile;
            const hasScholarship = isStudent && user.studentProfile.has_scholarship;
            const menuPrice = parseFloat(menu.price) || 0;

            let transactionResult = null;

            if (hasScholarship) {
                // Check daily quota for scholarship students
                const dailyQuota = user.studentProfile.meal_quota_daily || 2;
                const todayReservations = await this._getTodayReservationCount(userId, menu.date, t);

                if (todayReservations >= dailyQuota) {
                    throw new AppError(
                        `Daily meal quota exceeded. Maximum ${dailyQuota} free meals per day.`,
                        400,
                        'QUOTA_EXCEEDED'
                    );
                }
            } else if (menuPrice > 0) {
                // Paid user - check balance and deduct
                const hasSufficientBalance = await WalletService.hasSufficientBalance(userId, menuPrice);

                if (!hasSufficientBalance) {
                    throw new AppError(
                        `Insufficient wallet balance. Required: ${menuPrice.toFixed(2)} TRY`,
                        400,
                        'INSUFFICIENT_BALANCE'
                    );
                }

                // Deduct from wallet
                transactionResult = await WalletService.createTransaction({
                    userId,
                    type: 'meal_payment',
                    amount: menuPrice,
                    description: `Meal reservation: ${menu.type} on ${menu.date}`,
                    referenceType: 'meal_reservation',
                    transaction: t
                });
            }

            // Generate QR code
            const qrCode = this.generateQRCode();

            // Create reservation
            const reservation = await MealReservation.create({
                user_id: userId,
                menu_id: menuId,
                cafeteria_id: menu.cafeteria_id,
                status: 'reserved',
                qr_code_str: qrCode,
                reservation_time: new Date()
            }, { transaction: t });

            // Update reference_id in transaction if payment was made
            if (transactionResult) {
                await transactionResult.transaction.update({
                    reference_id: reservation.id
                }, { transaction: t });
            }

            await t.commit();

            return {
                reservation: {
                    id: reservation.id,
                    qr_code: qrCode,
                    status: reservation.status,
                    reservation_time: reservation.reservation_time
                },
                menu: {
                    id: menu.id,
                    date: menu.date,
                    type: menu.type,
                    cafeteria: menu.cafeteria?.name
                },
                payment: transactionResult ? {
                    amount: menuPrice,
                    transaction_id: transactionResult.transaction.id,
                    new_balance: transactionResult.wallet.new_balance
                } : {
                    amount: 0,
                    type: 'scholarship'
                }
            };
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    /**
     * Use a meal reservation (scan QR code)
     * 
     * @param {string} qrCode - QR code string
     * @param {string} [staffId] - Staff who scanned (optional)
     * @returns {Promise<object>} Validation result
     */
    static async useReservation(qrCode, staffId = null) {
        const t = await sequelize.transaction();

        try {
            // Find reservation by QR code
            const reservation = await MealReservation.findOne({
                where: { qr_code_str: qrCode },
                include: [
                    { model: MealMenu, as: 'menu', include: [{ model: Cafeteria, as: 'cafeteria' }] },
                    { model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'email'] }
                ],
                lock: t.LOCK.UPDATE,
                transaction: t
            });

            if (!reservation) {
                throw new AppError('Invalid QR code', 404, 'INVALID_QR');
            }

            // Check if already used
            if (reservation.status === 'consumed') {
                throw new AppError('This meal has already been consumed', 400, 'ALREADY_USED');
            }

            // Check if cancelled
            if (reservation.status === 'cancelled') {
                throw new AppError('This reservation has been cancelled', 400, 'CANCELLED');
            }

            // Check if correct date
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const menuDate = new Date(reservation.menu.date);
            menuDate.setHours(0, 0, 0, 0);

            if (menuDate.getTime() !== today.getTime()) {
                if (menuDate < today) {
                    throw new AppError('This reservation has expired', 400, 'EXPIRED');
                } else {
                    throw new AppError(
                        `This reservation is for ${reservation.menu.date}. Cannot use before that date.`,
                        400,
                        'FUTURE_RESERVATION'
                    );
                }
            }

            // Mark as consumed
            await reservation.update({
                status: 'consumed',
                consumed_at: new Date()
            }, { transaction: t });

            await t.commit();

            return {
                success: true,
                message: 'Meal validated successfully',
                reservation: {
                    id: reservation.id,
                    consumed_at: reservation.consumed_at
                },
                user: {
                    name: `${reservation.user.first_name} ${reservation.user.last_name}`,
                    email: reservation.user.email
                },
                meal: {
                    type: reservation.menu.type,
                    date: reservation.menu.date,
                    cafeteria: reservation.menu.cafeteria?.name
                }
            };
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    /**
     * Cancel a reservation
     * @param {string} userId - User ID
     * @param {string} reservationId - Reservation ID
     * @returns {Promise<object>}
     */
    static async cancelReservation(userId, reservationId) {
        const t = await sequelize.transaction();

        try {
            const reservation = await MealReservation.findOne({
                where: { id: reservationId, user_id: userId },
                include: [{ model: MealMenu, as: 'menu' }],
                lock: t.LOCK.UPDATE,
                transaction: t
            });

            if (!reservation) {
                throw new AppError('Reservation not found', 404, 'NOT_FOUND');
            }

            if (reservation.status === 'consumed') {
                throw new AppError('Cannot cancel a consumed meal', 400, 'ALREADY_CONSUMED');
            }

            if (reservation.status === 'cancelled') {
                throw new AppError('Reservation is already cancelled', 400, 'ALREADY_CANCELLED');
            }

            // Check if cancellation is allowed (e.g., before meal time)
            const menuDate = new Date(reservation.menu.date);
            const now = new Date();

            // Allow cancellation up to the meal date
            if (now > menuDate) {
                throw new AppError('Cannot cancel past reservations', 400, 'PAST_RESERVATION');
            }

            // Process refund if it was a paid reservation
            const menuPrice = parseFloat(reservation.menu.price) || 0;
            let refundResult = null;

            if (menuPrice > 0) {
                // Check if there was a payment
                const user = await User.findByPk(userId, {
                    include: [{ model: Student, as: 'studentProfile' }],
                    transaction: t
                });

                const hasScholarship = user?.studentProfile?.has_scholarship;

                if (!hasScholarship) {
                    // Refund to wallet
                    refundResult = await WalletService.createTransaction({
                        userId,
                        type: 'refund',
                        amount: menuPrice,
                        description: `Refund for cancelled meal: ${reservation.menu.type} on ${reservation.menu.date}`,
                        referenceId: reservationId,
                        referenceType: 'meal_cancellation',
                        transaction: t
                    });
                }
            }

            // Update reservation status
            await reservation.update({ status: 'cancelled' }, { transaction: t });

            await t.commit();

            return {
                success: true,
                message: 'Reservation cancelled successfully',
                refund: refundResult ? {
                    amount: menuPrice,
                    new_balance: refundResult.wallet.new_balance
                } : null
            };
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    /**
     * Get user's reservations
     * @param {string} userId - User ID
     * @param {object} options - Query options
     * @returns {Promise<object>}
     */
    static async getUserReservations(userId, options = {}) {
        const { page = 1, limit = 20, status, startDate, endDate } = options;

        const where = { user_id: userId };

        if (status) {
            where.status = status;
        }

        if (startDate || endDate) {
            where.reservation_time = {};
            if (startDate) where.reservation_time[Op.gte] = new Date(startDate);
            if (endDate) where.reservation_time[Op.lte] = new Date(endDate);
        }

        const { count, rows } = await MealReservation.findAndCountAll({
            where,
            include: [
                { model: MealMenu, as: 'menu', include: [{ model: Cafeteria, as: 'cafeteria' }] }
            ],
            order: [['reservation_time', 'DESC']],
            limit,
            offset: (page - 1) * limit
        });

        return {
            reservations: rows.map(r => ({
                id: r.id,
                status: r.status,
                qr_code: r.qr_code_str,
                reservation_time: r.reservation_time,
                consumed_at: r.consumed_at,
                menu: {
                    id: r.menu.id,
                    date: r.menu.date,
                    type: r.menu.type,
                    items: r.menu.items_json,
                    cafeteria: r.menu.cafeteria?.name
                }
            })),
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil(count / limit)
            }
        };
    }

    // ==================== Menu CRUD Operations ====================

    /**
     * Create a new menu (Admin/Staff only)
     * @param {object} menuData - Menu data
     * @returns {Promise<MealMenu>}
     */
    static async createMenu(menuData) {
        const { cafeteria_id, date, type, items_json, nutritional_info_json, price, is_published, max_reservations } = menuData;

        // Validate cafeteria exists
        const cafeteria = await Cafeteria.findByPk(cafeteria_id);
        if (!cafeteria) {
            throw new AppError('Cafeteria not found', 404, 'CAFETERIA_NOT_FOUND');
        }

        // Check for duplicate menu
        const existingMenu = await MealMenu.findOne({
            where: { cafeteria_id, date, type }
        });

        if (existingMenu) {
            throw new AppError('A menu already exists for this cafeteria, date, and meal type', 400, 'DUPLICATE_MENU');
        }

        const menu = await MealMenu.create({
            cafeteria_id,
            date,
            type,
            items_json: items_json || [],
            nutritional_info_json: nutritional_info_json || {},
            price: price || 0,
            is_published: is_published || false,
            max_reservations
        });

        return menu;
    }

    /**
     * Update a menu (Admin/Staff only)
     * @param {string} menuId - Menu ID
     * @param {object} updateData - Update data
     * @returns {Promise<MealMenu>}
     */
    static async updateMenu(menuId, updateData) {
        const menu = await MealMenu.findByPk(menuId);

        if (!menu) {
            throw new AppError('Menu not found', 404, 'MENU_NOT_FOUND');
        }

        // Don't allow changing cafeteria, date, or type if there are reservations
        const hasReservations = await MealReservation.count({
            where: { menu_id: menuId, status: { [Op.notIn]: ['cancelled'] } }
        });

        if (hasReservations > 0 && (updateData.cafeteria_id || updateData.date || updateData.type)) {
            throw new AppError('Cannot change cafeteria, date, or type for menu with existing reservations', 400, 'HAS_RESERVATIONS');
        }

        await menu.update(updateData);
        return menu;
    }

    /**
     * Delete a menu (Admin/Staff only)
     * @param {string} menuId - Menu ID
     * @returns {Promise<void>}
     */
    static async deleteMenu(menuId) {
        const menu = await MealMenu.findByPk(menuId);

        if (!menu) {
            throw new AppError('Menu not found', 404, 'MENU_NOT_FOUND');
        }

        // Check for active reservations
        const hasReservations = await MealReservation.count({
            where: { menu_id: menuId, status: { [Op.notIn]: ['cancelled'] } }
        });

        if (hasReservations > 0) {
            throw new AppError('Cannot delete menu with existing reservations', 400, 'HAS_RESERVATIONS');
        }

        await menu.destroy();
    }

    /**
     * Get menus (public)
     * @param {object} options - Query options
     * @returns {Promise<object>}
     */
    static async getMenus(options = {}) {
        const { cafeteriaId, date, startDate, endDate, type, publishedOnly = true, page = 1, limit = 20 } = options;

        const where = {};

        if (cafeteriaId) where.cafeteria_id = cafeteriaId;
        if (type) where.type = type;
        if (publishedOnly) where.is_published = true;

        if (date) {
            where.date = date;
        } else if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date[Op.gte] = startDate;
            if (endDate) where.date[Op.lte] = endDate;
        }

        const { count, rows } = await MealMenu.findAndCountAll({
            where,
            include: [{ model: Cafeteria, as: 'cafeteria' }],
            order: [['date', 'ASC'], ['type', 'ASC']],
            limit,
            offset: (page - 1) * limit
        });

        return {
            menus: rows.map(m => ({
                id: m.id,
                date: m.date,
                type: m.type,
                items: m.items_json,
                nutritional_info: m.nutritional_info_json,
                price: parseFloat(m.price),
                is_published: m.is_published,
                max_reservations: m.max_reservations,
                cafeteria: {
                    id: m.cafeteria?.id,
                    name: m.cafeteria?.name,
                    location: m.cafeteria?.location
                }
            })),
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil(count / limit)
            }
        };
    }

    /**
     * Get single menu by ID
     * @param {string} menuId - Menu ID
     * @returns {Promise<object>}
     */
    static async getMenuById(menuId) {
        const menu = await MealMenu.findByPk(menuId, {
            include: [{ model: Cafeteria, as: 'cafeteria' }]
        });

        if (!menu) {
            throw new AppError('Menu not found', 404, 'MENU_NOT_FOUND');
        }

        // Get reservation count
        const reservationCount = await MealReservation.count({
            where: { menu_id: menuId, status: { [Op.notIn]: ['cancelled', 'no_show'] } }
        });

        return {
            id: menu.id,
            date: menu.date,
            type: menu.type,
            items: menu.items_json,
            nutritional_info: menu.nutritional_info_json,
            price: parseFloat(menu.price),
            is_published: menu.is_published,
            max_reservations: menu.max_reservations,
            current_reservations: reservationCount,
            available_spots: menu.max_reservations ? menu.max_reservations - reservationCount : null,
            cafeteria: {
                id: menu.cafeteria?.id,
                name: menu.cafeteria?.name,
                location: menu.cafeteria?.location
            }
        };
    }

    // ==================== Cafeteria Operations ====================

    /**
     * Get all cafeterias
     * @returns {Promise<Array>}
     */
    static async getCafeterias() {
        const cafeterias = await Cafeteria.findAll({
            where: { is_active: true },
            order: [['name', 'ASC']]
        });

        return cafeterias.map(c => ({
            id: c.id,
            name: c.name,
            location: c.location,
            capacity: c.capacity,
            gps: c.gps_lat && c.gps_long ? { lat: c.gps_lat, long: c.gps_long } : null
        }));
    }

    /**
     * Seed menus for the next 7 days
     * @param {number} days - Number of days to seed (default: 7)
     * @returns {Promise<object>}
     */
    static async seedMenus(days = 7) {
        const cafeterias = await Cafeteria.findAll({
            where: { is_active: true }
        });

        if (cafeterias.length === 0) {
            throw new AppError('No active cafeterias found', 404, 'NO_CAFETERIAS');
        }

        // Generate dates
        const dates = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < days; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            dates.push({
                date: date.toISOString().split('T')[0],
                dayOfWeek: date.getDay()
            });
        }

        // Menu templates
        const breakfastTemplates = [
            {
                items: [
                    { name: 'Scrambled Eggs', category: 'Main' },
                    { name: 'White Cheese', category: 'Dairy' },
                    { name: 'Olives', category: 'Side' },
                    { name: 'Tomato & Cucumber', category: 'Salad' },
                    { name: 'Fresh Bread', category: 'Bread' },
                    { name: 'Tea', category: 'Beverage' }
                ],
                nutrition: { calories: 420, protein: 18, carbs: 35 },
                price: 25.00
            },
            {
                items: [
                    { name: 'Menemen', category: 'Main' },
                    { name: 'Feta Cheese', category: 'Dairy' },
                    { name: 'Honey & Jam', category: 'Spread' },
                    { name: 'Fresh Bread', category: 'Bread' },
                    { name: 'Coffee', category: 'Beverage' }
                ],
                nutrition: { calories: 480, protein: 20, carbs: 42 },
                price: 28.00
            },
            {
                items: [
                    { name: 'Boiled Eggs', category: 'Main' },
                    { name: 'Cream Cheese', category: 'Dairy' },
                    { name: 'Butter', category: 'Spread' },
                    { name: 'Fresh Bread', category: 'Bread' },
                    { name: 'Orange Juice', category: 'Beverage' }
                ],
                nutrition: { calories: 380, protein: 16, carbs: 32 },
                price: 22.00
            }
        ];

        const lunchTemplates = [
            {
                items: [
                    { name: 'Grilled Chicken Breast', category: 'Main' },
                    { name: 'Rice Pilaf', category: 'Side' },
                    { name: 'Seasonal Salad', category: 'Salad' },
                    { name: 'Lentil Soup', category: 'Soup' },
                    { name: 'Yogurt', category: 'Dairy' },
                    { name: 'Fresh Bread', category: 'Bread' }
                ],
                nutrition: { calories: 650, protein: 45, carbs: 55 },
                price: 45.00
            },
            {
                items: [
                    { name: 'Beef Kebab', category: 'Main' },
                    { name: 'Bulgur Pilaf', category: 'Side' },
                    { name: 'Grilled Vegetables', category: 'Side' },
                    { name: 'Tomato Soup', category: 'Soup' },
                    { name: 'Ayran', category: 'Beverage' }
                ],
                nutrition: { calories: 720, protein: 52, carbs: 48 },
                price: 55.00
            },
            {
                items: [
                    { name: 'Fish Fillet', category: 'Main' },
                    { name: 'Mashed Potatoes', category: 'Side' },
                    { name: 'Green Salad', category: 'Salad' },
                    { name: 'Vegetable Soup', category: 'Soup' },
                    { name: 'Lemon', category: 'Side' }
                ],
                nutrition: { calories: 580, protein: 38, carbs: 42 },
                price: 50.00
            },
            {
                items: [
                    { name: 'Meatballs (Köfte)', category: 'Main' },
                    { name: 'Pasta', category: 'Side' },
                    { name: 'Cacık', category: 'Side' },
                    { name: 'Seasonal Salad', category: 'Salad' },
                    { name: 'Fresh Bread', category: 'Bread' }
                ],
                nutrition: { calories: 680, protein: 42, carbs: 58 },
                price: 48.00
            },
            {
                items: [
                    { name: 'Vegetarian Moussaka', category: 'Main' },
                    { name: 'Rice Pilaf', category: 'Side' },
                    { name: 'Greek Salad', category: 'Salad' },
                    { name: 'Yogurt', category: 'Dairy' }
                ],
                nutrition: { calories: 520, protein: 22, carbs: 65 },
                price: 38.00
            }
        ];

        const dinnerTemplates = [
            {
                items: [
                    { name: 'Chicken Shish Kebab', category: 'Main' },
                    { name: 'Rice Pilaf', category: 'Side' },
                    { name: 'Grilled Peppers', category: 'Side' },
                    { name: 'Onion Salad', category: 'Salad' },
                    { name: 'Ayran', category: 'Beverage' }
                ],
                nutrition: { calories: 690, protein: 48, carbs: 52 },
                price: 52.00
            },
            {
                items: [
                    { name: 'Lamb Stew', category: 'Main' },
                    { name: 'Bulgur Pilaf', category: 'Side' },
                    { name: 'Seasonal Vegetables', category: 'Side' },
                    { name: 'Yogurt', category: 'Dairy' },
                    { name: 'Fresh Bread', category: 'Bread' }
                ],
                nutrition: { calories: 750, protein: 55, carbs: 50 },
                price: 58.00
            },
            {
                items: [
                    { name: 'Stuffed Peppers', category: 'Main' },
                    { name: 'Rice Pilaf', category: 'Side' },
                    { name: 'Cacık', category: 'Side' },
                    { name: 'Seasonal Salad', category: 'Salad' }
                ],
                nutrition: { calories: 620, protein: 28, carbs: 68 },
                price: 42.00
            },
            {
                items: [
                    { name: 'Grilled Salmon', category: 'Main' },
                    { name: 'Roasted Vegetables', category: 'Side' },
                    { name: 'Quinoa Salad', category: 'Salad' },
                    { name: 'Lemon Butter Sauce', category: 'Sauce' }
                ],
                nutrition: { calories: 640, protein: 40, carbs: 45 },
                price: 56.00
            },
            {
                items: [
                    { name: 'Pizza Slice', category: 'Main' },
                    { name: 'Caesar Salad', category: 'Salad' },
                    { name: 'French Fries', category: 'Side' }
                ],
                nutrition: { calories: 720, protein: 32, carbs: 78 },
                price: 44.00
            }
        ];

        let createdCount = 0;
        let skippedCount = 0;

        for (const cafeteria of cafeterias) {
            for (const { date, dayOfWeek } of dates) {
                // Select menu based on day
                const dayIndex = dayOfWeek % 7;
                
                // Breakfast
                const breakfastMenu = dayIndex === 0 || dayIndex === 6 
                    ? breakfastTemplates[0]
                    : breakfastTemplates[dayIndex % breakfastTemplates.length];
                
                // Lunch
                const lunchMenu = lunchTemplates[dayIndex % lunchTemplates.length];
                
                // Dinner
                const dinnerMenu = dinnerTemplates[(dayIndex + 2) % dinnerTemplates.length];

                const menus = [
                    { type: 'breakfast', ...breakfastMenu, max_reservations: dayIndex === 0 || dayIndex === 6 ? 150 : 200 },
                    { type: 'lunch', ...lunchMenu, max_reservations: 300 },
                    { type: 'dinner', ...dinnerMenu, max_reservations: 250 }
                ];

                for (const menu of menus) {
                    // Check if exists
                    const existing = await MealMenu.findOne({
                        where: {
                            cafeteria_id: cafeteria.id,
                            date: date,
                            type: menu.type
                        }
                    });

                    if (existing) {
                        skippedCount++;
                        continue;
                    }

                    await MealMenu.create({
                        cafeteria_id: cafeteria.id,
                        date: date,
                        type: menu.type,
                        items_json: menu.items,
                        nutritional_info_json: menu.nutrition,
                        price: menu.price,
                        is_published: true,
                        max_reservations: menu.max_reservations
                    });

                    createdCount++;
                }
            }
        }

        return {
            created: createdCount,
            skipped: skippedCount,
            total: createdCount + skippedCount
        };
    }

    // ==================== Helper Methods ====================

    /**
     * Get today's reservation count for a user
     * @private
     */
    static async _getTodayReservationCount(userId, date, transaction) {
        const count = await MealReservation.count({
            where: {
                user_id: userId,
                status: { [Op.notIn]: ['cancelled'] },
                '$menu.date$': date
            },
            include: [{ model: MealMenu, as: 'menu', attributes: [] }],
            transaction
        });

        return count;
    }
}

module.exports = MealService;
