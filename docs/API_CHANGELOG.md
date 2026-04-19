# NearBy API Changelog

> Every breaking change, addition, or deprecation is recorded here.
> Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
> API versioned via URL prefix: `/api/v1/`, `/api/v2/` etc.

---

## [Sprint 12.5] - 2026-04-19

### Product Availability Toggle

**Modified:**

#### PATCH /api/v1/products/:productId
- Auth: Bearer JWT (`shop_owner` role)
- Authorization: Shop owner can only toggle their own products
- Request: `{ is_available: boolean }` (optional — price, stock_quantity also accepted)
- Validation: is_available must be true or false (Joi boolean)
- Behavior:
  - Toggles product availability without affecting price or stock_quantity
  - Updates only the is_available field in products table
  - Triggers Typesense index update (async, queued via BullMQ)
  - Optimistic UI updates supported (client updates immediately, rollback on error)
  - Audit logged for all availability changes
  - Out-of-stock products hidden from search within 15 seconds
- Response: 200 with `{ id, name, price, stockQuantity, isAvailable, updatedAt }`
- Error codes: VALIDATION_ERROR (400), PRODUCT_NOT_FOUND (404), FORBIDDEN (403), UNAUTHORIZED (401), INTERNAL_ERROR (500)
- Rate limit: **10 requests/minute per shop owner** (strictLimiter middleware)
- Notes:
  - Supports 3-attempt retry with exponential backoff on network errors (500ms→1s→2s)
  - Product must exist and not be soft-deleted
  - Concurrent edits: last write wins (server-side last update persists)
  - Backward compatible (is_available is optional field in PATCH request)

---

## [Sprint 12.6] - 2026-04-19

### Low Stock Alert Endpoint

**Added:**

#### GET /api/v1/shops/:shopId/products/low-stock
- Auth: Bearer JWT (`shop_owner` role)
- Authorization: Shop owner can only view their own shop's products
- Query Parameters:
  - `threshold` (optional, default=5): integer 1–999 — stock quantity threshold to alert on
  - `page` (optional, default=1): integer ≥1 — pagination page number
  - `limit` (optional, default=20): integer 1–100 — items per page
  - `sortBy` (optional, default='stock'): enum ['stock', 'name', 'updated_at'] — sort order
    - `stock`: ascending (lowest stock first)
    - `name`: alphabetical A-Z
    - `updated_at`: descending (most recently updated first)
- Validation:
  - threshold must be integer 1–999 (400 error: INVALID_THRESHOLD)
  - page must be ≥1 (400 error: INVALID_PAGE)
  - limit must be 1–100, clamped silently to max 100 (400 error: INVALID_LIMIT if <1)
  - sortBy must be one of: stock, name, updated_at (400 error: INVALID_SORT_BY)
- Behavior:
  - Returns products where `stock_quantity < threshold`
  - Excludes soft-deleted products (deleted_at IS NULL)
  - Applies ownership guard: returns only products from authorized shop
  - Pagination offset calculated as `(page - 1) * limit`
