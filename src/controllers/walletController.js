/**
 * Wallet Controller
 * 
 * Handles HTTP requests for wallet operations.
 */

const WalletService = require('../services/walletService');
const PaymentService = require('../services/paymentService');
const { AppError } = require('../middleware/errorHandler');

/**
 * Get wallet balance
 * GET /api/wallet/balance
 */
const getBalance = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const balance = await WalletService.getBalance(userId);

        res.status(200).json({
            success: true,
            data: balance
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Top up wallet
 * POST /api/wallet/topup
 * Body: { amount: number, payment_method?: string }
 */
const topUpWallet = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { amount, payment_method = 'card' } = req.body;

        if (!amount || typeof amount !== 'number') {
            return next(new AppError('Amount is required and must be a number', 400, 'INVALID_AMOUNT'));
        }

        const result = await PaymentService.topUpWallet(userId, amount, payment_method);

        if (result.success) {
            res.status(200).json({
                success: true,
                message: 'Wallet topped up successfully',
                data: result
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message,
                error: result.error
            });
        }
    } catch (error) {
        next(error);
    }
};

/**
 * Get transaction history
 * GET /api/wallet/transactions
 * Query: page, limit, type, startDate, endDate
 */
const getTransactions = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { page, limit, type, startDate, endDate } = req.query;

        const result = await WalletService.getTransactionHistory(userId, {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20,
            type,
            startDate,
            endDate
        });

        res.status(200).json({
            success: true,
            data: result.transactions,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Handle payment webhook
 * POST /api/wallet/webhook
 * This endpoint should be public (no auth required)
 */
const handleWebhook = async (req, res, next) => {
    try {
        const signature = req.headers['x-payment-signature'] || req.headers['x-webhook-signature'];
        const payload = req.body;

        if (!payload || !payload.event_type) {
            return res.status(400).json({
                success: false,
                message: 'Invalid webhook payload'
            });
        }

        const result = await PaymentService.handleWebhook(payload, signature);

        // Always return 200 to acknowledge receipt
        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        // Log error but still return 200 to prevent retries for invalid signatures
        console.error('[Webhook Error]', error.message);

        if (error.code === 'INVALID_SIGNATURE') {
            return res.status(401).json({
                success: false,
                message: 'Invalid signature'
            });
        }

        // Return 200 for other errors to prevent webhook retries
        res.status(200).json({
            success: false,
            message: 'Webhook processing failed'
        });
    }
};

/**
 * Create payment intent (for frontend to initiate payment)
 * POST /api/wallet/payment-intent
 * Body: { amount: number }
 */
const createPaymentIntent = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { amount } = req.body;

        if (!amount || typeof amount !== 'number' || amount <= 0) {
            return next(new AppError('Valid amount is required', 400, 'INVALID_AMOUNT'));
        }

        const paymentIntent = await PaymentService.createPaymentIntent({
            userId,
            amount,
            currency: 'TRY',
            description: `Wallet top-up: ${amount} TRY`
        });

        res.status(200).json({
            success: true,
            data: {
                payment_id: paymentIntent.id,
                amount: paymentIntent.amount,
                currency: paymentIntent.currency,
                payment_url: paymentIntent.payment_url,
                client_secret: paymentIntent.client_secret,
                expires_at: paymentIntent.expires_at
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Check if user has sufficient balance
 * GET /api/wallet/check-balance/:amount
 */
const checkBalance = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const amount = parseFloat(req.params.amount);

        if (isNaN(amount) || amount <= 0) {
            return next(new AppError('Valid amount is required', 400, 'INVALID_AMOUNT'));
        }

        const hasSufficient = await WalletService.hasSufficientBalance(userId, amount);
        const balance = await WalletService.getBalance(userId);

        res.status(200).json({
            success: true,
            data: {
                has_sufficient_balance: hasSufficient,
                required_amount: amount,
                current_balance: balance.balance,
                currency: balance.currency
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getBalance,
    topUpWallet,
    getTransactions,
    handleWebhook,
    createPaymentIntent,
    checkBalance
};
