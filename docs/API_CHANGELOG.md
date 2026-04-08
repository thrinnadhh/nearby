# NearBy API Changelog

> Every breaking change, addition, or deprecation is recorded here.
> Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
> API versioned via URL prefix: `/api/v1/`, `/api/v2/` etc.

---

## [Sprint 2] - 2026-04-08

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
- `POST /api/v1/shops/:id/products/bulk` — Bulk CSV upload
- `GET /api/v1/products/template` — Download CSV template
- `PATCH /api/v1/products/:id` — Update product (stock/price)
- `DELETE /api/v1/products/:id` — Soft delete product
- `POST /api/v1/products/:id/image` — Upload product image
- `GET /api/v1/search/shops` — Geo search shops
- `GET /api/v1/search/products` — Cross-shop product search

### Added (Sprint 3-4)
- `POST /api/v1/orders` — Place order
- `GET /api/v1/orders` — List orders (customer or shop view)
- `GET /api/v1/orders/:id` — Get order detail
- `PATCH /api/v1/orders/:id/accept` — Shop accepts order
- `PATCH /api/v1/orders/:id/reject` — Shop rejects order
- `PATCH /api/v1/orders/:id/ready` — Mark order ready for pickup
- `PATCH /api/v1/orders/:id/cancel` — Customer cancels order
- `PATCH /api/v1/orders/:id/item-unavailable` — Remove item from active order
- `POST /api/v1/payments/initiate` — Create Cashfree payment
- `POST /api/v1/payments/webhook` — Cashfree webhook handler
- `GET /api/v1/payments/:id` — Get payment status

### Added (Sprint 5-6)
- `POST /api/v1/delivery/availability` — Partner go online/offline
- `GET /api/v1/delivery/assignments` — Partner's active assignments
- `PATCH /api/v1/delivery/:id/pickup` — Confirm order pickup
- `PATCH /api/v1/delivery/:id/deliver` — Confirm delivery with OTP
- `POST /api/v1/delivery/:id/location` — Push GPS update
- `POST /api/v1/reviews` — Submit verified review
- `GET /api/v1/shops/:id/reviews` — Get shop reviews

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

PAYMENT_FAILED           Cashfree payment failed
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

*Updated automatically when APIs change. Last update: April 8, 2026 (Sprint 2.4 complete)*
