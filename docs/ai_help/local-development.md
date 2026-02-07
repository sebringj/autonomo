# Local Development Setup

## Why This Matters for AI Testing

Third-party services (auth, payments, notifications) are the #1 blocker for AI-driven testing:

- **OTP codes** are random and sent to real phones
- **OAuth flows** redirect to external sites AI can't control
- **Payment processing** requires real credentials
- **Push notifications** need device tokens
- **Email verification** waits for real emails

**Solution**: Use local emulators + custom actions to make everything deterministic.

---

## 🔐 Authentication Bypass Strategies

### Strategy 1: Dev OTP Code (Recommended)

Configure your auth system to accept a fixed OTP in development:

```typescript
// Backend: auth service
async function verifyOtp(phone: string, code: string) {
  // In development, accept magic code
  if (process.env.NODE_ENV === 'development' && code === '111111') {
    return { valid: true };
  }
  
  // Production: verify with real provider
  return await twilioVerify(phone, code);
}
```

```typescript
// App: Register custom action
if (__DEV__) {
  autonomoRegisterCustomAction('devLogin', async (phone) => {
    await auth.sendOtp(phone);
    await auth.verifyOtp(phone, '111111'); // Magic code
  });
}
```

**Usage**:
```
autonomo_send_command(bridge="myapp", action="custom", target="devLogin", value="5551234567")
```

### Strategy 2: Supabase Local Auth

Supabase's local emulator supports auto-confirm:

```bash
# supabase/config.toml
[auth]
enable_signup = true
enable_anonymous_sign_ins = true

[auth.email]
enable_confirmations = false  # Skip email verification locally
```

```typescript
// Custom action using Supabase
autonomoRegisterCustomAction('devLogin', async (phone) => {
  const { data, error } = await supabase.auth.signInWithOtp({
    phone: `+1${phone}`,
  });
  
  // Local Supabase: auto-verify with any code
  if (__DEV__) {
    await supabase.auth.verifyOtp({
      phone: `+1${phone}`,
      token: '111111',
      type: 'sms'
    });
  }
});
```

### Strategy 3: Firebase Auth Emulator

```bash
# Start Firebase emulator
firebase emulators:start --only auth
```

```typescript
// Connect to emulator in dev
if (__DEV__) {
  import { connectAuthEmulator } from 'firebase/auth';
  connectAuthEmulator(auth, 'http://localhost:9099');
}

// Custom action - Firebase emulator accepts any verification code
autonomoRegisterCustomAction('devLogin', async (phone) => {
  const confirmationResult = await signInWithPhoneNumber(auth, phone);
  // Emulator accepts any 6-digit code
  await confirmationResult.confirm('123456');
});
```

### Strategy 4: Auth0 Test Users

Auth0 allows test users that bypass normal flows:

```typescript
// Create test user via Management API (one-time setup)
// Then use direct token endpoint

autonomoRegisterCustomAction('devLogin', async (email) => {
  const response = await fetch(`${AUTH0_DOMAIN}/oauth/token`, {
    method: 'POST',
    body: JSON.stringify({
      grant_type: 'password',
      username: email,
      password: process.env.TEST_USER_PASSWORD,
      client_id: process.env.AUTH0_CLIENT_ID,
      client_secret: process.env.AUTH0_CLIENT_SECRET,
    })
  });
  const { access_token } = await response.json();
  await setAuthToken(access_token);
});
```

### Strategy 5: Clerk Dev Mode

Clerk provides development-friendly testing:

```typescript
// clerk.dev has test mode with predictable behavior
if (__DEV__) {
  autonomoRegisterCustomAction('devLogin', async (identifier) => {
    // Use Clerk's test user feature
    await clerk.signIn.create({
      identifier,
      strategy: 'password',
      password: 'test-password-123'
    });
  });
}
```

---

## 💳 Payment Testing

### Stripe CLI (Highly Recommended)

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

**Test Cards** (always work with Stripe):
| Card Number | Scenario |
|-------------|----------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 3220` | 3D Secure required |
| `4000 0000 0000 9995` | Declined (insufficient funds) |
| `4000 0000 0000 0002` | Declined (generic) |

```typescript
// Custom action for instant checkout
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

### PayPal Sandbox

```bash
# Use sandbox credentials from developer.paypal.com
PAYPAL_CLIENT_ID=sandbox_client_id
PAYPAL_CLIENT_SECRET=sandbox_secret
PAYPAL_MODE=sandbox
```

