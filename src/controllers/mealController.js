/**
 * Meal Controller
 * 
 * Handles HTTP requests for meal reservations and menu management.
 */

const MealService = require('../services/mealService');
const { AppError } = require('../middleware/errorHandler');

// ==================== Reservation Endpoints ====================

/**
 * Create a meal reservation
 * POST /api/meals/reservations
 */
const createReservation = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { menu_id } = req.body;

        if (!menu_id) {
            return next(new AppError('Menu ID is required', 400, 'MISSING_MENU_ID'));
        }

        const result = await MealService.createReservation(userId, menu_id);

        res.status(201).json({
            success: true,
            message: 'Reservation created successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Use/validate a reservation (scan QR code)
 * POST /api/meals/reservations/use
 */
const useReservation = async (req, res, next) => {
    try {
        const { qr_code } = req.body;
        const staffId = req.user?.id;

        if (!qr_code) {
            return next(new AppError('QR code is required', 400, 'MISSING_QR_CODE'));
        }

        const result = await MealService.useReservation(qr_code, staffId);

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Cancel a reservation
 * DELETE /api/meals/reservations/:id
 */
const cancelReservation = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const result = await MealService.cancelReservation(userId, id);

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get user's reservations
 * GET /api/meals/reservations
 */
const getMyReservations = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { page, limit, status, startDate, endDate } = req.query;

        const result = await MealService.getUserReservations(userId, {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20,
            status,
            startDate,
            endDate
        });

        res.status(200).json({
            success: true,
            data: result.reservations,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

// ==================== Menu Endpoints ====================

/**
 * Get all menus
 * GET /api/meals/menus
 */
const getMenus = async (req, res, next) => {
    try {
        const { cafeteria_id, date, start_date, end_date, type, page, limit } = req.query;

        // Non-admin users only see published menus
        const publishedOnly = !['admin', 'staff'].includes(req.user?.role);

        const result = await MealService.getMenus({
            cafeteriaId: cafeteria_id,
            date,
            startDate: start_date,
            endDate: end_date,
            type,
            publishedOnly,
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20
        });

        res.status(200).json({
            success: true,
            data: result.menus,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get menu by ID
 * GET /api/meals/menus/:id
 */
const getMenuById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const menu = await MealService.getMenuById(id);

        res.status(200).json({
            success: true,
            data: menu
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Create a menu (Admin/Staff only)
 * POST /api/meals/menus
 */
const createMenu = async (req, res, next) => {
    try {
        const menuData = req.body;

        if (!menuData.cafeteria_id || !menuData.date || !menuData.type) {
            return next(new AppError('Cafeteria ID, date, and type are required', 400, 'MISSING_FIELDS'));
        }

        const menu = await MealService.createMenu(menuData);

        res.status(201).json({
            success: true,
            message: 'Menu created successfully',
            data: menu
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update a menu (Admin/Staff only)
 * PUT /api/meals/menus/:id
 */
const updateMenu = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const menu = await MealService.updateMenu(id, updateData);

        res.status(200).json({
            success: true,
            message: 'Menu updated successfully',
            data: menu
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete a menu (Admin/Staff only)
 * DELETE /api/meals/menus/:id
 */
const deleteMenu = async (req, res, next) => {
    try {
        const { id } = req.params;

        await MealService.deleteMenu(id);

        res.status(200).json({
            success: true,
            message: 'Menu deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// ==================== Cafeteria Endpoints ====================

/**
 * Get all cafeterias
 * GET /api/meals/cafeterias
 */
const getCafeterias = async (req, res, next) => {
    try {
        const cafeterias = await MealService.getCafeterias();

        res.status(200).json({
            success: true,
            data: cafeterias
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createReservation,
    useReservation,
    cancelReservation,
    getMyReservations,
    getMenus,
    getMenuById,
    createMenu,
    updateMenu,
    deleteMenu,
    getCafeterias
};
