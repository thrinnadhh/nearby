# NearBy — Coding Conventions

> These rules exist so any team member (or AI assistant) can read any file and
> immediately understand what it does and how it fits. Consistency > personal preference.

---

## General Rules

- **Language:** JavaScript (Node.js backend), TypeScript (React Native apps, Admin dashboard)
- **Async:** Always `async/await`. Never `.then().catch()` chains.
- **Errors:** Always use try/catch. Never silent failures.
- **Logging:** Use `logger.js` (Winston). Never use `console.log` in production code.
- **Comments:** Comment the WHY, not the WHAT. Code explains what; comments explain why.
- **Line length:** 100 characters maximum.
- **Semicolons:** Always. No exceptions.
- **Quotes:** Single quotes everywhere except JSX attributes.
- **Trailing commas:** Always in multiline objects/arrays.

---

## Naming Conventions

### Files
```
routes/orders.js          ← Singular noun, lowercase
services/cashfree.js      ← The service it wraps
jobs/autoCancel.js        ← camelCase for job files
middleware/roleGuard.js   ← camelCase
utils/idempotency.js      ← camelCase
```

### Variables & Functions
```javascript
// Variables: camelCase
const orderTotal = calculateTotal(items);
const shopId = req.params.id;

// Constants: SCREAMING_SNAKE_CASE
const MAX_OTP_ATTEMPTS = 3;
const ORDER_ACCEPT_WINDOW_MS = 3 * 60 * 1000;

// Functions: camelCase, verb-first
async function createOrder(customerId, shopId, items) {}
async function sendOtpToPhone(phone) {}
async function findNearestDeliveryPartner(shopGeo) {}

// Boolean variables: is/has/can prefix
const isShopOpen = shop.is_open;
const hasValidOtp = await verifyOtp(phone, code);
const canCancelOrder = ['pending', 'accepted'].includes(order.status);
```

### React Native Components
```typescript
// PascalCase for components
function ShopCard({ shop, onPress }: ShopCardProps) {}
function OrderStatusBadge({ status }: Props) {}

// Component files: PascalCase
ShopCard.tsx
OrderStatusBadge.tsx
TrustBadge.tsx

// Screen files: PascalCase + Screen suffix
HomeScreen.tsx
ShopProfileScreen.tsx
OrderTrackingScreen.tsx
```

### Database / Supabase
```sql
-- Tables: snake_case, plural
shops, orders, order_items, shop_events

-- Columns: snake_case
shop_id, created_at, is_verified, trust_score

-- Indexes: descriptive
idx_shops_geo, idx_orders_customer_id, idx_products_shop_id
```

### API Endpoints
```
GET    /api/v1/shops/:id          ← Noun resources, no verbs
POST   /api/v1/shops              ← Create
PATCH  /api/v1/shops/:id          ← Partial update (not PUT)
DELETE /api/v1/products/:id       ← Soft delete
POST   /api/v1/orders/:id/accept  ← Actions as sub-resources
PATCH  /api/v1/shops/:id/toggle   ← State change as action
```

---

## Backend (Node.js) Patterns

### Route Handler Structure
```javascript
// routes/orders.js
router.post('/', authenticate, roleGuard(['customer']), async (req, res) => {
  try {
    // 1. Validate request body
    const { error, value } = createOrderSchema.validate(req.body);
    if (error) return res.status(400).json(errorResponse('VALIDATION_ERROR', error.message));

    // 2. Business logic (in service, not here)
    const order = await OrderService.create(req.user.id, value);

    // 3. Return success response
    res.status(201).json(successResponse(order));
  } catch (err) {
    // 4. Catch and forward
    logger.error('Failed to create order', { error: err.message, userId: req.user.id });
    next(err);
  }
});
```

### Service Layer Pattern
```javascript
// services/orders.js — All business logic lives here, not in routes
class OrderService {
  static async create(customerId, { shopId, items, deliveryAddress, paymentMode }) {
    // 1. Validate shop is open
    const shop = await ShopService.getById(shopId);
    if (!shop.is_open) throw new AppError('SHOP_CLOSED', 'Shop is currently closed');

    // 2. Calculate total server-side (NEVER trust client price)
    const { total, validatedItems } = await ProductService.validateAndPrice(items);

    // 3. Create with idempotency
    const idempotencyKey = uuidv4(); // Generated here, not from client
    const order = await supabase.from('orders').insert({ ... });

    // 4. Queue async jobs (non-blocking)
    await notifyShopQueue.add('notify', { orderId: order.id }, { delay: 0 });
    await autoCancelQueue.add('cancel', { orderId: order.id }, { delay: ORDER_ACCEPT_WINDOW_MS });

    return order;
  }
}
```