Test accounts are created in the PayPal Developer Dashboard with fake balances.

### Square Sandbox

```bash
# Square provides sandbox environment
SQUARE_ACCESS_TOKEN=sandbox-token
SQUARE_ENVIRONMENT=sandbox
```

Test card: `4532 0000 0000 0000` (Visa)

---

## 📧 Email Testing

### Mailhog (Local SMTP)

```bash
# Run Mailhog
docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog

# Configure app
SMTP_HOST=localhost
SMTP_PORT=1025
```

View emails at `http://localhost:8025`

```typescript
// Custom action to get verification link
autonomoRegisterCustomAction('getVerificationLink', async (email) => {
  // Fetch from Mailhog API
  const response = await fetch('http://localhost:8025/api/v2/messages');
  const messages = await response.json();
  const latest = messages.items.find(m => m.To[0].Mailbox === email.split('@')[0]);
  // Parse verification link from email body
  const link = extractLink(latest.Content.Body);
  return { link };
});
```

### Mailtrap

```bash
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_mailtrap_user
SMTP_PASS=your_mailtrap_pass
```

### Resend (Dev Mode)

Resend allows sending to your own domain in dev mode without verification.

---

## 📱 Push Notifications

### Expo Push Notifications (Local)

```typescript
// Expo provides local testing tools
import * as Notifications from 'expo-notifications';

// Custom action to simulate push
autonomoRegisterCustomAction('simulatePush', async (payload) => {
  await Notifications.scheduleNotificationAsync({
    content: JSON.parse(payload),
    trigger: null, // Immediate
  });
});
```

### Firebase FCM Emulator

```bash
firebase emulators:start --only functions
```

### OneSignal Testing

OneSignal provides test users and a testing API.

---

## 🗄️ Database Emulators

### Supabase Local

```bash
# Start local Supabase
supabase start

# Access local services
# API: http://localhost:54321
# Studio: http://localhost:54323
# DB: postgresql://postgres:postgres@localhost:54322/postgres
```

```typescript
// Point app to local Supabase
const supabase = createClient(
  'http://localhost:54321',
  'your-local-anon-key'
);
```

### Firebase Emulator Suite

```bash
firebase emulators:start

# Services available:
# Auth: localhost:9099
# Firestore: localhost:8080
# Functions: localhost:5001
# Storage: localhost:9199
```

```typescript
import { connectFirestoreEmulator } from 'firebase/firestore';
import { connectStorageEmulator } from 'firebase/storage';

if (__DEV__) {
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectStorageEmulator(storage, 'localhost', 9199);
}
```

### PlanetScale (Local MySQL)

```bash
# Use local MySQL with PlanetScale-compatible schema
docker run -d -p 3306:3306 -e MYSQL_ROOT_PASSWORD=root mysql:8
```

### MongoDB Local

```bash
docker run -d -p 27017:27017 mongo:latest
```

---

## 🔔 Real-Time / WebSockets

### Supabase Realtime (Local)

Included with `supabase start` - works out of the box.

### Pusher (Local Alternative: Soketi)

```bash
# Soketi is a Pusher-compatible server
docker run -d -p 6001:6001 quay.io/soketi/soketi:latest
```

```typescript
// Point Pusher client to local Soketi
const pusher = new Pusher('app-key', {
  wsHost: 'localhost',
  wsPort: 6001,
  forceTLS: false,
  cluster: 'local'
});
```

### Ably (Sandbox)

Ably provides free sandbox keys for development.

---

## 🗺️ Maps & Location

### Google Maps (No Emulator Needed)

Use API keys with localhost allowed in the console.

### Mapbox

Generous free tier works in development.

### Mock Location (React Native)

```typescript
// Custom action to set mock location
autonomoRegisterCustomAction('setLocation', async (coords) => {
  const { latitude, longitude } = JSON.parse(coords);
  // Expo Location supports mock locations in dev
  await Location.setMockLocationAsync({ latitude, longitude });
});
```

---

## 📸 File Storage

### Supabase Storage (Local)

Included with `supabase start`.

### MinIO (S3-Compatible)

```bash
docker run -d -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"
```

```typescript
// Point AWS SDK to MinIO
const s3 = new S3Client({
  endpoint: 'http://localhost:9000',
  credentials: {
    accessKeyId: 'minioadmin',
    secretAccessKey: 'minioadmin',
  },
  forcePathStyle: true,
});
```

### Cloudflare R2 (Local with Wrangler)

```bash
wrangler r2 bucket create my-bucket --local
```

