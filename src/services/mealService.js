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
            isolationLevel: sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE
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
