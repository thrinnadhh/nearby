# NearBy API Changelog

> Every breaking change, addition, or deprecation is recorded here.
> Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
> API versioned via URL prefix: `/api/v1/`, `/api/v2/` etc.

---

## [Sprint 4] - 2026-04-12

### Payment Initiation Module (Cashfree)

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

**Fixes:**
- Supabase `.single()` incompatibility fixed: replaced with explicit length check `data.length === 0`
- Webhook signature validation fixed: added buffer length check before timing-safe comparison to handle invalid base64
- Signature format error handling: try-catch around Buffer.from() prevents unhandled errors on malformed base64

**Test Coverage:**
- 68 new integration + unit tests (100% pass rate)
- payments.js: 83% coverage — happy path payment session creation, COD handling, cross-customer access prevention, payment status lookup, Cashfree failure resilience, profile lookup edge cases
- cashfree.js: 96% coverage — API request formatting, error handling, logging, secret validation
- Webhook tests: signature verification (valid/invalid/mismatched), idempotency (duplicate skipping), PAYMENT_SUCCESS flow, PAYMENT_FAILED with stock restoration, unknown events, processing locks, Redis integration

**Database Changes:**
- orders.cashfree_order_id: TEXT field stores Cashfree order ID (initially null, set on payment initiation)
- orders.payment_id: TEXT field stores Cashfree payment ID (initially null, set on webhook PAYMENT_SUCCESS)

**Next Steps:**
- Sprint 5: Delivery tracking and GPS integration (assign-delivery worker, delivery routes, Socket.IO gps:update)
- Sprint 6: Reviews and ratings endpoints

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

