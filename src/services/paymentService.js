/**
 * Payment Service
 * 
 * Handles payment gateway integration (mock Stripe/PayTR).
 * Provides methods for processing payments and handling webhooks.
 */

const { sequelize, Transaction } = require('../models');
const WalletService = require('./walletService');
const { AppError } = require('../middleware/errorHandler');
const crypto = require('crypto');

// Mock payment gateway configuration
const MOCK_GATEWAY_CONFIG = {
    merchantId: process.env.PAYMENT_MERCHANT_ID || 'MOCK_MERCHANT_001',
    secretKey: process.env.PAYMENT_SECRET_KEY || 'mock_secret_key_12345',
    webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || 'mock_webhook_secret',
    // Simulate processing delay (ms)
    processingDelay: 500,
    // Simulate success rate (0-1)
    successRate: 0.95
};

class PaymentService {
    /**
     * Generate a unique payment reference
     * @returns {string}
     */
    static generatePaymentReference() {
        const timestamp = Date.now().toString(36);
        const randomPart = crypto.randomBytes(4).toString('hex');
        return `PAY-${timestamp}-${randomPart}`.toUpperCase();
    }

    /**
     * Create a payment intent (mock gateway call)
     * This simulates creating a payment session with a payment provider
     * 
     * @param {object} params - Payment parameters
     * @param {string} params.userId - User ID
     * @param {number} params.amount - Amount to charge
     * @param {string} params.currency - Currency code
     * @param {string} params.description - Payment description
     * @returns {Promise<object>} Payment intent details
     */
    static async createPaymentIntent({ userId, amount, currency = 'TRY', description }) {
        if (!userId || !amount) {
            throw new AppError('User ID and amount are required', 400, 'INVALID_PARAMS');
        }

        if (amount <= 0) {
            throw new AppError('Amount must be positive', 400, 'INVALID_AMOUNT');
        }

        // Generate payment reference
        const paymentReference = this.generatePaymentReference();

        // Mock payment intent creation
        const paymentIntent = {
            id: paymentReference,
            merchant_id: MOCK_GATEWAY_CONFIG.merchantId,
            amount: amount,
            currency: currency,
            description: description || `Wallet top-up for user`,
            status: 'pending',
            user_id: userId,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min expiry
            // Mock payment URL (in real implementation, this would be the gateway URL)
            payment_url: `https://mock-payment-gateway.com/pay/${paymentReference}`,
            // For testing: include a callback URL
            callback_url: `/api/wallet/webhook`,
            // Mock client secret for frontend
            client_secret: crypto.createHmac('sha256', MOCK_GATEWAY_CONFIG.secretKey)
                .update(paymentReference)
                .digest('hex')
        };

        console.log(`[PaymentService] Created payment intent: ${paymentReference} for amount ${amount} ${currency}`);

        return paymentIntent;
    }

    /**
     * Top up wallet with payment
     * Creates a payment intent and processes it (mock flow)
     * 
     * @param {string} userId - User ID
     * @param {number} amount - Top-up amount
     * @param {string} paymentMethod - Payment method (card, bank_transfer, etc.)
     * @returns {Promise<object>} Payment result
     */
    static async topUpWallet(userId, amount, paymentMethod = 'card') {
        if (amount < 10) {
            throw new AppError('Minimum top-up amount is 10 TRY', 400, 'MIN_AMOUNT_ERROR');
        }

        if (amount > 10000) {
            throw new AppError('Maximum top-up amount is 10,000 TRY', 400, 'MAX_AMOUNT_ERROR');
        }

        // Create payment intent
        const paymentIntent = await this.createPaymentIntent({
            userId,
            amount,
            currency: 'TRY',
            description: `Wallet top-up: ${amount} TRY`
        });

        // In a real implementation, you would return the payment URL
        // and wait for webhook confirmation. For this mock, we simulate
        // immediate processing.

        // Simulate gateway processing
        const gatewayResult = await this._simulateGatewayProcessing(paymentIntent, paymentMethod);

        if (gatewayResult.success) {
            // Process the successful payment
            const walletResult = await this._processSuccessfulPayment(userId, amount, paymentIntent.id);

            return {
                success: true,
                payment_reference: paymentIntent.id,
                amount: amount,
                currency: 'TRY',
                status: 'completed',
                wallet: walletResult.wallet,
                transaction_id: walletResult.transaction.id,
                message: 'Wallet topped up successfully'
            };
        } else {
            return {
                success: false,
                payment_reference: paymentIntent.id,
                amount: amount,
                currency: 'TRY',
                status: 'failed',
                error: gatewayResult.error,
                message: 'Payment processing failed'
            };
        }
    }

