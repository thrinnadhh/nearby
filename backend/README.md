# NearBy Backend API

Production-ready Node.js/Express API server for the NearBy hyperlocal commerce platform.

## Quick Start

### Prerequisites

- Node.js 20+
- npm or yarn
- Docker (optional, for services)

### Installation

```bash
cd backend
npm install
```

### Environment Setup

Copy `.env.example` to `.env` and fill in all required variables:

```bash
cp ../.env.example .env
```

Required variables:
- `JWT_SECRET` — Server-side JWT signing key
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` — Database access
- `REDIS_URL` — Cache and queue broker
- `CASHFREE_WEBHOOK_SECRET` — Payment security
- All other service API keys (Typesense, R2, MSG91, Firebase, Ola Maps)

### Running Locally

Development mode with hot reload:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

Server starts on `http://localhost:3000`

### Health Checks

- **Health:** `GET /health` — Basic server status
- **Readiness:** `GET /readiness` — All services health (database, cache, search)

```bash
curl http://localhost:3000/health
curl http://localhost:3000/readiness
```

## API Routes

All routes are under `/api/v1/` prefix:

```
POST   /api/v1/auth/otp/send          — Send OTP to phone
POST   /api/v1/auth/otp/verify        — Verify OTP and get JWT
POST   /api/v1/auth/refresh           — Refresh JWT token

GET    /api/v1/shops/:id              — Get shop details
POST   /api/v1/shops                  — Create shop (shop_owner only)
PATCH  /api/v1/shops/:id              — Update shop
DELETE /api/v1/shops/:id              — Delete shop

GET    /api/v1/products/:id           — Get product details
POST   /api/v1/products               — Create product (shop_owner only)
PATCH  /api/v1/products/:id           — Update product
DELETE /api/v1/products/:id           — Delete product

GET    /api/v1/orders/:id             — Get order details
POST   /api/v1/orders                 — Create order (customer only)
PATCH  /api/v1/orders/:id/accept      — Accept order (shop_owner only)
PATCH  /api/v1/orders/:id/cancel      — Cancel order

POST   /api/v1/payments/webhook       — Cashfree payment webhook

GET    /api/v1/search/shops           — Search shops
GET    /api/v1/search/products        — Search products

GET    /api/v1/delivery/assignments   — Get delivery assignments (delivery only)

POST   /api/v1/reviews                — Create review (customer only)
GET    /api/v1/reviews/:orderId       — Get order reviews

GET    /api/v1/admin/kyc              — List KYC applications
PATCH  /api/v1/admin/kyc/:id/approve  — Approve KYC
PATCH  /api/v1/admin/kyc/:id/reject   — Reject KYC
```

See `docs/API.md` for complete endpoint reference.

## Architecture

### Directory Structure

```
src/
├── index.js                    — Server bootstrap + Socket.IO
├── middleware/                 — Express middleware
│   ├── auth.js                 — JWT authentication
│   ├── roleGuard.js            — Role-based access control
│   ├── validate.js             — Joi schema validation
│   ├── rateLimit.js            — Rate limiting
│   └── errorHandler.js         — Global error handler
├── routes/                     — API endpoints (one file per domain)
├── services/                   — Third-party service clients
│   ├── supabase.js             — PostgreSQL database
│   ├── redis.js                — Cache + queues
│   ├── typesense.js            — Search engine
│   ├── r2.js                   — Cloudflare R2 (file storage)
│   ├── cashfree.js             — Payment processor
│   ├── msg91.js                — SMS/OTP provider
│   ├── fcm.js                  — Push notifications
│   └── olaMaps.js              — Maps + geocoding
├── socket/                     — Socket.IO handlers
├── jobs/                       — BullMQ async job handlers
├── utils/                      — Utilities
│   ├── errors.js               — Error codes + AppError class
│   ├── response.js             — Response format helpers
│   ├── logger.js               — Winston logger
│   ├── idempotency.js          — Duplicate request prevention
│   └── ...
└── __tests__/                  — Test suites
    ├── unit/                   — Unit tests
    └── integration/            — Integration tests
```

### Authentication Flow

1. User calls `POST /api/v1/auth/otp/send` with phone
2. Backend generates 6-digit OTP, stores in Redis (TTL: 5 min)
3. OTP sent via MSG91 SMS
4. User calls `POST /api/v1/auth/otp/verify` with OTP
5. Backend verifies OTP against Redis, deletes from Redis
6. JWT token generated: `{ userId, phone, role, shopId? }`
7. User includes JWT in all subsequent requests: `Authorization: Bearer {token}`