### Response Helpers
```javascript
// utils/response.js — Use these everywhere
const successResponse = (data, meta = {}) => ({ success: true, data, meta });
const errorResponse = (code, message) => ({ success: false, error: { code, message } });

// In routes:
res.json(successResponse({ order }));
res.status(404).json(errorResponse('ORDER_NOT_FOUND', 'Order does not exist'));
```

### Error Codes (Complete List)
```
AUTH:         INVALID_OTP, OTP_EXPIRED, OTP_LOCKED, INVALID_TOKEN, TOKEN_EXPIRED
SHOP:         SHOP_NOT_FOUND, SHOP_NOT_VERIFIED, SHOP_CLOSED, SHOP_NOT_OWNER
PRODUCT:      PRODUCT_NOT_FOUND, PRODUCT_OUT_OF_STOCK, INSUFFICIENT_STOCK
ORDER:        ORDER_NOT_FOUND, ORDER_NOT_CANCELLABLE, ORDER_ACCEPT_EXPIRED, DUPLICATE_ORDER
PAYMENT:      PAYMENT_FAILED, PAYMENT_ALREADY_PROCESSED, INVALID_WEBHOOK_SIGNATURE
DELIVERY:     NO_PARTNER_AVAILABLE, INVALID_OTP, PARTNER_NOT_FOUND
VALIDATION:   VALIDATION_ERROR, MISSING_FIELD, INVALID_FORMAT
SYSTEM:       UNAUTHORIZED, FORBIDDEN, NOT_FOUND, RATE_LIMITED, INTERNAL_ERROR
```

### BullMQ Job Pattern
```javascript
// jobs/autoCancel.js
import { Queue, Worker } from 'bullmq';
import { redis } from '../services/redis.js';

export const autoCancelQueue = new Queue('auto-cancel', { connection: redis });

// Worker (in index.js startup)
const autoCancelWorker = new Worker('auto-cancel', async (job) => {
  const { orderId } = job.data;
  logger.info('Running auto-cancel job', { orderId });

  const order = await OrderService.getById(orderId);
  if (order.status !== 'pending') return; // Already handled

  await OrderService.autoCancel(orderId);
  logger.info('Order auto-cancelled', { orderId });
}, { connection: redis });

autoCancelWorker.on('failed', (job, err) => {
  logger.error('Auto-cancel job failed', { jobId: job?.id, error: err.message });
});
```

---

## React Native Patterns

### Screen Structure
```typescript
// screens/OrderTrackingScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useOrder } from '../hooks/useOrder';
import { useSocket } from '../hooks/useSocket';
import { TrackingMap } from '../components/TrackingMap';
import { OrderTimeline } from '../components/OrderTimeline';

interface Props {
  orderId: string;
}

export default function OrderTrackingScreen({ orderId }: Props) {
  const { order, isLoading, error } = useOrder(orderId);
  const { location, eta } = useSocket(orderId);

  if (isLoading) return <LoadingScreen />;
  if (error) return <ErrorScreen error={error} />;
  if (!order) return <EmptyScreen message="Order not found" />;

  return (
    <View style={styles.container}>
      <TrackingMap location={location} destination={order.deliveryGeo} />
      <OrderTimeline order={order} eta={eta} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
});
```

### Custom Hook Pattern
```typescript
// hooks/useOrder.ts
import { useState, useEffect } from 'react';
import { api } from '../services/api';

export function useOrder(orderId: string) {
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetch() {
      try {
        const data = await api.getOrder(orderId);
        if (!cancelled) setOrder(data);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    fetch();
    return () => { cancelled = true; };
  }, [orderId]);

  return { order, isLoading, error };
}
```

