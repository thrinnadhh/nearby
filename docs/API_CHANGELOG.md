# NearBy API Changelog

> Every breaking change, addition, or deprecation is recorded here.
> Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
> API versioned via URL prefix: `/api/v1/`, `/api/v2/` etc.

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
- `POST /api/v1/shops` — Register new shop
- `GET /api/v1/shops/:id` — Get shop profile
- `PATCH /api/v1/shops/:id` — Update shop profile
- `POST /api/v1/shops/:id/kyc` — Upload KYC documents
- `PATCH /api/v1/shops/:id/toggle` — Open/close shop
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

*Updated automatically when APIs change. Last update: April 7, 2026 (Sprint 1.9 complete)*
