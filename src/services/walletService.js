/**
 * Wallet Service
 * 
 * Handles all wallet-related operations with ACID properties.
 * Uses Sequelize transactions to ensure data integrity.
 */

const { sequelize, Wallet, Transaction, User } = require('../models');
const { AppError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');
const Sequelize = require('sequelize');

class WalletService {
    /**
     * Get or create wallet for a user
     * @param {string} userId - User ID
     * @param {object} options - Transaction options
     * @returns {Promise<Wallet>}
     */
    static async getOrCreateWallet(userId, options = {}) {
        let wallet = await Wallet.findOne({
            where: { user_id: userId },
            ...options
        });

        if (!wallet) {
            wallet = await Wallet.create({
                user_id: userId,
                balance: 0.00,
                currency: 'TRY',
                is_active: true
            }, options);
        }

        return wallet;
    }

    /**
     * Get wallet balance for a user
     * @param {string} userId - User ID
     * @returns {Promise<object>} Wallet balance info
     */
    static async getBalance(userId) {
        const wallet = await this.getOrCreateWallet(userId);

        return {
            balance: parseFloat(wallet.balance),
            currency: wallet.currency,
            is_active: wallet.is_active,
            updated_at: wallet.updated_at
        };
    }

    /**
     * Create a transaction with ACID properties
     * Handles deposits, withdrawals, meal payments, event payments, and refunds
     * 
     * @param {object} params - Transaction parameters
     * @param {string} params.userId - User ID
     * @param {string} params.type - Transaction type (deposit, withdrawal, meal_payment, event_payment, refund)
     * @param {number} params.amount - Amount (positive value)
     * @param {string} [params.description] - Transaction description
     * @param {string} [params.referenceId] - Reference to related entity
     * @param {string} [params.referenceType] - Type of referenced entity
     * @param {object} [params.transaction] - Existing Sequelize transaction
     * @returns {Promise<Transaction>}
     */
    static async createTransaction({
        userId,
        type,
        amount,
        description = null,
        referenceId = null,
        referenceType = null,
        transaction: externalTransaction = null
    }) {
        // Validate amount
        if (!amount || amount <= 0) {
            throw new AppError('Amount must be a positive number', 400, 'INVALID_AMOUNT');
        }

        // Validate type
        const validTypes = ['deposit', 'withdrawal', 'meal_payment', 'event_payment', 'refund'];
        if (!validTypes.includes(type)) {
            throw new AppError(`Invalid transaction type. Must be one of: ${validTypes.join(', ')}`, 400, 'INVALID_TYPE');
        }

        // Determine if we need to create a new transaction or use existing
        const useExternalTransaction = !!externalTransaction;
        // Use Sequelize.Transaction containing constants
        const t = externalTransaction || await sequelize.transaction({
            isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE
        });

        try {
            // Get wallet with lock for update
            const wallet = await Wallet.findOne({
                where: { user_id: userId },
                lock: t.LOCK.UPDATE,
                transaction: t
            });

            if (!wallet) {
                throw new AppError('Wallet not found', 404, 'WALLET_NOT_FOUND');
            }

            if (!wallet.is_active) {
                throw new AppError('Wallet is deactivated', 403, 'WALLET_INACTIVE');
            }

            const currentBalance = parseFloat(wallet.balance);
            let newBalance;
            let transactionAmount;

            // Calculate new balance based on transaction type
            if (type === 'deposit' || type === 'refund') {
                // Credit transaction (add to balance)
                newBalance = currentBalance + amount;
                transactionAmount = amount;
            } else {
                // Debit transaction (subtract from balance)
                newBalance = currentBalance - amount;
                transactionAmount = -amount; // Store as negative for debits

                // Check for sufficient balance
                if (newBalance < 0) {
                    throw new AppError(
                        `Insufficient balance. Current: ${currentBalance.toFixed(2)} ${wallet.currency}, Required: ${amount.toFixed(2)} ${wallet.currency}`,
                        400,
                        'INSUFFICIENT_BALANCE'
                    );
                }
            }

            // Update wallet balance
            await wallet.update({ balance: newBalance }, { transaction: t });

            // Create transaction record
            const transactionRecord = await Transaction.create({
                wallet_id: wallet.id,
                type,
                amount: Math.abs(amount), // Always store positive amount
                description: description || this._generateDescription(type, amount, wallet.currency),
                reference_id: referenceId,
                reference_type: referenceType,
                status: 'completed',
                transaction_date: new Date()
            }, { transaction: t });

            // Commit only if we created the transaction
            if (!useExternalTransaction) {
                await t.commit();
            }

            return {
                transaction: transactionRecord,
                wallet: {
                    id: wallet.id,
                    previous_balance: currentBalance,
                    new_balance: newBalance,
                    currency: wallet.currency
                }
            };
        } catch (error) {
            // Rollback only if we created the transaction
            if (!useExternalTransaction) {
                await t.rollback();
            }
            throw error;
        }
    }

    /**
     * Get transaction history for a user
     * @param {string} userId - User ID
     * @param {object} options - Query options
     * @param {number} [options.page=1] - Page number
     * @param {number} [options.limit=20] - Items per page
     * @param {string} [options.type] - Filter by transaction type
     * @param {Date} [options.startDate] - Filter from date
     * @param {Date} [options.endDate] - Filter to date
     * @returns {Promise<object>} Paginated transaction list
     */
    static async getTransactionHistory(userId, options = {}) {
        const {
            page = 1,
            limit = 20,
            type,
            startDate,
            endDate
        } = options;

        const wallet = await Wallet.findOne({
            where: { user_id: userId }
        });

        if (!wallet) {
            return {
                transactions: [],
                pagination: {
                    page: 1,
                    limit,
                    total: 0,
                    totalPages: 0
                }
            };
        }

        // Build where clause
        const where = { wallet_id: wallet.id };

        if (type) {
            where.type = type;
        }

        if (startDate || endDate) {
            where.transaction_date = {};
            if (startDate) {
                where.transaction_date[Op.gte] = new Date(startDate);
            }
            if (endDate) {
                where.transaction_date[Op.lte] = new Date(endDate);
            }
        }

        const offset = (page - 1) * limit;

        const { count, rows } = await Transaction.findAndCountAll({
            where,
            order: [['transaction_date', 'DESC']],
            limit,
            offset
        });

        return {
            transactions: rows.map(tx => {
                const isCredit = ['deposit', 'refund'].includes(tx.type);
                const signedAmount = parseFloat(tx.amount) * (isCredit ? 1 : -1);

                return {
                    id: tx.id,
                    type: tx.type,
                    amount: signedAmount,
                    description: tx.description,
                    status: tx.status,
                    reference_id: tx.reference_id,
                    reference_type: tx.reference_type,
                    transaction_date: tx.transaction_date,
                    created_at: tx.created_at
                };
            }),
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil(count / limit)
            }
        };
    }

    /**
     * Process a refund
     * @param {string} userId - User ID
     * @param {number} amount - Refund amount
     * @param {string} referenceId - Original transaction/order reference
     * @param {string} referenceType - Type of reference
     * @param {string} reason - Refund reason
     * @returns {Promise<object>}
     */
    static async processRefund(userId, amount, referenceId, referenceType, reason) {
        return this.createTransaction({
            userId,
            type: 'refund',
            amount,
            description: `Refund: ${reason}`,
            referenceId,
            referenceType
        });
    }

    /**
     * Generate default description for transaction
     * @private
     */
    static _generateDescription(type, amount, currency) {
        const descriptions = {
            deposit: `Wallet top-up of ${amount.toFixed(2)} ${currency}`,
            withdrawal: `Withdrawal of ${amount.toFixed(2)} ${currency}`,
            meal_payment: `Meal payment of ${amount.toFixed(2)} ${currency}`,
            event_payment: `Event registration payment of ${amount.toFixed(2)} ${currency}`,
            refund: `Refund of ${amount.toFixed(2)} ${currency}`
        };
        return descriptions[type] || `Transaction of ${amount.toFixed(2)} ${currency}`;
    }

    /**
     * Check if user has sufficient balance
     * @param {string} userId - User ID
     * @param {number} amount - Required amount
     * @returns {Promise<boolean>}
     */
    static async hasSufficientBalance(userId, amount) {
        const wallet = await Wallet.findOne({
            where: { user_id: userId }
        });

        if (!wallet) {
            return false;
        }

        return parseFloat(wallet.balance) >= amount;
    }
}

module.exports = WalletService;