### Authorization

Every protected route checks:

1. **Authenticate middleware** — Verifies JWT is valid
2. **Role guard middleware** — Checks user role is allowed

Example:

```javascript
router.post('/', authenticate, roleGuard(['customer']), async (req, res) => {
  const user = req.user; // { userId, phone, role, shopId? }
  // ...
});
```

Roles: `customer`, `shop_owner`, `delivery`, `admin`

### Error Handling

All errors follow the standard format:

```json
{
  "success": false,
  "error": {
    "code": "ORDER_NOT_FOUND",
    "message": "Order does not exist",
    "details": { "orderId": "abc123" }
  }
}
```

Error codes are in `SCREAMING_SNAKE_CASE` and defined in `src/utils/errors.js`.

### Response Format

Success responses:

```json
{
  "success": true,
  "data": { "orderId": "abc123", "total": 50000 },
  "meta": { "page": 1, "total": 100, "limit": 10 }
}
```

## Services

### Supabase (PostgreSQL + PostGIS)

Database client initialized in `src/services/supabase.js`:

```javascript
import { supabase } from '../services/supabase.js';

const { data, error } = await supabase
  .from('orders')
  .select('*')
  .eq('id', orderId)
  .single();
```

### Redis

Cache and queue broker for async jobs:

```javascript
import { redis } from '../services/redis.js';

await redis.setex(`otp:${phone}`, 300, '123456');
const otp = await redis.get(`otp:${phone}`);
```

### BullMQ

Async job queue for notifications, analytics, etc.:

```javascript
import { Queue } from 'bullmq';
import { redis } from '../services/redis.js';

const notifyQueue = new Queue('notifications', { connection: redis });
await notifyQueue.add('notify', { orderId }, { delay: 1000 });
```

### Typesense

Full-text search with geo-location support:

```javascript
import { typesense } from '../services/typesense.js';

const results = await typesense
  .collections('shops')
  .documents()
  .search({
    q: 'pharmacy',
    query_by: 'name,description',
    filter_by: 'location:(9.9, 76.8, 5)',
  });
```

### Cloudflare R2

File storage for images and documents:

```javascript
import { uploadFile, getSignedFileUrl, deleteFile } from '../services/r2.js';

// Upload product image
await uploadFile('nearby-products', 'prod-123/main.jpg', buffer, {
  contentType: 'image/jpeg',
});

// Generate signed URL for KYC document (private bucket)
const url = await getSignedFileUrl('nearby-kyc', 'user-123/aadhar.pdf', 300);

// Delete file
await deleteFile('nearby-products', 'prod-123/main.jpg');
```

### Cashfree

Payment processing:

```javascript
import { createPaymentSession, refundPayment } from '../services/cashfree.js';

const session = await createPaymentSession({
  order_id: orderId,
  order_amount: 500,
  customer_details: { phone, email },
});

// Later, refund the order
await refundPayment(paymentId, 50000, 'item_unavailable');
```

### MSG91

SMS and OTP delivery:

```javascript
import { sendOtp, sendNotification } from '../services/msg91.js';

await sendOtp('+919876543210', '123456');
await sendNotification('+919876543210', 'Your order is ready for pickup!');
```

### Firebase FCM

Push notifications:

```javascript
import { sendMessage, sendHighPriorityNotification } from '../services/fcm.js';

await sendMessage(deviceToken, {
  title: 'Order Placed',
  body: 'Your order has been confirmed',
}, {
  orderId: 'abc123',
  action: 'order_placed',
});

// Critical notification (used by shops for new orders)
await sendHighPriorityNotification(shopToken, {
  title: 'New Order',
  body: 'You have a new order!',
});
```

### Ola Maps

Geocoding and routing:

```javascript
import { geocode, getDistanceMatrix, getRoute } from '../services/olaMaps.js';

const location = await geocode('123 Main St, Hyderabad');

const distances = await getDistanceMatrix(
  [{ lat: 9.9, lng: 76.8 }],
  [{ lat: 9.95, lng: 76.85 }]
);

const route = await getRoute(
  { lat: 9.9, lng: 76.8 },
  { lat: 9.95, lng: 76.85 },
  { mode: 'bike' }
);
```

## Testing

### Run All Tests

```bash
npm test
```

Runs all tests under `src/__tests__/` and generates coverage report.

### Run Specific Test File

```bash
npm test -- errors.test.js
```

### Watch Mode

```bash
npm test -- --watch
```

### Coverage Report

```bash
npm test -- --coverage
```

