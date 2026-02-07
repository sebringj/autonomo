# Payment Testing

> **Purpose**: Test payment flows locally without real transactions.

---

## Stripe CLI (Highly Recommended)

The Stripe CLI is excellent for local development:

```bash
# Install
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test events
stripe trigger payment_intent.succeeded
stripe trigger customer.subscription.created
```

---

## Stripe Test Cards

| Card Number | Scenario |
|-------------|----------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 3220` | 3D Secure required |
| `4000 0000 0000 9995` | Declined (insufficient funds) |
| `4000 0000 0000 0002` | Declined (generic) |

---

## Custom Action for Instant Checkout

```typescript
autonomoRegisterCustomAction('testCheckout', async (priceId) => {
  // Create payment intent with test card
  const pi = await stripe.paymentIntents.create({
    amount: 1000,
    currency: 'usd',
    payment_method: 'pm_card_visa', // Test payment method
    confirm: true,
  });
  return { status: pi.status };
});
```

---

## PayPal Sandbox

```bash
# Use sandbox credentials from developer.paypal.com
PAYPAL_CLIENT_ID=sandbox_client_id
PAYPAL_CLIENT_SECRET=sandbox_secret
PAYPAL_MODE=sandbox
```

Test accounts are created in the PayPal Developer Dashboard with fake balances.

---

## Square Sandbox

```bash
# Square provides sandbox environment
SQUARE_ACCESS_TOKEN=sandbox-token
SQUARE_ENVIRONMENT=sandbox
```

Test card: `4532 0000 0000 0000` (Visa)

---

## VS Code Task for Stripe

```json
{
  "label": "2️⃣ Stripe Webhooks",
  "type": "shell",
  "command": "stripe",
  "args": [
    "listen",
    "--forward-to", "http://localhost:3000/api/stripe-webhook",
    "--events", "payment_intent.succeeded,payment_intent.payment_failed"
  ],
  "isBackground": true,
  "runOptions": { "instanceLimit": 1 }
}
```