---

## ☁️ AWS Local Emulators

### LocalStack (Comprehensive AWS Emulator) ⭐

LocalStack emulates 80+ AWS services locally — **free tier available**:

```bash
# Install and run
pip install localstack
localstack start

# Or with Docker
docker run -d -p 4566:4566 localstack/localstack
```

**Free tier services** (no Pro license needed):
- S3, SQS, SNS, Lambda, DynamoDB, IAM, CloudWatch, Secrets Manager, SSM, STS, API Gateway, CloudFormation, EC2 (basic), Route53, ACM

```typescript
// Configure AWS SDK to use LocalStack
import { S3Client } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  endpoint: 'http://localhost:4566',
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test',
  },
  forcePathStyle: true,
});
```

```bash
# AWS CLI with LocalStack
aws --endpoint-url=http://localhost:4566 s3 mb s3://my-bucket
aws --endpoint-url=http://localhost:4566 sqs create-queue --queue-name my-queue
aws --endpoint-url=http://localhost:4566 dynamodb create-table ...
```

**Custom action for S3 testing**:
```typescript
autonomoRegisterCustomAction('uploadToS3', async (params) => {
  const { bucket, key, content } = JSON.parse(params);
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: content,
  }));
  return { success: true, url: `http://localhost:4566/${bucket}/${key}` };
});
```

### DynamoDB Local

AWS provides an official local DynamoDB:

```bash
# Docker
docker run -d -p 8000:8000 amazon/dynamodb-local

# Or download JAR
java -Djava.library.path=./DynamoDBLocal_lib -jar DynamoDBLocal.jar -sharedDb
```

```typescript
const dynamodb = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'local',
  credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
});
```

### AWS SAM Local (Lambda)

```bash
# Install SAM CLI
brew install aws-sam-cli

# Invoke Lambda locally
sam local invoke MyFunction --event event.json

# Start local API Gateway
sam local start-api
```

### Moto (Python AWS Mock)

For Python projects, Moto mocks AWS services in-memory:

```python
import boto3
from moto import mock_aws

@mock_aws
def test_s3_upload():
    s3 = boto3.client('s3', region_name='us-east-1')
    s3.create_bucket(Bucket='my-bucket')
    s3.put_object(Bucket='my-bucket', Key='test.txt', Body='hello')
```

---

## 🔷 Azure Local Emulators

### Azurite (Official Azure Storage Emulator) ⭐

Microsoft's official emulator for Blob, Queue, and Table storage:

```bash
# Install
npm install -g azurite

# Run all services
azurite --silent --location ./azurite-data --debug ./azurite-debug.log

# Or specific services
azurite-blob --blobPort 10000
azurite-queue --queuePort 10001
azurite-table --tablePort 10002
```

```bash
# Docker
docker run -d -p 10000:10000 -p 10001:10001 -p 10002:10002 \
  mcr.microsoft.com/azure-storage/azurite
```

```typescript
// Connection string for Azurite
const connectionString = 'DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;QueueEndpoint=http://127.0.0.1:10001/devstoreaccount1;TableEndpoint=http://127.0.0.1:10002/devstoreaccount1;';

import { BlobServiceClient } from '@azure/storage-blob';
const blobService = BlobServiceClient.fromConnectionString(connectionString);
```

### Azure Functions Core Tools

Run Azure Functions locally:

```bash
# Install
npm install -g azure-functions-core-tools@4

# Create and run
func init MyFunctionApp --worker-runtime node
func new --name MyHttpTrigger --template "HTTP trigger"
func start
```

### Azure Cosmos DB Emulator

```bash
# Docker (Linux)
docker run -d -p 8081:8081 -p 10251-10254:10251-10254 \
  mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator

# Windows has native installer
```

```typescript
const cosmosClient = new CosmosClient({
  endpoint: 'https://localhost:8081',
  key: 'C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==', // Default emulator key
});
```

### Azure Service Bus Emulator (Preview)

```bash
# Docker Compose (requires SQL Server)
# See: https://github.com/Azure/azure-service-bus-emulator
docker-compose up -d
```

### Azure Event Hubs Emulator (Preview)

```bash
# See: https://github.com/Azure/azure-event-hubs-emulator
docker-compose up -d
```

---

## 🌩️ Google Cloud Local Emulators

### Cloud SDK Emulators

GCP provides official emulators via `gcloud`:

```bash
# Install emulators
gcloud components install cloud-datastore-emulator
gcloud components install pubsub-emulator
gcloud components install bigtable-emulator
gcloud components install cloud-firestore-emulator

