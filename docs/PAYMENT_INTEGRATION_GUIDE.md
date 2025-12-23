# Payment Integration Guide

## Overview

This guide explains how payment processing works in the Smart Campus Platform. The system uses a mock payment gateway that simulates real-world payment provider behavior (similar to Stripe, PayTR, or iyzico).

---

## Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Frontend      │──────│   Backend API   │──────│  Mock Gateway   │
│   (React)       │      │   (Express)     │      │  (Simulated)    │
└─────────────────┘      └─────────────────┘      └─────────────────┘
                                │                         │
                                ▼                         │
                         ┌─────────────────┐              │
                         │   PostgreSQL    │◄─────────────┘
                         │   (Wallet &     │    Webhook
                         │    Transactions)│
                         └─────────────────┘
```

---

## Payment Flow

### 1. Create Payment Intent

```http
POST /api/wallet/payment-intent
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 100
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "payment_id": "PAY-abc123",
    "amount": 100,
    "currency": "TRY",
    "payment_url": "https://mock-payment-gateway.com/pay/abc123",
    "client_secret": "secret_xyz",
    "expires_at": "2024-01-15T15:00:00Z"
  }
}
```

### 2. User Makes Payment

In a real implementation, redirect the user to `payment_url` or use the payment provider's SDK.

### 3. Top-Up Wallet (Simplified Flow)

For development/testing, use the direct top-up endpoint:

```http
POST /api/wallet/topup
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 100,
  "payment_method": "card"
}
```

---

## Webhook Integration

### Webhook Endpoint

```http
POST /api/wallet/webhook
Content-Type: application/json
X-Payment-Signature: <signature>

{
  "event_type": "payment.completed",
  "payment_reference": "PAY-abc123",
  "user_id": "user-uuid",
  "amount": 100,
  "currency": "TRY",
  "timestamp": "2024-01-15T14:30:00Z"
}
```

### Event Types

| Event | Description |
|-------|-------------|
| `payment.completed` | Payment was successful |
| `payment.failed` | Payment was declined or failed |
| `payment.refunded` | Payment was refunded |

### Signature Verification

The webhook handler verifies the request signature using HMAC-SHA256:

```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

---

## Configuration

### Environment Variables

```env
# Payment Gateway Configuration
PAYMENT_MERCHANT_ID=your_merchant_id
PAYMENT_SECRET_KEY=your_secret_key
PAYMENT_WEBHOOK_SECRET=your_webhook_secret

# Optional: Gateway URL (for production)
PAYMENT_GATEWAY_URL=https://api.paymentprovider.com
```

### Mock Gateway Configuration

```javascript
// src/services/paymentService.js

const MOCK_GATEWAY_CONFIG = {
  merchantId: process.env.PAYMENT_MERCHANT_ID || 'MOCK_MERCHANT',
  secretKey: process.env.PAYMENT_SECRET_KEY || 'mock_secret_key_123',
  webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || 'mock_webhook_secret',
  baseUrl: 'https://mock-payment-gateway.com',
  successRate: 0.95, // 95% success rate for testing
  processingDelay: 500 // Simulated processing time (ms)
};
```

---

## Wallet Operations

### Transaction Types

| Type | Description | Direction |
|------|-------------|-----------|
| `deposit` | Wallet top-up | Credit (+) |
| `withdrawal` | Manual withdrawal | Debit (-) |
| `meal_payment` | Meal reservation payment | Debit (-) |
| `event_payment` | Event registration payment | Debit (-) |
| `refund` | Cancellation refund | Credit (+) |

### ACID Compliance

All wallet operations use Sequelize transactions with `SERIALIZABLE` isolation level:

```javascript
const t = await sequelize.transaction({
  isolationLevel: sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE
});

try {
  // 1. Lock wallet row
  const wallet = await Wallet.findOne({
    where: { user_id: userId },
    lock: t.LOCK.UPDATE,
    transaction: t
  });

  // 2. Validate balance
  if (wallet.balance < amount) {
    throw new Error('Insufficient balance');
  }

  // 3. Update balance
  await wallet.decrement('balance', { by: amount, transaction: t });

  // 4. Create transaction record
  await Transaction.create({
    wallet_id: wallet.id,
    amount: -amount,
    type: 'meal_payment',
    // ...
  }, { transaction: t });

  await t.commit();
} catch (error) {
  await t.rollback();
  throw error;
}
```

---

## Testing Webhooks

### Generate Test Signature

```javascript
const PaymentService = require('./src/services/paymentService');

const payload = {
  event_type: 'payment.completed',
  payment_reference: 'PAY-test123',
  user_id: 'user-uuid',
  amount: 100
};

const signature = PaymentService.generateWebhookSignature(payload);
console.log('Test signature:', signature);
```

### Test with cURL

```bash
curl -X POST http://localhost:3000/api/wallet/webhook \
  -H "Content-Type: application/json" \
  -H "X-Payment-Signature: <generated_signature>" \
  -d '{
    "event_type": "payment.completed",
    "payment_reference": "PAY-test123",
    "user_id": "user-uuid",
    "amount": 100
  }'
```

---

## Production Considerations

### Security Checklist

- [ ] Store payment secrets in secure environment variables
- [ ] Validate webhook signatures on every request
- [ ] Use HTTPS for all payment-related endpoints
- [ ] Implement rate limiting on payment endpoints
- [ ] Log all payment transactions for audit
- [ ] Set up monitoring for failed payments

### Recommended Payment Providers

| Provider | Region | Features |
|----------|--------|----------|
| Stripe | Global | Cards, Bank transfers |
| PayTR | Turkey | Cards, 3D Secure |
| iyzico | Turkey | Cards, Marketplace |
| PayPal | Global | Cards, PayPal balance |

### Integration Steps for Production

1. **Create Merchant Account** with chosen provider
2. **Get API Credentials** (Merchant ID, Secret Key)
3. **Configure Webhook URL** in provider dashboard
4. **Update Environment Variables** with real credentials
5. **Replace Mock Methods** in `PaymentService`:
   - `_simulateGatewayProcessing` → Real API calls
   - `createPaymentIntent` → Provider SDK
6. **Test** in sandbox/test environment
7. **Go Live** with production credentials

---

## Error Handling

### Payment Errors

| Code | Description | User Message |
|------|-------------|--------------|
| `INSUFFICIENT_BALANCE` | Wallet balance too low | Please top up your wallet |
| `PAYMENT_FAILED` | Gateway declined transaction | Payment failed, try again |
| `INVALID_AMOUNT` | Amount validation failed | Enter a valid amount |
| `PAYMENT_EXPIRED` | Payment intent expired | Payment session expired |
| `INVALID_SIGNATURE` | Webhook signature mismatch | (Internal) |

### Retry Logic

For failed webhooks, implement exponential backoff:

```javascript
const retryDelays = [1000, 5000, 30000, 300000]; // 1s, 5s, 30s, 5min

async function processWebhookWithRetry(payload, attempt = 0) {
  try {
    await processWebhook(payload);
  } catch (error) {
    if (attempt < retryDelays.length) {
      await sleep(retryDelays[attempt]);
      return processWebhookWithRetry(payload, attempt + 1);
    }
    throw error;
  }
}
```

---

## API Reference

See [API_DOCUMENTATION_PART3.md](./API_DOCUMENTATION_PART3.md) for complete endpoint documentation.
