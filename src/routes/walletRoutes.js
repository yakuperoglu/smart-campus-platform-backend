/**
 * Wallet Routes
 * 
 * API endpoints for wallet management and payments.
 * 
 * @swagger
 * tags:
 *   name: Wallet
 *   description: Wallet management and payment operations
 */

const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { verifyToken } = require('../middleware/authMiddleware');

/**
 * @swagger
 * /wallet/balance:
 *   get:
 *     summary: Get wallet balance
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet balance retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     balance:
 *                       type: number
 *                       example: 150.50
 *                     currency:
 *                       type: string
 *                       example: TRY
 *                     is_active:
 *                       type: boolean
 */
router.get('/balance', verifyToken, walletController.getBalance);

/**
 * @swagger
 * /wallet/topup:
 *   post:
 *     summary: Top up wallet balance
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 10
 *                 maximum: 10000
 *                 example: 100
 *               payment_method:
 *                 type: string
 *                 enum: [card, bank_transfer]
 *                 default: card
 *     responses:
 *       200:
 *         description: Wallet topped up successfully
 *       400:
 *         description: Invalid amount or payment failed
 */
router.post('/topup', verifyToken, walletController.topUpWallet);

/**
 * @swagger
 * /wallet/transactions:
 *   get:
 *     summary: Get transaction history
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [deposit, withdrawal, meal_payment, event_payment, refund]
 *         description: Filter by transaction type
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to date
 *     responses:
 *       200:
 *         description: Transaction history retrieved successfully
 */
router.get('/transactions', verifyToken, walletController.getTransactions);

/**
 * @swagger
 * /wallet/payment-intent:
 *   post:
 *     summary: Create a payment intent for frontend payment flow
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 10
 *                 example: 100
 *     responses:
 *       200:
 *         description: Payment intent created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     payment_id:
 *                       type: string
 *                     payment_url:
 *                       type: string
 *                     client_secret:
 *                       type: string
 */
router.post('/payment-intent', verifyToken, walletController.createPaymentIntent);

/**
 * @swagger
 * /wallet/check-balance/{amount}:
 *   get:
 *     summary: Check if user has sufficient balance
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: amount
 *         required: true
 *         schema:
 *           type: number
 *         description: Amount to check
 *     responses:
 *       200:
 *         description: Balance check result
 */
router.get('/check-balance/:amount', verifyToken, walletController.checkBalance);

/**
 * @swagger
 * /wallet/webhook:
 *   post:
 *     summary: Payment gateway webhook endpoint
 *     tags: [Wallet]
 *     description: Handles payment confirmations from payment gateway. No authentication required.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               event_type:
 *                 type: string
 *                 enum: [payment.completed, payment.failed, payment.refunded]
 *               payment_reference:
 *                 type: string
 *               user_id:
 *                 type: string
 *               amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Webhook processed
 */
router.post('/webhook', walletController.handleWebhook);

module.exports = router;