    /**
     * Process webhook from payment gateway
     * Validates signature and processes the payment confirmation
     * 
     * @param {object} payload - Webhook payload
     * @param {string} signature - Webhook signature for verification
     * @returns {Promise<object>} Processing result
     */
    static async handleWebhook(payload, signature) {
        // Verify webhook signature
        const isValid = this._verifyWebhookSignature(payload, signature);

        if (!isValid) {
            console.error('[PaymentService] Invalid webhook signature');
            throw new AppError('Invalid webhook signature', 401, 'INVALID_SIGNATURE');
        }

        const { event_type, payment_reference, user_id, amount, status, metadata } = payload;

        console.log(`[PaymentService] Received webhook: ${event_type} for ${payment_reference}`);

        switch (event_type) {
            case 'payment.completed':
                return await this._handlePaymentCompleted(user_id, amount, payment_reference, metadata);

            case 'payment.failed':
                return await this._handlePaymentFailed(payment_reference, payload.error);

            case 'payment.refunded':
                return await this._handlePaymentRefunded(user_id, amount, payment_reference, metadata);

            default:
                console.log(`[PaymentService] Unhandled webhook event: ${event_type}`);
                return { processed: false, message: `Unhandled event type: ${event_type}` };
        }
    }

    /**
     * Generate webhook signature for testing
     * @param {object} payload - Payload to sign
     * @returns {string} Signature
     */
    static generateWebhookSignature(payload) {
        const payloadString = JSON.stringify(payload);
        return crypto.createHmac('sha256', MOCK_GATEWAY_CONFIG.webhookSecret)
            .update(payloadString)
            .digest('hex');
    }

    /**
     * Simulate payment gateway processing
     * @private
     */
    static async _simulateGatewayProcessing(paymentIntent, paymentMethod) {
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, MOCK_GATEWAY_CONFIG.processingDelay));

        // Simulate success/failure based on success rate
        const random = Math.random();

        if (random < MOCK_GATEWAY_CONFIG.successRate) {
            return {
                success: true,
                gateway_reference: `GW-${Date.now()}`,
                processed_at: new Date().toISOString()
            };
        } else {
            // Simulate random failure reasons
            const failureReasons = [
                'Card declined',
                'Insufficient funds',
                'Payment timeout',
                'Gateway error'
            ];
            return {
                success: false,
                error: failureReasons[Math.floor(Math.random() * failureReasons.length)]
            };
        }
    }

    /**
     * Process successful payment and credit wallet
     * @private
     */
    static async _processSuccessfulPayment(userId, amount, paymentReference) {
        const result = await WalletService.createTransaction({
            userId,
            type: 'deposit',
            amount,
            description: `Top-up via payment gateway (Ref: ${paymentReference})`,
            referenceId: paymentReference,
            referenceType: 'payment_gateway'
        });

        console.log(`[PaymentService] Wallet credited: ${amount} TRY for user ${userId}`);

        return result;
    }

    /**
     * Handle payment completed webhook
     * @private
     */
    static async _handlePaymentCompleted(userId, amount, paymentReference, metadata) {
        try {
            const result = await WalletService.createTransaction({
                userId,
                type: 'deposit',
                amount,
                description: `Payment received (Ref: ${paymentReference})`,
                referenceId: paymentReference,
                referenceType: metadata?.type || 'payment_gateway'
            });

            return {
                processed: true,
                transaction_id: result.transaction.id,
                message: 'Payment processed successfully'
            };
        } catch (error) {
            console.error(`[PaymentService] Error processing payment webhook: ${error.message}`);
            throw error;
        }
    }

    /**
     * Handle payment failed webhook
     * @private
     */
    static async _handlePaymentFailed(paymentReference, error) {
        console.log(`[PaymentService] Payment failed for ${paymentReference}: ${error}`);

        // Log the failure for monitoring
        // In a real implementation, you might want to notify the user

        return {
            processed: true,
            message: `Payment failure recorded for ${paymentReference}`
        };
    }

    /**
     * Handle payment refunded webhook
     * @private
     */
    static async _handlePaymentRefunded(userId, amount, paymentReference, metadata) {
        // Note: For refunds, we might need to DEDUCT from wallet if the original
        // deposit was already credited. This depends on business logic.
        console.log(`[PaymentService] Refund processed for ${paymentReference}: ${amount}`);

        return {
            processed: true,
            message: `Refund recorded for ${paymentReference}`
        };
    }

    /**
     * Verify webhook signature
     * @private
     */
    static _verifyWebhookSignature(payload, signature) {
        if (!signature) {
            return false;
        }

        const expectedSignature = this.generateWebhookSignature(payload);

        // Use timing-safe comparison to prevent timing attacks
        try {
            return crypto.timingSafeEqual(
                Buffer.from(signature),
                Buffer.from(expectedSignature)
            );
        } catch {
            return false;
        }
    }

    /**
     * Get payment status (mock)
     * @param {string} paymentReference - Payment reference ID
     * @returns {Promise<object>} Payment status
     */
    static async getPaymentStatus(paymentReference) {
        // In a real implementation, this would query the payment gateway
        // For mock purposes, return a simulated status

        return {
            payment_reference: paymentReference,
            status: 'completed',
            message: 'Mock payment status - always returns completed'
        };
    }
}

module.exports = PaymentService;