Test coverage must be ≥80% for all metrics (branches, functions, lines, statements).

### Writing Tests

Tests are colocated with their subjects:

```
src/
├── utils/
│   ├── errors.js
│   └── errors.test.js
├── middleware/
│   ├── auth.js
│   └── auth.test.js
└── __tests__/
    ├── unit/
    │   ├── errors.test.js
    │   └── logger.test.js
    └── integration/
        ├── server.test.js
        └── middleware.test.js
```

Use Jest for all tests:

```javascript
describe('OrderService.create', () => {
  it('should calculate total server-side', async () => {
    const order = await OrderService.create(customerId, {
      shopId: 'shop-123',
      items: [{ productId: 'p1', qty: 2 }],
    });

    expect(order.total).toBe(expectedTotal);
  });
});
```

## Logging

All logging uses Winston. Never use `console.log` in production code.

```javascript
import logger from '../utils/logger.js';

logger.info('User logged in', { userId: 'abc123', phone: '+919876543210' });
logger.warn('OTP rate limit exceeded', { phone, attempts: 4 });
logger.error('Payment failed', { error: err.message, orderId: 'abc123' });
logger.debug('Cache hit', { key: 'user:abc123' });
```

Log levels:
- `info` — Notable events (user login, order placed)
- `warn` — Unusual but not critical (rate limit, validation failure)
- `error` — Failure requiring attention (payment failed, DB error)
- `debug` — Low-level details (cache operations, request timing)

## Deployment

### Docker

```bash
cd backend
docker build -t nearby-backend .
docker run -p 3000:3000 --env-file .env nearby-backend
```

### Via docker-compose

From project root:

```bash
docker-compose up
```

This spins up:
- Backend API on port 3000
- PostgreSQL (Supabase emulator) on port 54321
- Redis on port 6379
- Typesense on port 8108

### Production Deployment

See `docs/DEPLOYMENT.md` for full guide including:
- Environment configuration
- Database migrations
- Service initialization
- Health check setup
- Monitoring configuration

## Security Checklist

Before deploying to production:

- [ ] All secrets in `.env`, never in code
- [ ] `JWT_SECRET` is strong (32+ chars)
- [ ] `CASHFREE_WEBHOOK_SECRET` verified on every webhook
- [ ] Rate limiting enabled on sensitive endpoints (OTP, login, payment)
- [ ] Input validation on all endpoints (Joi schemas)
- [ ] Order total calculated server-side, never from client
- [ ] RLS enabled on Supabase tables
- [ ] R2 private bucket uses signed URLs only
- [ ] FCM and MSG91 credentials never logged
- [ ] HTTPS enforced in production
- [ ] CORS configured properly (not `*`)
- [ ] Error messages don't leak sensitive data

## Common Tasks

### Add a New Route

1. Create file in `src/routes/yourfeature.js`
2. Import in `src/index.js`
3. Mount under `/api/v1/`:
   ```javascript
   app.use('/api/v1/yourfeature', yourfeatureRouter);
   ```

### Add a New Service

1. Create `src/services/yourservice.js`
2. Initialize client with error handling and logging
3. Export functions/client for use in routes

### Add a New Async Job

1. Create `src/jobs/yourjob.js` with Worker definition
2. Initialize worker in `src/index.js`
3. Queue job from route/service:
   ```javascript
   await yourQueue.add('task-name', { data }, { delay: 1000 });
   ```

### Add a New Database Migration

1. Create `supabase/migrations/NNN_description.sql`
2. Run migrations:
   ```bash
   supabase db push
   ```

## Troubleshooting

### Redis Connection Error

Check Redis is running:

```bash
redis-cli ping
# Should output: PONG
```

### Supabase Connection Error

Verify credentials in `.env`:
- `SUPABASE_URL` — Your project URL (e.g., `https://xxx.supabase.co`)
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (starts with `eyJ...`)

### Payment Webhook Not Triggering

1. Check `CASHFREE_WEBHOOK_SECRET` is correct
2. Verify webhook URL is publicly accessible
3. Check Cashfree dashboard for webhook logs
4. Ensure HMAC signature verification passes

### Search Results Empty

1. Verify Typesense is running: `curl http://localhost:8108/health`
2. Check if products are indexed:
   ```bash
   curl http://localhost:8108/collections/products/documents
   ```
3. Ensure products have `is_available: true`

## Contributing

See `docs/CODING_CONVENTIONS.md` for code style, commit format, and PR requirements.

## License

Proprietary — NearBy Technologies

---

**Last updated:** March 2026
**Version:** 1.0.0