**Response Shape (order object):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "customerId": "uuid",
    "shopId": "uuid",
    "deliveryPartnerId": "uuid",
    "status": "picked_up",
    "totalPaise": 14900,
    "paymentMethod": "upi",
    "paymentStatus": "paid",
    "acceptedAt": "2026-04-10T08:00:00Z",
    "deliveredAt": null,
    "createdAt": "2026-04-10T07:55:00Z",
    "updatedAt": "2026-04-10T08:10:00Z"
  }
}
```

---

## [Sprint 2] - 2026-04-08

### Product Image Resize Pipeline (Sharp.js)

**Verified:**
- Product image uploads use Sharp.js before R2 upload
  - Full image resized to `600x600` with `fit: 'cover'`
  - Thumbnail resized to `150x150` with `fit: 'cover'`
  - Both outputs converted to JPEG before upload
- Upload keys remain under `/products/{shopId}/{productId}-full.jpg` and `/products/{shopId}/{productId}-thumb.jpg`

**Error Handling:**
- Sharp processing failures return `UPLOAD_FAILED (500)` before any R2 write
- R2 full/thumbnail upload failures also return `UPLOAD_FAILED (500)`

**Test Coverage:**
- 2 focused unit tests covering resize dimensions/JPEG conversion and Sharp failure handling

### Typesense Schema Bootstrap

**Added:**
- Canonical Typesense collection schemas for:
  - `shops` — includes `geo_location`, `trust_score`, `is_open`, `is_verified`, and searchable shop fields
  - `products` — includes `shop_id`, `category`, `price`, `stock_quantity`, `is_available`, and searchable product fields
- `ensureTypesenseCollections()` in `/Users/trinadh/projects/nearby/backend/src/services/typesense.js`
- `npm run seed:typesense` script via `/Users/trinadh/projects/nearby/backend/src/scripts/seedTypesense.js`

**Behavior:**
- Reads existing Typesense collections
- Creates missing `shops` and `products` collections idempotently
- Leaves existing collections intact

**Compatibility Notes:**
- Shop sync payload now includes `geo_location`
- Product/search endpoints now align with explicit collection schemas instead of implicit document shape assumptions

**Test Coverage:**
- 5 unit tests covering schema contents and missing-collection detection

### Product Search Endpoint (GET /search/products)

**Added:**
- `GET /api/v1/search/products` — Public cross-shop product search
  - Auth: Public
  - Query: required `q`, optional `category`, `shop_id`, `page`, `limit`
  - Validation: `q` required, `category` restricted to supported product categories, `shop_id` must be a UUID
  - Search backend: Typesense `products` collection with `is_available:=true` baseline filter, optional category/shop filters, typo tolerance, and prefix search
  - Response: `200` with normalized product results plus `{ found, page, limit }` meta
  - Error codes: VALIDATION_ERROR (400), INTERNAL_ERROR (500)

**Test Coverage:**
- 6 integration tests covering happy path, default filter behavior, missing query, invalid category, invalid `shop_id`, and Typesense failure handling

**Security Notes:**
- Query params are Joi-validated before reaching Typesense
- Search is read-only and only returns indexed product documents marked available
- No raw client input is written to storage or executed server-side

### Shop Search Endpoint (GET /search/shops)

**Added:**
- `GET /api/v1/search/shops` — Public geo search for nearby shops
  - Auth: Public
  - Query: `lat`, `lng`, optional `radius_km`, `category`, `open_only`, `page`, `limit`
  - Validation: coordinates restricted to India bounds, `radius_km` capped at `20`, and `category` restricted to supported shop categories
  - Search backend: Typesense `shops` collection with geo filter, optional category filter, optional open-only filter, and trust-score secondary sorting
  - Response: `200` with normalized shop search results plus `{ found, page, limit }` meta
  - Error codes: VALIDATION_ERROR (400), INTERNAL_ERROR (500)

**Indexing Notes:**
- Shop Typesense sync payload now includes `geo_location` alongside `latitude`/`longitude` so geo-radius queries can execute against indexed shop documents

**Test Coverage:**
- 6 integration tests covering valid geo search, default query behavior, missing coordinates, invalid category, invalid radius, and Typesense failure handling

**Security Notes:**
- Query params are Joi-validated before reaching Typesense
- Output is read-only search data; no auth bypass risk because the endpoint is intentionally public
- No raw client input is interpolated beyond validated enum/number fields

### Product Template Endpoint (GET /products/template)

**Added:**
- `GET /api/v1/products/template` — Download product CSV template
  - Auth: Bearer JWT (`shop_owner` role)
  - Query: optional `category`
  - Validation: `category` must be one of the supported product categories
  - Response: `200 text/csv` attachment with header `name,description,category,price_paise,stock_quantity,unit`
  - Behavior: returns a sample row; when `category` is provided, the row is prefilled with category-specific example values and the filename suffix includes the category
  - Error codes: VALIDATION_ERROR (400), UNAUTHORIZED (401), FORBIDDEN (403)

**Test Coverage:**
- 5 integration tests covering authenticated download, category-prefilled output, invalid category validation, missing auth, and wrong-role access

**Security Notes:**
- Route is protected with `authenticate` + `roleGuard(['shop_owner'])`
- No filesystem access or path-based filename handling is exposed to the client
- Output is generated server-side from fixed templates rather than raw client input

### Product Delete Endpoint (DELETE /products/:id)

**Added:**
- `DELETE /api/v1/products/:productId` — Soft-delete a product
  - Auth: Bearer JWT (`shop_owner` role)
  - Authorization: Owner can only delete products belonging to their own shop
  - Behavior: sets `deleted_at`, forces `is_available=false`, and queues async `product_remove` Typesense sync
  - Response: 204 with no body
  - Error codes: PRODUCT_NOT_FOUND (404), UNAUTHORIZED (401), FORBIDDEN (403)
  - Pattern: Fire-and-forget queueing (queue failure does not fail the endpoint)

**Database Changes:**
- Added migration `010_products_soft_delete.sql`
- New column: `products.deleted_at TIMESTAMPTZ`

**Test Coverage:**
- 8 integration tests covering happy path, ownership denial, missing auth, wrong role, already deleted products, and queue-failure resilience

### Product Update Endpoint (PATCH /products/:id)

**Added:**
- `PATCH /api/v1/products/:productId` — Update mutable product fields
  - Auth: Bearer JWT (`shop_owner` role)
  - Authorization: Owner can only update products belonging to their own shop
  - Request: JSON with one or both of `price`, `stock_quantity`
  - Validation: at least one field required, `price` in paise integer, `stock_quantity` integer `>= 0`
  - Response: 200 with updated product object in camelCase
  - Error codes: VALIDATION_ERROR (400), PRODUCT_NOT_FOUND (404), UNAUTHORIZED (401), FORBIDDEN (403)
  - Side effects: Queues async `product_sync` BullMQ Typesense job after update
  - Pattern: Fire-and-forget queueing (queue failure does not fail the endpoint)

**Test Coverage:**
- 7 integration tests covering stock update, price update, missing auth, wrong role, ownership denial, invalid product id, and Typesense queue sync

**Security Notes:**
- Route is protected with `authenticate` + `roleGuard(['shop_owner'])`
- Product ownership is re-verified server-side through the owning shop before update
- Only explicit mutable fields are patched; no raw request body is written directly
- This endpoint updates stored product pricing only; it does not change the rule that order totals must be calculated server-side from DB values

### Bulk Product Upload Endpoint (POST /shops/:id/products/bulk)

**Added:**
- `POST /api/v1/shops/:shopId/products/bulk` — Bulk-create products from CSV
  - Auth: Bearer JWT (`shop_owner` role)
  - Authorization: User can only upload products for their own shop (verified via JWT + database)
  - Request: `multipart/form-data` with `csv` file field only
  - CSV columns: `name, description, category, price_paise, stock_quantity, unit`
  - Limits: CSV MIME only, max 2 MB, max 100 data rows
  - Response: 201 when all valid rows are inserted, 207 when some rows fail validation
  - Error codes: VALIDATION_ERROR (400), INVALID_FILE_TYPE (400), FILE_TOO_LARGE (413), UNAUTHORIZED (401), FORBIDDEN (403)
  - Side effects: Queues one async `product_sync` BullMQ Typesense job per inserted product
  - Pattern: Fire-and-forget queueing (queue failure does not fail the endpoint)

**Test Coverage:**
- 12 integration tests covering auth, role guard, happy path, partial success, CSV schema validation, empty file handling, file-size enforcement, and queue resilience

**Security Notes:**
- Shop ownership verified at middleware and service layers
- CSV rows validated server-side before any insert
- Large files rejected before processing
- No raw CSV values written directly without Joi validation/coercion

**Next Steps:**
- Sprint 2 Task 2.7: Implement PATCH /products/:id
- Sprint 2 Task 2.8: Implement DELETE /products/:id ✅ DONE

### Shop Toggle Endpoint (PATCH /shops/:id/toggle)

**Added:**
- `PATCH /api/v1/shops/:shopId/toggle` — Toggle shop open/close status
  - Auth: Bearer JWT (shop_owner role)
  - Authorization: User can only toggle their own shop (verified via JWT + database)
  - Request: Empty JSON body `{}` (no required fields)
  - Response: 200 with updated shop object (camelCase keys: id, ownerId, name, category, description, phone, latitude, longitude, isOpen, isVerified, trustScore, kycStatus, kycDocumentUrl, createdAt, updatedAt)
  - Error codes: SHOP_NOT_FOUND (404), UNAUTHORIZED (403 for cross-shop access), UNAUTHORIZED (401 for missing JWT), FORBIDDEN (403 for non-shop_owner role)
  - Side effects: Queues async BullMQ Typesense sync job (immediate execution)
    - If shop is being opened: upserts shop document to Typesense index (makes shop searchable)
    - If shop is being closed: removes shop document from Typesense index (hides from search)
  - Job configuration: 3 retries with 2s exponential backoff, 5 concurrent jobs, removes on complete, keeps on fail for debugging
  - Pattern: Fire-and-forget (queue error does not fail endpoint response)
  - Security: Defense-in-depth ownership verification at middleware + service layer

**Test Coverage:**
- 13 integration tests, 100% coverage
- Happy paths: toggle closed→open (200), toggle open→closed (200)
- Error cases: shop not found (404), unauthorized owner (403), missing auth header (401), invalid UUID format (404), non-shop_owner role (403)
- Async behavior: Typesense queue job called with correct action ('sync' or 'remove')
- Edge cases: empty body accepted (200), concurrent toggles with last-write-wins

**Security Notes:**
- Shop ownership verified at middleware (shopOwnerGuard) via database lookup (defense-in-depth against JWT forgery)
- Shop ownership re-verified at service layer before processing
- Cross-shop access returns 403 FORBIDDEN (doesn't leak whether shop exists)
- UUID format validated (invalid UUID returns 404 instead of 500)
- Async job failure is non-critical (logged as warning, doesn't affect endpoint response)

**Database Changes:**
- No new columns (uses existing shops.is_open field)
- shops.updated_at field updated on toggle

**Middleware Stack:**
1. authenticate — JWT verification
2. roleGuard(['shop_owner']) — Role enforcement
3. validate(toggleShopSchema) — Input validation (empty body allowed)
4. shopOwnerGuard — Async database ownership verification
5. handler — Route handler

**Next Steps:**
- Sprint 2 Task 2.5: Implement POST /shops/:id/products (single product creation)
- Sprint 2 Task 2.6: Implement POST /shops/:id/products/bulk (CSV bulk upload)

---

### Shop Profile Endpoints (GET and PATCH)

**Added:**
- `GET /api/v1/shops/:shopId` — Retrieve full shop profile
  - Auth: Bearer JWT (shop_owner role)
  - Authorization: User can only GET their own shop (verified via JWT + database)
  - Response: 200 with complete shop object (camelCase keys: id, ownerId, name, category, description, phone, latitude, longitude, isOpen, isVerified, trustScore, kycStatus, kycDocumentUrl, createdAt, updatedAt)
  - Error codes: SHOP_NOT_FOUND (404), UNAUTHORIZED (403 for cross-shop access), UNAUTHORIZED (401 for missing JWT)
  - Security: Defense-in-depth ownership verification at middleware + service layer

- `PATCH /api/v1/shops/:shopId` — Update mutable shop profile fields
  - Auth: Bearer JWT (shop_owner role)
  - Authorization: User can only PATCH their own shop
  - Request: JSON with optional fields { name?, description?, category?, phone? }
  - Updateable fields: name (3-100 chars, trimmed), description (10-500 chars, trimmed), category (enum: kirana|vegetable_vendor|pharmacy|restaurant|pet_store|mobile_shop|furniture_store), phone (E.164 format +91XXXXXXXXXX or null)
  - Read-only fields (protected from update): id, owner_id, kyc_status, trust_score, is_verified, is_open, created_at, updated_at
  - Validation: At least one field required for PATCH
  - Response: 200 with updated shop object (all readable fields, camelCase keys)
  - Error codes: VALIDATION_ERROR (400 for invalid input or no fields), SHOP_NOT_FOUND (404), UNAUTHORIZED (403 for cross-shop access), UNAUTHORIZED (401 for missing JWT)
  - Security: Defense-in-depth ownership verification + mutable field filtering at service layer

**Test Coverage:**
- 15 integration tests (5 GET + 10 PATCH), 92% coverage
- GET happy path (200 with all fields), non-existent shop (404), cross-shop access (403), unauthenticated (401), customer role (403)
- PATCH happy path (200), invalid category (400), field validation (400), non-existent shop (404), cross-shop access (403), empty body (400), phone null allowed (200), field length validation (400), phone format validation (400), unauthenticated (401)

**Security Notes:**
- Shop ownership verified at middleware (shopOwnerGuard) via database lookup (defense-in-depth against JWT forgery)
- Shop ownership re-verified at service layer before processing
- Mutable fields filtered at service layer via whitelist (immutable fields cannot be injected via request)
- Cross-shop access returns 403 FORBIDDEN (doesn't leak whether shop exists)
- UUID format validated (invalid UUID returns 404 instead of 500)
- All inputs validated with Joi schemas before processing
- Response objects immutably constructed with camelCase keys

**Database Changes:**
- No new columns (uses existing shops table fields)
- shops.updated_at field updated on PATCH operations

**Middleware Stack:**
1. authenticate — JWT verification
2. roleGuard(['shop_owner']) — Role enforcement
3. validate(updateShopSchema) — Input validation (PATCH only)
4. shopOwnerGuard — Async database ownership verification
5. handler — Route handler

---

### KYC Document Upload Endpoint

**Added:**
- `POST /api/v1/shops/:shopId/kyc` — Upload KYC document (PDF) to R2 private bucket
  - Request: multipart/form-data with file field "document" (PDF, 1-10 MB)
  - Headers: idempotency-key (UUID, required) for deduplication
  - Response: 201 with {shopId, kycDocumentUrl (signed URL, 5-min TTL), kycStatus, updatedAt}
  - Role guard: shop_owner only, user must own the shop (defense-in-depth DB verification)
  - Rate limit: 10 uploads per hour per user
  - Business logic: File validation (PDF only), size bounds (1 KB – 10 MB), R2 storage with signed URLs, idempotency via Redis
  - Error codes: FILE_TOO_LARGE (413), FILE_TOO_SMALL (400), INVALID_FILE_TYPE (400), UPLOAD_FAILED (500), UNAUTHORIZED (403), SHOP_NOT_FOUND (404), FORBIDDEN (403)

**Test Coverage:**
- 8 integration tests, 92% coverage
- Valid upload (201 with signed URL), non-PDF file (400), file >10 MB (413), cross-shop access prevention (403), shop not found (404), unauthenticated (401), no file (400), customer role (403)

**Security Notes:**
- File MIME type validated at multer layer (PDF only)
- File size validated by multer (1 KB – 10 MB)
- Signed URLs expire in 5 minutes (cannot be shared/leaked)
- Shop ownership verified via database lookup (defense-in-depth against JWT forgery)
- Idempotency key prevents duplicate R2 uploads (Redis cache, 5-min TTL)
- Rate limiting prevents abuse (10/hour per user)
- All file content stored only in R2, never in database

**Database Changes:**
- shops.kyc_document_url — TEXT, stores R2 signed URL
- shops.kyc_document_expires_at — TIMESTAMP, URL expiry time
- shops.kyc_status — TEXT, defaults to 'pending_kyc', updates to 'kyc_submitted' on upload

---

### Shop Registration Endpoint

**Added:**
- `POST /api/v1/shops` — Shop owner registration
  - Request: name (3-100), description (10-500), latitude (8-35), longitude (68-97), category (enum), phone (optional)
  - Response: 201 with shop object {id, name, description, latitude, longitude, category, phone, isOpen, isVerified, trustScore, createdAt, updatedAt}
  - Role guard: shop_owner only
  - Validation: Joi schema with India coordinate bounds, category enum (kirana, vegetable_vendor, pharmacy, restaurant, pet_store, mobile_shop, furniture_store), phone +91 format
  - Business logic: One shop per owner (duplicate prevention), initial status pending_kyc, trust_score initialized to 50.0, is_open defaults true
  - Error codes: DUPLICATE_SHOP (409), INVALID_COORDINATES (400), VALIDATION_ERROR (400), UNAUTHORIZED (401), FORBIDDEN (403)

**Test Coverage:**
- 8 integration tests, 92% coverage
- Valid creation (201), duplicate prevention (409), role guard (403), invalid coordinates (400), missing fields (400), invalid category enum (400), concurrent requests, unauthenticated (401)

**Security Notes:**
- Coordinates validated for India bounds before DB insert
- One shop per owner enforced via duplicate check (unique constraint on profiles.shop_id)
- Phone field optional, validated if provided
- All inputs sanitized by Joi before processing

---

## [Sprint 1] - 2026-04-07

### Infrastructure (No API changes yet — backend skeleton only)

**Added:**
- Express.js backend with middleware stack (auth, validation, rate limiting, error handling)
- Socket.IO with JWT authentication and CORS whitelisting
- Service clients: Redis, Supabase, Typesense, Cloudflare R2, Cashfree, MSG91, Firebase FCM, Ola Maps
- Authentication middleware: JWT verification with token expiry handling
- Authorization middleware: Role-based access control (customer, shop_owner, delivery, admin)
- Rate limiting: Four tiers — global (100/15min), OTP (5/hour), strict (10/min), search (30/min)
- Input validation: Joi schema framework with comprehensive error reporting
- Error handling: Standard response format with error codes + HTTP status codes
- Health checks: GET /health (basic status) + GET /readiness (service connectivity)
- Logging: Winston logger with request ID tracking and environment-aware output
- Cashfree webhook handler: HMAC-SHA256 signature verification + idempotency
- Test suite: 57 passing tests covering infrastructure, middleware, services
- Docker setup: docker-compose.yml for local development (Redis, Typesense, API)

**Available Endpoints (Stub Implementations):**
- `GET /health` — Server status (200 OK)
- `GET /readiness` — Service readiness probe (200 if all ready, 503 if any down)

**Next Steps:**
- Sprint 1 Task 1.13: Implement POST /api/v1/auth/send-otp (MSG91 integration)
- Sprint 1 Task 1.14: Implement POST /api/v1/auth/verify-otp (JWT issuance)
- Sprint 2: Shop CRUD endpoints
- Sprint 2: Product CRUD endpoints
- Sprint 3–4: Order flow + Cashfree payment integration

**Security:**
- Socket.IO requires JWT authentication before connection
- Socket.IO CORS restricted to whitelist (SOCKET_ALLOWED_ORIGINS env var)
- Cashfree webhooks verified via HMAC-SHA256 before any processing
- Rate limiting prevents OTP brute force (5 attempts/hour per phone)
- All secrets stored in environment variables, never in code
- Error messages sanitized to prevent information leakage

---

## [Unreleased] — v1.0.0

### Added (Sprint 1-2)
- `POST /api/v1/auth/send-otp` — Send OTP to phone number
- `POST /api/v1/auth/verify-otp` — Verify OTP, issue JWT
- `POST /api/v1/auth/refresh` — Refresh access token
- `GET /api/v1/auth/me` — Get current user profile
- `PATCH /api/v1/auth/me` — Update profile name/location
- `POST /api/v1/shops` — Register new shop ✅ DONE (Sprint 2, Task 2.1)
- `GET /api/v1/shops/:id` — Get shop profile ✅ DONE (Sprint 2, Task 2.3)
- `PATCH /api/v1/shops/:id` — Update shop profile ✅ DONE (Sprint 2, Task 2.3)
- `POST /api/v1/shops/:id/kyc` — Upload KYC documents ✅ DONE (Sprint 2, Task 2.2)
- `PATCH /api/v1/shops/:id/toggle` — Open/close shop ✅ DONE (Sprint 2, Task 2.4)
- `GET /api/v1/shops/:id/analytics` — Shop analytics
- `GET /api/v1/shops/:id/earnings` — Earnings and settlements
- `GET /api/v1/shops/:id/products` — List shop products
- `POST /api/v1/shops/:id/products` — Add single product
- `POST /api/v1/shops/:id/products/bulk` — Bulk CSV upload ✅ DONE (Sprint 2, Task 2.6)
- `GET /api/v1/products/template` — Download CSV template ✅ DONE (Sprint 3, Task 3.1)
- `PATCH /api/v1/products/:id` — Update product (stock/price) ✅ DONE (Sprint 2, Task 2.7)
- `DELETE /api/v1/products/:id` — Soft delete product ✅ DONE (Sprint 2, Task 2.8)
- `POST /api/v1/products/:id/image` — Upload product image
- `GET /api/v1/search/shops` — Geo search shops ✅ DONE (Sprint 3, Task 3.2)
- `GET /api/v1/search/products` — Cross-shop product search ✅ DONE (Sprint 2, Task 2.10)

### Added (Sprint 3-4)
- `POST /api/v1/orders` — Place order
- `GET /api/v1/orders` — List orders (customer or shop view)
- `GET /api/v1/orders/:id` — Get order detail
- `PATCH /api/v1/orders/:id/accept` — Shop accepts order
- `PATCH /api/v1/orders/:id/reject` — Shop rejects order
- `PATCH /api/v1/orders/:id/ready` — Mark order ready for pickup
- `PATCH /api/v1/orders/:id/cancel` — Customer cancels order
- `PATCH /api/v1/orders/:id/item-unavailable` — Remove item from active order
- `POST /api/v1/payments/initiate` — Create Cashfree payment ✅ DONE (Sprint 4, Task 4.1)
- `POST /api/v1/payments/webhook` — Cashfree webhook handler ✅ DONE (Sprint 4, Task 4.3)
- `GET /api/v1/payments/:id` — Get payment status ✅ DONE (Sprint 4, Task 4.2)

### Added (Sprint 5) ✅ DONE
- `GET /api/v1/delivery/orders` — List partner's assigned orders ✅ DONE (Sprint 5, Task 5.2)
- `PATCH /api/v1/delivery/orders/:orderId/accept` — Acknowledge assignment ✅ DONE (Sprint 5, Task 5.3)
- `PATCH /api/v1/delivery/orders/:orderId/reject` — Reject and re-queue assignment ✅ DONE (Sprint 5, Task 5.3)
- `PATCH /api/v1/delivery/orders/:orderId/pickup` — Confirm order pickup ✅ DONE (Sprint 5, Task 5.4)
- `PATCH /api/v1/delivery/orders/:orderId/deliver` — Confirm delivery ✅ DONE (Sprint 5, Task 5.5)
- Socket.IO `gps:update` event — Real-time GPS position push ✅ DONE (Sprint 5, Task 5.6)

### Added (Sprint 14 — Admin)
- `GET /api/v1/admin/kyc-queue` — List pending KYC applications
- `PATCH /api/v1/admin/kyc/:shop_id` — Approve/reject KYC
- `GET /api/v1/admin/shops` — List all shops
- `PATCH /api/v1/admin/shops/:id/suspend` — Suspend/reinstate shop
- `GET /api/v1/admin/disputes` — List disputes
- `PATCH /api/v1/admin/disputes/:id` — Resolve dispute
- `GET /api/v1/admin/analytics` — Platform analytics
- `POST /api/v1/admin/broadcast` — Broadcast message

---

## Response Schema Reference

### Standard Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 147
  }
}
```