- Response: 200 with:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "uuid",
        "shopId": "uuid",
        "name": "string",
        "category": "string",
        "stockQuantity": integer,
        "threshold": integer,
        "imageUrl": "string (CDN URL)",
        "thumbnailUrl": "string (CDN URL)",
        "isAvailable": boolean,
        "updatedAt": "ISO 8601 timestamp"
      }
    ],
    "meta": {
      "page": integer,
      "limit": integer,
      "total": integer (count of items below threshold),
      "pages": integer (ceil(total / limit)),
      "threshold": integer (query param echoed back),
      "lowStockCount": integer (same as total)
    }
  }
  ```
- Error codes:
  - `SHOP_NOT_FOUND` (404) — Shop doesn't exist
  - `INVALID_THRESHOLD` (400) — Threshold not 1–999
  - `INVALID_PAGE` (400) — Page <1
  - `INVALID_LIMIT` (400) — Limit <1 or >100
  - `INVALID_SORT_BY` (400) — sortBy not in enum
  - `UNAUTHORIZED` (401) — Missing or invalid JWT
  - `FORBIDDEN` (403) — User doesn't own the shop
  - `INTERNAL_ERROR` (500) — Database or server error
- Rate limit: **10 requests/minute per shop owner** (strictLimiter middleware)
- Notes:
  - Frontend: useLowStockAlerts hook handles fetch, refresh, pagination, sorting
  - Components: LowStockAlertItem (product card), LowStockEmptyState (empty/error states)
  - Dismissal preferences stored client-side in AsyncStorage (not synced to backend)
  - Pull-to-refresh resets pagination to page=1 and clears dismissals
  - No N+1 queries: single count query + single paginated fetch query
  - Response metadata includes `lowStockCount` (same as `total`) for compatibility

---

## [Sprint 12.5] - 2026-04-19

### Product Availability Toggle

**Modified:**

#### PATCH /api/v1/products/:productId

### Reviews, Chat, Trust Score, Analytics & Earnings Module

**Added:**

#### POST /api/v1/reviews
- Auth: Bearer JWT (`customer` role)
- Request: `{ order_id: uuid, rating: 1-5, comment: string (optional) }`
- Validation: order_id UUID v4, rating integer 1–5, comment max 500 chars
- Authorization: Customer can only review their own delivered orders
- Behavior:
  - Validates order exists and status is `delivered`
  - Checks no prior review exists for this order (prevents duplicates)
  - Inserts review with is_visible=true
  - Enqueues async Typesense sync for shop trust_score index update
- Response: 201 with `{ id, orderId, customerId, shopId, rating, comment, isVisible, createdAt }`
- Error codes: VALIDATION_ERROR (400), ORDER_NOT_FOUND (404), ORDER_NOT_DELIVERED (400), REVIEW_ALREADY_EXISTS (409), UNAUTHORIZED (401)
- Rate limit: 10 requests/minute per user

#### GET /api/v1/reviews/:shopId/reviews
- Auth: Public
- Query: `page=1&limit=20` (optional pagination)
- Behavior:
  - Fetches reviews for shop, filtered is_visible=true
  - Ordered by created_at DESC (most recent first)
  - Includes pagination metadata
- Response: 200 with `{ data: [reviews], meta: { page, total, pages } }`
- Error codes: VALIDATION_ERROR (400), INTERNAL_ERROR (500)
- Rate limit: 30 requests/minute per IP

#### GET /api/v1/reviews/:shopId/review-stats
- Auth: Public
- Behavior:
  - Aggregates visible reviews for shop
  - Computes avgRating, reviewCount, and distribution (5-star, 4-star, etc.)
- Response: 200 with `{ avgRating, reviewCount, distribution: { 5: count, 4: count, ... } }`
- Error codes: INTERNAL_ERROR (500)
- Rate limit: 30 requests/minute per IP

#### Socket.IO: shop:{shopId}:chat
- Auth: Socket.IO connection must carry valid JWT
- Behavior:
  - Real-time messaging between customer and shop owner
  - Messages persisted to `messages` table (sender_type: 'customer' or 'shop')
  - New message emits `chat:message` event to room
  - Enqueues async notification to recipient via FCM
- Message Payload: `{ id, shopId, customerId, senderType, body, isRead, createdAt }`
- Security: Role-based room access, message persistence with sender validation

#### POST /api/v1/delivery/:id/rating
- Auth: Bearer JWT (`customer` role)
- Request: `{ order_id: uuid, rating: 1-5, comment: string (optional) }`
- Behavior:
  - Customer rates delivery partner after delivery_partner_id is set
  - Stores in delivery_ratings table
  - Updates delivery partner's avg_rating in profiles table
- Response: 201 with rating object
- Error codes: VALIDATION_ERROR (400), ORDER_NOT_FOUND (404), UNAUTHORIZED (401)
- Rate limit: 5 requests/minute per user

#### POST /api/v1/delivery/:id/otp
- Auth: Bearer JWT (`customer` role)
- Behavior:
  - Generates 4-digit OTP when delivery partner is at pickup location
  - Stores OTP in order.delivery_otp field
  - Sends SMS to customer via MSG91 (async, non-blocking)
- Response: 200 with `{ otp: '****', expiresAt }`
- Error codes: ORDER_NOT_FOUND (404), UNAUTHORIZED (401)
- Rate limit: 5 requests/minute per user

#### GET /api/v1/shops/:id/analytics
- Auth: Bearer JWT (`shop_owner` role)
- Authorization: Owner can only view their own shop analytics
- Query: `period=7d|30d|90d` (optional, default 7d)
- Behavior:
  - Fetches daily aggregated metrics from shop_analytics_daily table
  - Returns revenue, completion_rate, response_time, order_count by day
  - Computed nightly via BullMQ analyticsAggregate job
- Response: 200 with `{ period, startDate, endDate, data: [{ date, revenue, completionRate, responseTime, orderCount }] }`
- Error codes: SHOP_NOT_FOUND (404), FORBIDDEN (403), UNAUTHORIZED (401)
- Rate limit: 30 requests/minute per user

#### GET /api/v1/shops/:id/earnings
- Auth: Bearer JWT (`shop_owner` role)
- Authorization: Owner can only view their own shop earnings
- Behavior:
  - Fetches settlement records and weekly earnings summary
  - Returns daily breakdown + settlement history
  - Computed nightly via BullMQ earningsSummary job
- Response: 200 with `{ daily: [{ date, amount, orderCount }], settlements: [{ date, amount, status, utrNumber }] }`
- Error codes: SHOP_NOT_FOUND (404), FORBIDDEN (403), UNAUTHORIZED (401)
- Rate limit: 30 requests/minute per user

#### POST /api/v1/payments/refund
- Auth: Bearer JWT (internal service use, `admin` role, or triggered via order state machine)
- Request: `{ order_id: uuid, reason: string (optional) }`
- Behavior:
  - Calls Cashfree refund API with order.cashfree_order_id
  - Stores refund_id and refund_status in orders table
  - Idempotent: same order_id returns same refund result
  - Only refunds non-COD orders (COD refunds are handled separately)
- Response: 200 with `{ orderId, refundId, refundStatus, refundAmount, timestamp }`
- Error codes: ORDER_NOT_FOUND (404), PAYMENT_NOT_REFUNDABLE (400), INTERNAL_ERROR (500)
- Rate limit: 30 requests/minute per user

#### GET /api/v1/payments/reconcile
- Auth: Public endpoint (runs via scheduled BullMQ job every 15 minutes)
- Behavior:
  - Queries orders with payment_status='pending' and created > 15min ago
  - Calls Cashfree gateway for status on each order.cashfree_order_id
  - Updates order.payment_status if gateway shows PAID/FAILED
  - Logs reconciliation results (count matched, count failed, errors)
- Response: 200 with `{ reconciled, matched, failed, errors: [...] }`
- Error codes: INTERNAL_ERROR (500)

#### POST /api/v1/payments/settlement
- Auth: Bearer JWT (internal, triggered weekly Monday 9 AM IST via BullMQ)
- Behavior:
  - Aggregates shop's paid orders from past week
  - Calls Cashfree Split settlement API to disburse to shop's bank account
  - Stores settlement_id and settlement_status in settlements table
  - T+1 processing: settlement initiates next business day
- Response: 200 with `{ shopId, settlementId, settlementStatus, amount, scheduledDate }`
- Error codes: INTERNAL_ERROR (500)

#### BullMQ: trustScore (nightly job, 2 AM IST)
- Fetches all verified shops (kyc_status='approved')
- For each shop, computes trust score:
  - avg_rating: average of all reviews (1-5)
  - completion_rate: count(delivered orders) / count(total orders)
  - response_score: shops that respond within 3min get +10 points (capped 100)
  - kyc_bonus: +10 for kyc_verified_at is not null
  - Formula: (avg_rating × 0.40) + (completion_rate × 0.35) + (response_score × 0.15) + (kyc_bonus × 0.10)
- Badges: Trusted (80–100), Good (60–79), New (40–59), Review (<40)
- Below 40: emits admin FCM alert + sends FCM warning to shop
- Updates shops.trust_score and shops.trust_badge
- Enqueues Typesense sync for search ranking

#### BullMQ: analyticsAggregate (nightly job, 3 AM IST)
- Aggregates daily metrics per shop:
  - revenue_paise: sum of delivered orders' total_paise
  - completion_rate: count(delivered) / count(all)
  - response_time_avg: average time from order created to shop accepted
  - order_count: count of orders created that day
- Inserts into shop_analytics_daily table with date, shop_id, and above metrics
- Retention: 90 days (older records deleted)

#### BullMQ: earningsSummary (weekly job, Monday 9 AM IST)
- Fetches all shops
- For each, calculates weekly earnings:
  - Sums revenue from delivered orders in past 7 days
  - Includes settlement history (T+1 disbursements)
  - Calculates weekly totals and running balance
- Stores in shop_earnings_summary table
- Accessible via GET /shops/:id/earnings endpoint

#### BullMQ: reviewPrompt (delayed job, 2 min after delivery)
- Triggered when order status transitions to `delivered`
- Sends FCM to customer: "How was your order? Leave a review to help [shop name]."
- Deep-link to review creation screen in customer app

**Security Notes:**
- Trust score excludes shops below KYC approval threshold (kyc_status !== 'approved')
- Reviews are moderated (is_visible field allows content moderation)
- Chat messages are sender-validated before persisting
- All settlement APIs use Cashfree webhook confirmation (not just API response)

**Database Changes:**
- reviews table: id, order_id, customer_id, shop_id, rating (1–5), comment, is_visible, created_at
- messages table: id, shop_id, customer_id, sender_type (enum: customer|shop), body, is_read, created_at
- delivery_ratings table: id, delivery_id, customer_id, rating (1–5), comment, created_at
- shop_analytics_daily table: id, shop_id, date, revenue_paise, completion_rate, response_time_avg, order_count
- shop_earnings_summary table: id, shop_id, week_start_date, total_revenue, settlements_received, running_balance
- orders.delivery_otp: TEXT (4 digits, nullable)
- shops.trust_score: INTEGER (0–100, default 50)
- shops.trust_badge: TEXT (enum: trusted|good|new|review)
- orders.refund_id: TEXT (Cashfree refund ID, nullable)
- orders.refund_status: TEXT (enum: pending|success|failed, nullable)

**Test Coverage:**
- 39 new tests (reviews 8, trust score 8, chat 6, analytics 8, earnings 5, payments refund 4)
- Total Sprint 6: 39 new tests
- Overall suite: 370/373 tests passing (99.2%)

**Next Steps:**
- Sprint 7: Customer App (Auth & Home)

---

## [Sprint 4] - 2026-04-12

### Payment Initiation Module (Cashfree) & Refunds & Settlement

**Added:**

#### POST /api/v1/payments/initiate
- Auth: Bearer JWT (`customer` role)
- Request: `{ order_id: uuid }`
- Validation: `order_id` required, valid UUID v4
- Authorization: Customer can only initiate payments for their own orders; shop owners cannot initiate (role guard)
- Behavior:
  - If order payment already completed: returns 200 with `alreadyPaid: true` and null payment fields
  - If order payment method is `cod` (cash-on-delivery): marks order payment_status as completed, returns 200 with `mode: 'cod'`
  - Otherwise (card/upi prepaid): creates Cashfree payment session via createPaymentSession API, stores cashfree_order_id in orders table, returns 200 with payment_session_id and payment_link
- Response: 200 with `{ orderId, paymentStatus, paymentMethod, cashfreeOrderId, paymentSessionId, paymentLink }`
- Error codes: PAYMENT_NOT_FOUND (404), FORBIDDEN (403 for cross-customer access), UNAUTHORIZED (401), INTERNAL_ERROR (500 on profile lookup failure)
- Rate limit: 30 requests/minute per user

#### GET /api/v1/payments/:id
- Auth: Bearer JWT (`customer` or `shop_owner` role)
- Authorization: Customer can only view payments for their own orders; shop owners can only view payments for their shop's orders
- Params: `:id` is order ID, validated as UUID v4
- Behavior:
  - Fetches order record (order must exist)
  - If order has cashfree_order_id and payment_method is not `cod`: queries Cashfree gateway for live payment status (best-effort; failure is logged as warning, endpoint continues)
  - Returns order and gateway status (gateway status nullable)
- Response: 200 with `{ orderId, orderStatus, paymentMethod, paymentStatus, paymentId, cashfreeOrderId, gatewayStatus, updatedAt }`
- Error codes: PAYMENT_NOT_FOUND (404), FORBIDDEN (403 for cross-customer/shop access), UNAUTHORIZED (401)
- Rate limit: 30 requests/minute per user

#### POST /api/v1/payments/webhook
- Auth: Public (no JWT required)
- Rate limit: 10 requests/minute (strict limiter)
- Headers: `x-webhook-signature` required (HMAC-SHA256 base64-encoded)
- Request body: Cashfree webhook payload with `{ event, data: { order, payment, ... } }`
- Behavior:
  - Verifies HMAC-SHA256 signature using `CASHFREE_WEBHOOK_SECRET` (timing-safe comparison with buffer length check)
  - Extracts paymentId, cashfreeOrderId, orderId from nested payload
  - Checks Redis cache for idempotent duplicate (key: `payment:{paymentId}:processed`, TTL 86400 seconds)
  - If already processed: returns 200 with `{ status: 'already_processed' }`
  - Sets processing lock in Redis (key: `payment:{paymentId}:processing`, TTL 30s) to prevent concurrent processing
  - Handles two event types:
    - `PAYMENT_SUCCESS`: updates order payment_status to `completed`, stores payment_id and cashfree_order_id, marks as processed
    - `PAYMENT_FAILED`: calls restoreOrderStock (restores stock for all non-cancelled items), updates order status to `payment_failed` and payment_status to `failed`, marks as processed
  - Unknown event types: logged, marked as processed (idempotent), returns 200
  - On completion: deletes processing lock, returns 200 with `{ status: 'processed' }`
- Error codes: INVALID_WEBHOOK_SIGNATURE (400 on signature mismatch or format error), INTERNAL_ERROR (500 on DB/processing failure)
- Response: 200 on success, 400 on invalid signature, 500 on processing error
- Idempotency: Redis-backed, 24-hour deduplication window prevents duplicate order updates from webhook retries

**Security Notes:**
- HMAC-SHA256 signature verification mandatory before any processing
- Timing-safe comparison prevents timing-based attacks
- Buffer length check before comparison prevents InvalidOperationError on mismatched lengths
- Invalid base64 in signature header caught and rejected (400 error)
- Idempotent webhook processing prevents duplicate stock restoration and order status updates
- PaymentId and orderId validation prevents injection of invalid identifiers
- Stock restoration only on PAYMENT_FAILED event (not on other events)
- Stock restoration is selective: only active items (quantity - cancelled_quantity > 0) are restored

**Test Coverage:**
- 68 new integration + unit tests (100% pass rate)
- payments.js: 83% coverage — happy path payment session creation, COD handling, cross-customer access prevention, payment status lookup, Cashfree failure resilience, profile lookup edge cases
- cashfree.js: 96% coverage — API request formatting, error handling, logging, secret validation
- Webhook tests: signature verification (valid/invalid/mismatched), idempotency (duplicate skipping), PAYMENT_SUCCESS flow, PAYMENT_FAILED with stock restoration, unknown events, processing locks, Redis integration

**Database Changes:**
- orders.cashfree_order_id: TEXT field stores Cashfree order ID (initially null, set on payment initiation)
- orders.payment_id: TEXT field stores Cashfree payment ID (initially null, set on webhook PAYMENT_SUCCESS)

---

## [Sprint 5] - 2026-04-10

### Delivery Tracking Module

**Added:**

#### GET /api/v1/delivery/orders
- Auth: Bearer JWT (`delivery` role)
- Query: optional `?status=` filter (enum: `assigned`, `picked_up`, `out_for_delivery`, `delivered`; invalid values silently ignored)
- Response: 200 with array of order objects (camelCase, internal fields `cashfree_order_id` and `idempotency_key` stripped)
- Error codes: UNAUTHORIZED (401), FORBIDDEN (403)
- Rate limit: 30 requests/minute per user

#### PATCH /api/v1/delivery/orders/:orderId/accept
- Auth: Bearer JWT (`delivery` role)
- Authorization: Partner must be the assigned partner for the order
- Behavior: Acknowledges assignment awareness — no status change; order remains `assigned`
- Params: `orderId` validated as UUID v4
- Response: 200 with order object
- Error codes: ORDER_NOT_FOUND (404), FORBIDDEN (403), ORDER_INVALID_TRANSITION (409), UNAUTHORIZED (401)
- Rate limit: 30 requests/minute per user

#### PATCH /api/v1/delivery/orders/:orderId/reject
- Auth: Bearer JWT (`delivery` role)
- Authorization: Partner must be the assigned partner for the order
- Behavior: Resets `delivery_partner_id` to null, reverts status to `ready`, re-enqueues `assign-delivery` BullMQ job after confirmed DB update
- Params: `orderId` validated as UUID v4
- Response: 200 with updated order object
- Error codes: ORDER_NOT_FOUND (404), FORBIDDEN (403), ORDER_INVALID_TRANSITION (409), UNAUTHORIZED (401)
- Rate limit: 30 requests/minute per user
- Concurrency: re-enqueue occurs only after optimistic DB update confirms no race condition

#### PATCH /api/v1/delivery/orders/:orderId/pickup
- Auth: Bearer JWT (`delivery` role)
- Authorization: Partner must be the assigned partner for the order
- Behavior: Transitions `assigned` → `picked_up`; enqueues `notify-customer` BullMQ job; emits `order:status_updated` Socket.IO event to `order:{orderId}` room
- Params: `orderId` validated as UUID v4
- Response: 200 with updated order object
- Error codes: ORDER_NOT_FOUND (404), FORBIDDEN (403), ORDER_INVALID_TRANSITION (409), UNAUTHORIZED (401)
- Rate limit: 30 requests/minute per user

#### PATCH /api/v1/delivery/orders/:orderId/deliver
- Auth: Bearer JWT (`delivery` role)
- Authorization: Partner must be the assigned partner for the order
- Behavior: Transitions `picked_up|out_for_delivery` → `delivered`; records `delivered_at` timestamp; enqueues `notify-customer` BullMQ job; emits `order:status_updated` Socket.IO event
- Params: `orderId` validated as UUID v4
- Response: 200 with updated order object
- Error codes: ORDER_NOT_FOUND (404), FORBIDDEN (403), ORDER_INVALID_TRANSITION (409), UNAUTHORIZED (401)
- Rate limit: 30 requests/minute per user

#### Socket.IO: gps:update (event, not HTTP)
- Auth: Socket.IO connection must carry a valid JWT with `role === 'delivery'`
- Payload: `{ orderId, lat, lng }` — `orderId` must be a UUID v4; `lat`/`lng` must be numbers within India geographic bounds (lat 6.0–37.6, lng 68.1–97.4)
- Behavior:
  - Validates role, orderId UUID, and coordinate bounds before any DB access
  - Checks ownership: only the order's assigned partner may push GPS
  - Status guard: only `picked_up` and `out_for_delivery` accept updates
  - Stores position in Redis `GEOADD delivery:{orderId}` with 30-second TTL (never written to Supabase)
  - Computes ETA via Ola Maps Distance Matrix API (best-effort; broadcast proceeds if ETA fails)
  - Broadcasts `gps:position` event to `order:{orderId}` room with `{ lat, lng, eta, timestamp }`
- Error events emitted to sender: `gps:error` with codes `FORBIDDEN`, `VALIDATION_ERROR`, `ORDER_NOT_FOUND`, `INVALID_ORDER_STATUS`, `INTERNAL_ERROR`

#### BullMQ: assign-delivery worker
- Queue: `assign-delivery`
- Trigger: fired when shop marks order `ready` (via order state machine)
- Behavior:
  - Guards against already-assigned or non-`ready` orders (idempotent)
  - Fetches shop location from Supabase
  - Redis `GEOSEARCH delivery:available` within 5 km, ascending distance, first 10 candidates
  - Assigns nearest partner via optimistic DB lock (`WHERE status = 'ready'`)
  - Emits `delivery:assigned` to `delivery:{partnerId}` Socket.IO room with sanitized order payload (no `cashfree_order_id` or `idempotency_key`)
  - Enqueues `notify-customer` job for customer notification
  - On final retry with no partner: emits `admin:alert` to `admin` room with `NO_PARTNER_AVAILABLE` type
- Config: 3 attempts, exponential backoff 2s, concurrency 5, removeOnComplete, keepOnFail

#### olaMaps.js: getETA function
- Added `getETA(originLat, originLng, destLat, destLng)` to `backend/src/services/olaMaps.js`
- Calls Ola Maps Distance Matrix API
- Returns ETA in seconds, or `null` on failure (caller handles gracefully)

**Security Notes:**
- UUID regex validation on `orderId` in `gps:update` socket events prevents injection via non-UUID strings
- UUID param validation middleware on all 4 PATCH routes (400 before DB access)
- `toSafeOrderPayload()` in `assignDelivery.js` strips `cashfree_order_id` and `idempotency_key` before Socket.IO emit
- `socket.role === 'delivery'` guard at top of `gps:update` handler — fails before any other processing
- GPS never stored in Supabase during active delivery (Redis only, per domain rule)
- Re-enqueue of `assign-delivery` job occurs only after confirmed DB update in `rejectAssignment`

**Test Coverage:**
- 21 integration tests (`delivery.test.js`) — list orders, accept/reject/pickup/deliver flows, auth/role guards, UUID validation, ownership enforcement
- 11 unit tests (`assignDelivery.test.js`) — job processor logic, GEOSEARCH, optimistic lock, admin alert on final retry, safe payload stripping
- 13 unit tests (`gpsTracker.test.js`) — role guard, UUID validation, coordinate bounds, ownership check, status guard, Redis GEOADD+EXPIRE, ETA computation, broadcast, ETA failure resilience
- Total Sprint 5: 45 new tests; overall suite: 331/331 passing

---

## [Sprint 2] - 2026-04-08

### Product Image Resize Pipeline (Sharp.js)

**Verified:**
- Product image uploads use Sharp.js before R2 upload
  - Full image resized to `600x600` with `fit: 'cover'`
  - Thumbnail resized to `150x150` with `fit: 'cover'`
  - Both outputs converted to JPEG before upload
- Upload keys remain under `/products/{shopId}/{productId}-full.jpg` and `/products/{shopId}/{productId}-thumb.jpg`

### Typesense Schema Bootstrap

**Added:**
- Canonical Typesense collection schemas for:
  - `shops` — includes `geo_location`, `trust_score`, `is_open`, `is_verified`, and searchable shop fields
  - `products` — includes `shop_id`, `category`, `price`, `stock_quantity`, `is_available`, and searchable product fields

### Product Search Endpoints

**Added:**
- `GET /api/v1/search/shops` — Public geo search for nearby shops
- `GET /api/v1/search/products` — Public cross-shop product search
- `GET /api/v1/products/template` — Download product CSV template
- `DELETE /api/v1/products/:productId` — Soft-delete a product
- `PATCH /api/v1/products/:productId` — Update product price/stock
- `POST /api/v1/shops/:shopId/products/bulk` — Bulk-create products from CSV
- `PATCH /api/v1/shops/:shopId/toggle` — Toggle shop open/close status
- `GET /api/v1/shops/:shopId` — Retrieve full shop profile
- `PATCH /api/v1/shops/:shopId` — Update shop profile fields
- `POST /api/v1/shops/:shopId/kyc` — Upload KYC document to R2

---

*Last updated: April 12, 2026 | Sprints 1–6 backend COMPLETE (49/49 tasks). 370/373 tests passing (99.2%). Next: Sprint 7 (Customer App).*