# Run Datastore
gcloud beta emulators datastore start --project=test-project

# Run Pub/Sub
gcloud beta emulators pubsub start --project=test-project

# Run Firestore
gcloud beta emulators firestore start --project=test-project
```

```bash
# Set environment for SDK to use emulator
$(gcloud beta emulators datastore env-init)
$(gcloud beta emulators pubsub env-init)
```

### Cloud Spanner Emulator

```bash
docker run -d -p 9010:9010 -p 9020:9020 \
  gcr.io/cloud-spanner-emulator/emulator
```

---

## 📊 Quick Reference: Cloud Emulators

| Cloud | Service | Local Emulator | Free? |
|-------|---------|----------------|-------|
| **AWS** | S3, SQS, Lambda, DynamoDB, etc. | LocalStack | ✅ Free tier |
| **AWS** | DynamoDB | DynamoDB Local | ✅ Free |
| **AWS** | Lambda | SAM Local | ✅ Free |
| **Azure** | Blob, Queue, Table Storage | Azurite | ✅ Free |
| **Azure** | Functions | Azure Functions Core Tools | ✅ Free |
| **Azure** | Cosmos DB | Cosmos DB Emulator | ✅ Free |
| **Azure** | Service Bus | Service Bus Emulator | ✅ Free (preview) |
| **GCP** | Datastore, Pub/Sub, Firestore | gcloud emulators | ✅ Free |
| **GCP** | Spanner | Spanner Emulator | ✅ Free |

---

## 🤖 AI / LLM Services

### Ollama (Local LLM)

```bash
# Run local LLM
ollama run llama2

# API compatible with OpenAI
curl http://localhost:11434/api/generate -d '{
  "model": "llama2",
  "prompt": "Hello!"
}'
```

### LM Studio

Run any GGUF model locally with OpenAI-compatible API.

### LocalAI

```bash
docker run -p 8080:8080 localai/localai
```

---

## 📊 Analytics

### PostHog (Self-Hosted)

```bash
docker run -d -p 8000:8000 posthog/posthog
```

### Plausible (Self-Hosted)

```bash
docker-compose up -d  # Using their docker-compose.yml
```

### Mixpanel (Dev Mode)

Mixpanel allows development projects with no data limits.

---

## 🛠️ Development Environment Checklist

```bash
# Typical local dev stack:
☐ supabase start           # Database + Auth + Storage + Realtime
☐ stripe listen ...        # Payment webhooks
☐ mailhog                  # Email capture
☐ ollama run llama2        # Local AI (optional)

# App configuration:
☐ .env.local with local URLs
☐ Custom actions registered for auth bypass
☐ Test data seeding scripts
☐ Mock location support (mobile)
```

---

## Quick Reference: Service → Local Alternative

| Service | Local Alternative | Notes |
|---------|-------------------|-------|
| **Supabase** | `supabase start` | Full local emulator |
| **Firebase** | `firebase emulators:start` | Auth, Firestore, Functions |
| **Stripe** | Stripe CLI + test cards | Webhooks via `stripe listen` |
| **Twilio** | Magic OTP code | Configure backend to accept `111111` |
| **SendGrid/Mailgun** | Mailhog | Local SMTP capture |
| **AWS S3** | MinIO | S3-compatible API |
| **Pusher** | Soketi | Pusher-compatible WebSocket |
| **OpenAI** | Ollama / LocalAI | Local LLM inference |
| **Auth0** | Test users + password grant | Or use Supabase Auth |
| **Clerk** | Dev mode + test users | Built-in dev features |

---

## Important: Dev-Only Code

**Always gate dev features**:

```typescript
// ✓ Good: Only in development
if (__DEV__ || process.env.NODE_ENV === 'development') {
  autonomoRegisterCustomAction('devLogin', devLoginHandler);
  autonomoRegisterCustomAction('seedData', seedDataHandler);
  autonomoRegisterCustomAction('clearData', clearDataHandler);
}

// ✗ Bad: Available in production
autonomoRegisterCustomAction('devLogin', devLoginHandler); // Security risk!
```

**Environment checks by platform**:

```typescript
// React Native
if (__DEV__) { ... }

// Node.js / Deno
if (process.env.NODE_ENV === 'development') { ... }

// Vite
if (import.meta.env.DEV) { ... }

// Next.js
if (process.env.NODE_ENV !== 'production') { ... }
```