### Standard Error Response
```json
{
  "success": false,
  "error": {
    "code": "ORDER_NOT_FOUND",
    "message": "The requested order does not exist",
    "details": {}
  }
}
```

### All Error Codes
```
INVALID_OTP              OTP entered is incorrect
OTP_EXPIRED              OTP has expired (5 minute TTL)
OTP_LOCKED               Too many attempts (locked 10 min)
OTP_RATE_LIMITED         Too many OTP requests (5/hour limit)
INVALID_TOKEN            JWT is invalid or malformed
TOKEN_EXPIRED            JWT has expired
UNAUTHORIZED             No auth header provided
FORBIDDEN                Authenticated but wrong role
VALIDATION_ERROR         Request body failed Joi validation
MISSING_FIELD            Required field not provided
INVALID_FORMAT           Field value wrong format/type

SHOP_NOT_FOUND           Shop ID doesn't exist
SHOP_NOT_VERIFIED        Shop KYC not approved yet
SHOP_CLOSED              Shop is currently closed
SHOP_NOT_OWNER           Requesting user doesn't own this shop
SHOP_SUSPENDED           Shop has been suspended by admin
DUPLICATE_SHOP           User already owns a shop

FILE_TOO_LARGE           File exceeds 10 MB maximum
FILE_TOO_SMALL           File less than 1 KB minimum
INVALID_FILE_TYPE        Only PDF files allowed
UPLOAD_FAILED            R2 upload failure

PRODUCT_NOT_FOUND        Product ID doesn't exist
PRODUCT_OUT_OF_STOCK     Product is_available = false
INSUFFICIENT_STOCK       Not enough qty available

ORDER_NOT_FOUND          Order ID doesn't exist
ORDER_NOT_CANCELLABLE    Order status doesn't allow cancellation
ORDER_ACCEPT_EXPIRED     3-minute window expired
DUPLICATE_ORDER          Idempotency key already processed
DIFFERENT_SHOP_CART      Cart has items from a different shop
ORDER_ALREADY_PICKED_UP  Cannot cancel after pickup
ORDER_INVALID_TRANSITION Order status transition not permitted

PAYMENT_FAILED           Cashfree payment failed
PAYMENT_NOT_FOUND        Payment/order doesn't exist
PAYMENT_ALREADY_PROCESSED Webhook duplicate (idempotency)
INVALID_WEBHOOK_SIGNATURE Cashfree HMAC mismatch
REFUND_FAILED            Cashfree refund API error

NO_PARTNER_AVAILABLE     No delivery partner within radius
INVALID_DELIVERY_OTP     Wrong OTP entered by delivery partner
PARTNER_NOT_FOUND        Delivery partner ID doesn't exist

REVIEW_ALREADY_EXISTS    Already reviewed this order
ORDER_NOT_DELIVERED      Can only review delivered orders

INVALID_COORDINATES      Latitude/longitude outside India bounds

NOT_FOUND                Generic 404
INTERNAL_ERROR           Generic 500
RATE_LIMITED             Generic rate limit exceeded
```

---

## Breaking Changes Policy

- Breaking changes increment the API version: `/api/v1/` → `/api/v2/`
- Old version supported for 60 days after new version release
- All clients notified via email/FCM 30 days before old version shutdown
- Non-breaking additions (new optional fields, new endpoints) don't bump version
- A "breaking change" is: removing a field, changing a field type, changing endpoint URL, changing error codes

---

## Upcoming Changes (Planned V2)

| Change | Type | Target Sprint |
|--------|------|--------------|
| Add `driver_rating` to delivery assign response | Non-breaking addition | Sprint 13 |
| Add `discount_amount` to order response | Non-breaking addition | V2 |
| Add `saved_addresses[]` to user profile | Non-breaking addition | V2 |
| Rename `delivery_partner_id` → `partner_id` in orders | BREAKING | V2 API |
| Add `/api/v2/orders` with redesigned response | Breaking (new version) | V2 |

---

*Updated automatically when APIs change. Last update: April 12, 2026 (Sprint 4 payment initiation complete)*