### API Service Pattern
```typescript
// services/api.ts — Central API client
const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

async function request(endpoint: string, options: RequestInit = {}) {
  const token = await getStoredToken();
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      ...options.headers,
    },
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error.message);
  return data.data;
}

export const api = {
  getOrder: (id: string) => request(`/orders/${id}`),
  createOrder: (body: CreateOrderBody) => request('/orders', { method: 'POST', body: JSON.stringify(body) }),
  // ... all endpoints
};
```

---

## State Management (Zustand)

```typescript
// store/cartStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartItem { productId: string; name: string; price: number; qty: number; }

interface CartStore {
  shopId: string | null;
  items: CartItem[];
  addItem: (shopId: string, item: CartItem) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  total: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      shopId: null,
      items: [],
      addItem: (shopId, item) => {
        // Enforce same-shop cart
        if (get().shopId && get().shopId !== shopId) {
          throw new Error('DIFFERENT_SHOP'); // UI handles this
        }
        set((state) => ({
          shopId,
          items: [...state.items.filter(i => i.productId !== item.productId), item],
        }));
      },
      removeItem: (productId) =>
        set((state) => ({ items: state.items.filter(i => i.productId !== productId) })),
      clearCart: () => set({ shopId: null, items: [] }),
      total: () => get().items.reduce((sum, i) => sum + i.price * i.qty, 0),
    }),
    { name: 'nearby-cart' } // Persisted to AsyncStorage
  )
);
```

---

## Git Commit Format

```
type(scope): short description (50 chars max)

[optional body — explain WHY, not WHAT]

[optional footer — issue references]
```

### Types
```
feat     — New feature
fix      — Bug fix
docs     — Documentation only
refactor — Code change that doesn't add feature or fix bug
test     — Adding or fixing tests
chore    — Build process, dependencies, tooling
perf     — Performance improvement
security — Security fix
```

### Examples
```
feat(orders): add 3-minute auto-cancel with Cashfree refund

The auto-cancel job uses BullMQ delayed job. Refund is triggered
only for UPI/card orders — COD orders simply get cancelled.
Fixes the edge case where shop goes offline without responding.

Closes #47

---

fix(auth): prevent OTP brute force after role change

Redis lockout key was being cleared on role update.
Added explicit check that lockout persists regardless of
profile changes.

---

security(payments): add HMAC verification to Cashfree webhook

Without HMAC verification, any HTTP client could trigger
payment confirmation. Now validates Cashfree-Signature header
before any order status update.
```

---

## Pull Request Requirements

Every PR must have:
1. **Title** following commit convention above
2. **Description** explaining what and why
3. **Testing** section — how was this tested?
4. **Screenshots** (for UI changes)
5. **Checklist** (see `.github/PULL_REQUEST_TEMPLATE.md`)

PRs cannot be merged if:
- CI tests fail
- No tests written for new business logic
- Security-critical code (payments, auth) has no review
- `.env` or secrets committed accidentally

---

## Testing Requirements

```
Unit tests:       All service methods, utility functions, job handlers
Integration tests:Full flow tests (place order → accept → deliver → review)
API tests:        All endpoints via Supertest
Test file naming: orders.test.js (alongside the file it tests)
Coverage target:  70% minimum on backend services
```

```javascript
// Example test structure
describe('OrderService.create', () => {
  it('should calculate price server-side regardless of client input', async () => {
    // Test that even if client sends wrong price, server uses DB price
  });

  it('should queue auto-cancel job after creation', async () => {
    // Test BullMQ job was added with correct delay
  });

  it('should reject if shop is closed', async () => {
    // Test SHOP_CLOSED error
  });

  it('should handle duplicate idempotency key gracefully', async () => {
    // Test idempotent order creation
  });
});
```

---

## Security Checklist (Check Before Every PR)

- [ ] No secrets or API keys in code (use `process.env.*`)
- [ ] Cashfree webhook verifies HMAC signature
- [ ] Order total calculated from DB, not from request body
- [ ] JWT verified before accessing protected resources
- [ ] Role checked with `roleGuard` middleware
- [ ] Supabase RLS not bypassed (only service role key on server)
- [ ] Rate limiting applied to OTP and order endpoints
- [ ] Input validated with Joi before any DB operation
- [ ] File uploads validated for type and size
- [ ] R2 private bucket URLs use signed URLs (not public access)

---

*Last updated: March 2026*
