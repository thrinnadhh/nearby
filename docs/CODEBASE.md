# NearBy Codebase Guide

> **Last Updated:** April 6, 2026  
> **Status:** Backend scaffolded (all files created, implementation pending)  
> **Current Sprint:** Sprint 1 (Infrastructure & Auth)  
> **Repository:** https://github.com/nearby-app/nearby

---

## Table of Contents

1. [Project Status Overview](#project-status-overview)
2. [Directory Structure](#directory-structure)
3. [What's Been Built](#whats-been-built)
4. [What Needs Implementation](#what-needs-implementation)
5. [Core Modules Explained](#core-modules-explained)
6. [Development Workflow](#development-workflow)
7. [Common Tasks & Recipes](#common-tasks--recipes)
8. [Testing Strategy](#testing-strategy)
9. [Debugging & Logs](#debugging--logs)
10. [Deployment Pipeline](#deployment-pipeline)

---

## Project Status Overview

### Build Status (as of April 6, 2026)

| Component | Status | Progress | Notes |
|-----------|--------|----------|-------|
| **Project Init** | ✅ Done | 100% | Directory structure, git setup, CI/CD hooks |
| **Backend Scaffold** | ✅ Done | 100% | All route files, middleware, services created |
| **Frontend Structure** | 🟨 Partial | 30% | App directories created, no components yet |
| **Database Schema** | ⬜ Not Started | 0% | Migration SQL files pending (Sprint 1) |
| **Auth System** | ⬜ Not Started | 0% | OTP + JWT logic pending (Sprint 1) |
| **Shop CRUD** | ⬜ Not Started | 0% | Pending (Sprint 2) |
| **Product CRUD** | ⬜ Not Started | 0% | Pending (Sprint 2) |
| **Order Flow** | ✅ Done | 100% | Sprint 3 order creation, notifications, auto-cancel, and order state machine complete |
| **Payment Integration** | ⬜ Not Started | 0% | Pending (Sprint 4) |
| **Real-time (Socket.IO)** | 🟨 Partial | 65% | Socket server and order rooms complete; later sprints still need delivery/live tracking polish |
| **Search (Typesense)** | ⬜ Not Started | 0% | Service client created, queries pending |
| **Delivery Tracking** | ⬜ Not Started | 0% | Pending (Sprint 5-6) |
| **Mobile Apps** | ⬜ Not Started | 0% | Pending (Sprint 7-13) |
| **Admin Dashboard** | ⬜ Not Started | 0% | Pending (Sprint 13-15) |

### Completed Infrastructure (Ready to Use)

✅ **Backend Server:** Fully bootstrapped Express server with:
- Health check endpoint
- 9 route modules mounted
- Global middleware stack (helmet, CORS, error handler)
- Socket.IO attached with handler registrations
- Winston logger configured
- Environment variable loading (dotenv)

✅ **Service Clients:** All integrations initialized:
- Supabase (via @supabase/supabase-js)
- Redis (via ioredis)
- Typesense (via typesense npm package)
- Cloudflare R2 (via @aws-sdk/client-s3)
- All other services (Cashfree, MSG91, FCM, Ola Maps)

✅ **Middleware Scaffolding:**
- Auth (JWT verification)
- Role Guard (customer/shop_owner/delivery/admin)
- Rate Limiter (Redis-backed)
- Validation (Joi schema)
- Error Handler (centralized)

✅ **Development Setup:**
- docker-compose.yml (Redis, Typesense, API)
- .env.example (all required variables)
- package.json (all dependencies)
- ESLint configuration

---

## Directory Structure

### Root Level

```
nearby/
├── CLAUDE.md                          ← Project context (ALWAYS read first)
├── README.md                          ← Human-readable overview
├── docker-compose.yml                 ← Local dev environment
├── .env.example                       ← Template for secrets
├── package-lock.json                  ← Dependency lock (npm)
└── .gitignore                         ← Git ignore rules
```

### `/docs` — Documentation

```
docs/
├── ARCHITECTURE.md                    ← System design (NEW)
├── CODEBASE.md                        ← Navigation guide (NEW - YOU ARE HERE)
├── CLAUDE.md                          ← Project rules (checked into repo)
├── API_CHANGELOG.md                   ← API endpoint history
├── CODING_CONVENTIONS.md              ← Code style guide
├── PRD.html                           ← Product requirements
├── SETUP.md                           ← Installation & local dev
├── SPRINT_PLAN.md                     ← 16-week roadmap
├── GITHUB_STRUCTURE.md                ← Repository organization
├── API.md                             ← Endpoint documentation (TODO)
├── FLOWS.md                           ← User journey flows (TODO)
├── EDGE_CASES.md                      ← Edge case handling (TODO)
│
├── ADR/                               ← Architecture Decision Records
│   ├── ADR-001-cashfree.md           ← Why Cashfree (not Razorpay)
│   ├── ADR-002-typesense.md          ← Why Typesense (not Elasticsearch)
│   └── ADR-003-digitalocean.md       ← Why DigitalOcean (not AWS)
│
├── architecture/                      ← Visual diagrams (PNG/SVG)
│   ├── 01_auth_flow.svg
│   ├── 02_order_lifecycle.svg
│   ├── 03_payment_flow.svg
│   ├── 04_delivery_tracking.svg
│   ├── 05_search_flow.svg
│   ├── 06_real_time_architecture.svg
│   ├── 07_database_schema.svg
│   ├── 08_deployment_diagram.svg
│   ├── 09_security_model.svg
│   ├── 10_monitoring_setup.svg
│   ├── 11_notification_system.svg
│   ├── 12_cache_strategy.svg
│   ├── 13_queue_architecture.svg
│   ├── 14_geo_indexing.svg
│   ├── 15_rate_limiting.svg
│   └── 16_admin_dashboard_architecture.svg
│
└── flows/                             ← User journey flows (HTML/SVG)
    ├── F1_customer_login.html
    ├── F2_customer_browse.html
    ├── F3_order_creation.html
    ├── F4_order_tracking.html
    ├── F5_order_review.html
    ├── F6_shop_owner_registration.html
    ├── F7_shop_owner_dashboard.html
    ├── F8_delivery_assignment.html
    ├── F9_delivery_tracking.html
    ├── F10_payment_flow.html
    ├── F11_admin_kyc_review.html
    ├── F12_admin_disputes.html
    ├── F13_ratings_and_trust.html
    ├── F14_notification_system.html
    ├── F15_search_and_discovery.html
    ├── F16_chat_pre_order.html
    ├── F17_refunds_and_cancellations.html
    ├── F18_analytics_dashboard.html
    ├── F19_settlement_payouts.html
    └── F20_emergency_support.html
```

### `/backend` — Node.js API Server

```
backend/
├── src/
│   ├── index.js                       ← Entry point (Express + Socket.IO setup)
│   │   ✅ DONE: Server bootstrapped
│   │   ⏳ TODO: Start listening on port
│   │
│   ├── routes/                        ← Route handlers (domain-based)
│   │   ├── auth.js                    ← Authentication (OTP, JWT)
│   │   │   ⏳ TODO: POST /send-otp, POST /verify-otp, POST /logout
│   │   ├── shops.js                   ← Shop CRUD & KYC
│   │   │   ⏳ TODO: GET/POST/PATCH, KYC upload
│   │   ├── products.js                ← Product catalog
│   │   │   ⏳ TODO: CRUD, bulk import, image upload
│   │   ├── orders.js                  ← Order lifecycle
│   │   │   ⏳ TODO: POST (create), PATCH (status update)
│   │   ├── delivery.js                ← Delivery assignments
│   │   │   ⏳ TODO: GET assignments, PATCH location
│   │   ├── payments.js                ← Cashfree webhooks
│   │   │   ⏳ TODO: POST /webhook, GET /status
│   │   ├── reviews.js                 ← Ratings & feedback
│   │   │   ⏳ TODO: POST review, GET by shop
│   │   ├── search.js                  ← Typesense queries
│   │   │   ⏳ TODO: GET /shops, GET /products
│   │   └── admin.js                   ← Admin operations
│   │       ⏳ TODO: KYC approval, dispute resolution
│   │
│   ├── middleware/                    ← Request processing
│   │   ├── auth.js                    ← JWT verification
│   │   │   ✅ SCAFFOLD: Router created
│   │   │   ⏳ TODO: Verify signature, set req.user
│   │   ├── roleGuard.js               ← Role-based access
│   │   │   ✅ SCAFFOLD: Router created
│   │   │   ⏳ TODO: Check user.role against allowed[]
│   │   ├── rateLimit.js               ← Redis-backed rate limiting
│   │   │   ✅ SCAFFOLD: Router created
│   │   │   ⏳ TODO: Sliding window counter
│   │   ├── validate.js                ← Joi schema validation
│   │   │   ✅ SCAFFOLD: Router created
│   │   │   ⏳ TODO: req.body validation, error response
│   │   ├── errorHandler.js            ← Centralized error handling
│   │   │   ✅ SCAFFOLD: Router created
│   │   │   ⏳ TODO: Catch & standardize errors
│   │   └── index.js                   ← Export all middleware
│   │
│   ├── services/                      ← Third-party integrations
│   │   ├── supabase.js                ← Database client
│   │   │   ✅ DONE: Client initialized
│   │   │   ⏳ TODO: Query helper functions
│   │   ├── redis.js                   ← Cache & pub/sub
│   │   │   ✅ DONE: Client initialized
│   │   │   ⏳ TODO: Helper functions (OTP, geo, cache)
│   │   ├── typesense.js               ← Full-text search
│   │   │   ✅ DONE: Client initialized
│   │   │   ⏳ TODO: Index/search functions
│   │   ├── r2.js                      ← Cloudflare R2
│   │   │   ✅ DONE: S3 client initialized
│   │   │   ⏳ TODO: Upload/download/sign URL functions
│   │   ├── cashfree.js                ← Payment gateway
│   │   │   ✅ DONE: API client initialized
│   │   │   ⏳ TODO: Create order, handle webhook
│   │   ├── msg91.js                   ← SMS/OTP provider
│   │   │   ✅ DONE: HTTP client initialized
│   │   │   ⏳ TODO: Send OTP, send SMS
│   │   ├── fcm.js                     ← Firebase push
│   │   │   ✅ DONE: FCM client initialized
│   │   │   ⏳ TODO: Send notification
│   │   ├── olaMaps.js                 ← Maps API
│   │   │   ✅ DONE: API client initialized
│   │   │   ⏳ TODO: Geocode, distance matrix, ETA
│   │   └── index.js                   ← Export all services
│   │
│   ├── jobs/                          ← BullMQ async jobs
│   │   ├── worker.js                  ← Job queue processor
│   │   │   ⏳ TODO: Connect to Redis, register handlers
│   │   ├── notifyShop.js              ← Order → Shop notification
│   │   │   ⏳ TODO: Send FCM + SMS to shop
│   │   ├── assignDelivery.js          ← Find & assign delivery partner
│   │   │   ⏳ TODO: Redis GEO query, send assignment
│   │   ├── autoCancel.js              ← 3-minute order timeout
│   │   │   ⏳ TODO: Scheduled job, cancel logic
│   │   ├── notifyCustomer.js          ← Order status → Customer
│   │   │   ⏳ TODO: Send FCM + SMS to customer
│   │   ├── trustScore.js              ← Nightly trust score recompute
│   │   │   ⏳ TODO: Scheduled job, formula calculation
│   │   ├── analyticsAggregate.js      ← Nightly metrics
│   │   │   ⏳ TODO: Aggregate shop daily stats
│   │   └── earningsSummary.js         ← Weekly shop payouts
│   │       ⏳ TODO: Weekly summary email + SMS
│   │
│   ├── socket/                        ← Socket.IO handlers
│   │   ├── index.js                   ← Socket setup
│   │   │   ✅ SCAFFOLD: Listeners registered
│   │   │   ⏳ TODO: Connection/disconnect logging
│   │   ├── orderRoom.js               ← Order status events
│   │   │   ⏳ TODO: Listen for status changes, broadcast
│   │   ├── gpsTracker.js              ← Delivery partner GPS
│   │   │   ⏳ TODO: Accept GPS, store in Redis, calculate ETA
│   │   └── chat.js                    ← Pre-order chat
│   │       ⏳ TODO: Message handling, room management
│   │
│   ├── utils/                         ← Utility functions
│   │   ├── logger.js                  ← Winston logger
│   │   │   ✅ DONE: Logger configured
│   │   │   ⏳ TODO: Structured logging throughout
│   │   ├── errors.js                  ← Standard error codes
│   │   │   ⏳ TODO: Define all error codes (ORDER_NOT_FOUND, etc.)
│   │   ├── idempotency.js             ← Idempotency key checking
│   │   │   ⏳ TODO: Check Redis for duplicate, store result
│   │   ├── response.js                ← Standard response formatter
│   │   │   ✅ SCAFFOLD: Created
│   │   │   ⏳ TODO: Wrapper function for { success, data, error }
│   │   └── validators.js              ← Joi schema definitions
│   │       ⏳ TODO: Schema for each request type
│   │
│   └── index.js                       ← (Duplicate of root src/index.js)
│
├── Dockerfile                         ← Container definition
│   ✅ DONE: Multi-stage build configured
│
├── package.json                       ← Dependencies
│   ✅ DONE: All required packages listed
│   ⏳ TODO: Post-install scripts, if any
│
├── .env.example                       ← Template for .env
│   ✅ DONE: All vars documented
│   ⏳ TODO: Fill with actual values before running
│
└── logs/                              ← Runtime logs (gitignored)
    └── (Generated at runtime)
```

### `/apps` — Client Applications

```
apps/
├── customer/                          ← Customer mobile app (React Native)
│   ├── src/
│   │   ├── screens/                   ← Page components
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── HomeScreen.tsx
│   │   │   ├── SearchScreen.tsx
│   │   │   ├── ShopDetailScreen.tsx
│   │   │   ├── CartScreen.tsx
│   │   │   ├── CheckoutScreen.tsx
│   │   │   ├── OrderTrackingScreen.tsx
│   │   │   ├── ProfileScreen.tsx
│   │   │   ├── ReviewScreen.tsx
│   │   │   └── ChatScreen.tsx
│   │   ├── components/                ← Reusable components
│   │   │   ├── ShopCard.tsx
│   │   │   ├── ProductCard.tsx
│   │   │   ├── OrderStatusBadge.tsx
│   │   │   ├── LiveMap.tsx
│   │   │   ├── RatingModal.tsx
│   │   │   └── etc.
│   │   ├── hooks/                     ← Custom React hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useOrders.ts
│   │   │   ├── useSocket.ts
│   │   │   └── etc.
│   │   ├── services/                  ← API calls & Socket.IO
│   │   │   ├── api.ts                 ← HTTP client
│   │   │   ├── socket.ts              ← Socket.IO setup
│   │   │   └── auth.ts
│   │   ├── store/                     ← Zustand state management
│   │   │   ├── authStore.ts
│   │   │   ├── cartStore.ts
│   │   │   ├── orderStore.ts
│   │   │   └── etc.
│   │   ├── navigation/                ← React Navigation
│   │   │   ├── RootNavigator.tsx
│   │   │   ├── AuthNavigator.tsx
│   │   │   └── AppNavigator.tsx
│   │   └── App.tsx                    ← Entry point
│   ├── app.json                       ← Expo config
│   └── package.json                   ← Dependencies
│   ⏳ ALL: Not yet implemented
│
├── shop/                              ← Shop owner app (React Native)
│   ├── src/
│   │   ├── screens/
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── DashboardScreen.tsx
│   │   │   ├── OrderQueueScreen.tsx
│   │   │   ├── ProductListScreen.tsx
│   │   │   ├── AddProductScreen.tsx
│   │   │   ├── AnalyticsScreen.tsx
│   │   │   ├── SettingsScreen.tsx
│   │   │   └── KYCScreen.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── store/
│   │   └── navigation/
│   ├── app.json
│   └── package.json
│   ⏳ ALL: Not yet implemented
│
├── delivery/                          ← Delivery partner app (React Native)
│   ├── src/
│   │   ├── screens/
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── AssignmentQueueScreen.tsx
│   │   │   ├── ActiveDeliveryScreen.tsx (with live map)
│   │   │   ├── EarningsScreen.tsx
│   │   │   ├── ProfileScreen.tsx
│   │   │   └── etc.
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── store/
│   │   └── navigation/
│   ├── app.json
│   └── package.json
│   ⏳ ALL: Not yet implemented
│
└── admin/                             ← Admin dashboard (React + Vite)
    ├── src/
    │   ├── pages/
    │   │   ├── LoginPage.tsx
    │   │   ├── DashboardPage.tsx
    │   │   ├── KYCReviewPage.tsx
    │   │   ├── DisputeResolutionPage.tsx
    │   │   ├── ShopAnalyticsPage.tsx
    │   │   ├── UserManagementPage.tsx
    │   │   ├── SettingsPage.tsx
    │   │   └── ReportsPage.tsx
    │   ├── components/
    │   │   ├── DataTable.tsx
    │   │   ├── KYCDocumentViewer.tsx
    │   │   ├── ApprovalModal.tsx
    │   │   ├── Chart.tsx
    │   │   └── etc.
    │   ├── api/
    │   │   ├── adminApi.ts
    │   │   └── hooks/
    │   ├── store/
    │   │   └── adminStore.ts
    │   ├── styles/
    │   │   └── globals.css
    │   └── App.tsx
    ├── vite.config.ts
    ├── tailwind.config.ts
    └── package.json
    ⏳ ALL: Not yet implemented
```

### `/supabase` — Database

```
supabase/
└── migrations/                        ← Numbered SQL migrations
    ├── 001_profiles.sql               ← Users table
    ├── 002_shops.sql                  ← Shop details
    ├── 003_products.sql               ← Product catalog
    ├── 004_orders.sql                 ← Order lifecycle
    ├── 005_order_items.sql            ← Order line items
    ├── 006_reviews.sql                ← Ratings & feedback
    ├── 007_disputes.sql               ← Dispute tracking
    ├── 008_analytics.sql              ← Daily metrics
    └── 009_rls_policies.sql           ← Row-level security
    ⏳ ALL: Not yet written
```

---

## What's Been Built

### ✅ Backend Infrastructure (Ready to Extend)

All skeleton files exist and can be filled in with logic:

```
Backend Server
├── Entry point (src/index.js)
│   └─ Imports all routes & middleware
│   └─ Attaches Socket.IO
│   └─ Starts listening (NEEDS: PORT logic)
│
├── 9 Route modules (all mounted)
│   └─ auth, shops, products, orders, delivery, payments, reviews, search, admin
│   └─ NEED: Endpoint implementation inside each
│
├── 5 Middleware (all registered)
│   └─ auth, roleGuard, rateLimit, validate, errorHandler
│   └─ NEED: Logic inside each
│
├── 8 Service clients (all initialized)
│   └─ Supabase, Redis, Typesense, R2, Cashfree, MSG91, FCM, Ola Maps
│   └─ READY: Clients are connected, need to use them
│
├── 7 BullMQ job definitions (skeleton)
│   └─ NEED: Job handler functions
│
├── 3 Socket.IO handlers (skeleton)
│   └─ NEED: Event listeners & broadcasters
│
└── 4 Utility modules
    └─ logger (ready), errors (needs definitions), idempotency (skeleton), validators (skeleton)
```

### ✅ Dependencies & Tooling

```
✅ Express 4.x
✅ Socket.IO 4.x
✅ Redis (ioredis)
✅ Supabase client
✅ BullMQ
✅ Typesense
✅ All payment/SMS/push integrations
✅ Testing (Jest, Supertest)
✅ Linting (ESLint)
✅ Logging (Winston)
✅ Docker & docker-compose
```

### ✅ DevOps Setup

```
✅ docker-compose.yml (Redis + Typesense + API locally)
✅ Dockerfile (multi-stage build)
✅ .env.example (all vars documented)
✅ .gitignore (node_modules, .env, logs)
✅ package.json (scripts: dev, start, test, lint)
```

---

## What Needs Implementation

### 🔴 Critical Path for Sprint 1 (Foundation)

**Goal:** Any dev can OTP login end-to-end locally.

#### Database (Block)

**File:** `supabase/migrations/001-009.sql`

```sql
-- Priority 1: Create core tables
001_profiles.sql     — users table with roles
002_shops.sql        — shop records + KYC status
003_products.sql     — product catalog
004_orders.sql       — order lifecycle
005_order_items.sql  — line items
006_reviews.sql      — ratings
007_disputes.sql     — conflict resolution
008_analytics.sql    — daily metrics
009_rls_policies.sql — row-level security
```

**Status:** ⬜ Not started
**Effort:** 8-12 hours
**Depends on:** Supabase project created

#### Auth (Core Feature)

**Files:** `backend/src/routes/auth.js`, `backend/src/middleware/auth.js`

```javascript
// Route: POST /auth/send-otp
// 1. Validate phone number
// 2. Generate 6-digit OTP
// 3. Store in Redis (5-min TTL)
// 4. Send via MSG91 (DLT template)
// 5. Return success message

// Route: POST /auth/verify-otp
// 1. Validate phone + OTP
// 2. Check Redis for stored OTP
// 3. Enforce 3-attempt lockout (10-min on 3rd fail)
// 4. Issue JWT (1-week expiry)
// 5. Create/update profile in Supabase
// 6. Return JWT + user data

// Middleware: auth.js
// 1. Extract JWT from Authorization header
// 2. Verify signature using JWT_SECRET
// 3. Set req.user from payload
// 4. Pass to next handler (or reject)
```

**Status:** ⬜ Not started
**Effort:** 6-8 hours
**Depends on:** Database + Redis + MSG91 account

#### Routes Scaffold (Enable Testing)

**Files:** All route files in `backend/src/routes/`

```javascript
// Simple endpoint (example: GET /health)
// For each route file, create 1-2 test endpoints

// POST /auth/send-otp         → Send OTP
// POST /auth/verify-otp       → Verify & issue JWT
// GET /auth/me                → Get current user
// POST /auth/logout           → Invalidate session (Redis)

// (Other routes can be empty POST /shops, etc. for now)
```

**Status:** ⏳ Partial (skeleton exists)
**Effort:** 2-4 hours
**Depends on:** Auth middleware working

### 🟠 Critical Path for Sprint 2 (Shop & Product)

**Goal:** Shop owner registers, uploads KYC, lists products. Searchable via Typesense.

#### Routes: Shop CRUD

**File:** `backend/src/routes/shops.js`

```javascript
// POST /shops                  → Create shop profile
// GET /shops/:id               → Get shop details
// PATCH /shops/:id             → Update shop info
// PATCH /shops/:id/kyc         → Upload KYC docs to R2
// PATCH /shops/:id/toggle      → Open/close shop + Typesense sync
```

**Status:** ⬜ Not started
**Effort:** 10 hours
**Depends on:** Database + R2 service

#### Routes: Product CRUD

**File:** `backend/src/routes/products.js`

```javascript
// POST /shops/:id/products     → Add single product
// POST /shops/:id/products/bulk → CSV import
// PATCH /products/:id          → Update stock/price + Typesense sync
// DELETE /products/:id         → Soft delete + Typesense sync
// GET /products/template       → Download CSV template
```

**Status:** ⬜ Not started
**Effort:** 12 hours
**Depends on:** Shop CRUD + Typesense service

#### Routes: Search

**File:** `backend/src/routes/search.js`

```javascript
// GET /search/shops            → Typesense query (geo + trust score)
// GET /search/products         → Cross-shop product search
```

**Status:** ⬜ Not started
**Effort:** 4 hours
**Depends on:** Typesense indexes created

#### Typesense Indexing

**File:** `backend/src/jobs/` (triggered on shop/product changes)

```javascript
// When shop created/updated:
// 1. Index shop in Typesense (with geo field)

// When shop is_open toggled:
// 1. Update Typesense (is_open: true/false)

// When product created:
// 1. Index product in Typesense

// When product stock/price changes:
// 1. Update Typesense

// When product deleted:
// 1. Remove from Typesense
// 2. Out-of-stock within 15 seconds
```

**Status:** ⬜ Not started
**Effort:** 6 hours
**Depends on:** Typesense service

### 🟡 Critical Path for Sprint 3-4 (Orders & Payments)

**Goal:** Customer places order → Shop gets notified → Payment works.

#### Routes: Orders

**File:** `backend/src/routes/orders.js`

```javascript
// POST /orders                 → Create order (server-side price calc)
// GET /orders/:id              → Get order details
// PATCH /orders/:id/accept     → Shop accepts (assign delivery)
// PATCH /orders/:id/status     → Update status (packing, ready, etc.)
// PATCH /orders/:id/cancel     → Cancel (if cancellable)
// GET /customers/orders        → List customer's orders
// GET /shops/orders            → List shop's orders
```

**Status:** ⬜ Not started
**Effort:** 16 hours
**Depends on:** Database + Idempotency + BullMQ

#### Routes: Payments

**File:** `backend/src/routes/payments.js`

```javascript
// POST /payments/initiate      → Start Cashfree flow
// POST /payments/webhook       → Cashfree callback (HMAC verify)
// GET /payments/status         → Check payment status
// POST /payments/refund        → Manual refund trigger
```

**Status:** ⬜ Not started
**Effort:** 8 hours
**Depends on:** Cashfree account + HMAC library

#### BullMQ Jobs

**Files:** `backend/src/jobs/*.js`

```javascript
// notifyShop.js
// - Triggered when order placed
// - Send FCM + SMS to shop
// - Retry up to 3x

// autoCancel.js
// - Scheduled 3 min after order placed
// - Cancel if shop hasn't accepted
// - Send FCM to customer

// assignDelivery.js
// - Triggered when shop accepts
// - Query Redis GEO for nearby partners
// - Send FCM assignment notification

// notifyCustomer.js
// - Triggered on order status change
// - Send FCM + SMS to customer
```

**Status:** ⬜ Not started
**Effort:** 12 hours
**Depends on:** BullMQ + notification services

#### Socket.IO: Order Room

**File:** `backend/src/socket/orderRoom.js`

```javascript
// Join room: order:{orderId}
// Listen for: order:created, order:status_changed, order:accepted, etc.
// Broadcast to all participants (customer, shop, delivery, admin)
// Update ETA on GPS changes
```

**Status:** ⬜ Not started
**Effort:** 6 hours
**Depends on:** Socket.IO setup

### 🟡 Critical Path for Sprint 5-6 (Delivery & Real-time)

#### Routes: Delivery

**File:** `backend/src/routes/delivery.js`

```javascript
// GET /delivery/assignments    → List pending assignments
// POST /delivery/:id/accept    → Accept delivery job
// PATCH /delivery/:id/location → Update GPS location
// GET /delivery/:id/history    → Completed deliveries
```

**Status:** ⬜ Not started
**Effort:** 10 hours
**Depends on:** Orders + Socket.IO

#### Socket.IO: GPS Tracker

**File:** `backend/src/socket/gpsTracker.js`

```javascript
// Listen: delivery:gps_update (from delivery app, every 5s)
// 1. Store in Redis GEOADD
// 2. Calculate ETA via Ola Maps
// 3. Broadcast to order room (customer sees live location)
// 4. TTL 30s (auto-expire after delivery)
```

**Status:** ⬜ Not started
**Effort:** 6 hours
**Depends on:** Redis GEO + Ola Maps

#### BullMQ Job: Trust Score

**File:** `backend/src/jobs/trustScore.js`

```javascript
// Run nightly at 2 AM IST
// For each shop:
// 1. Query analytics table
// 2. Calculate: (rating × 0.40) + (completion × 0.35) + (response × 0.15) + (kyc × 0.10)
// 3. Update shops.trust_score
// 4. Reindex in Typesense
// 5. Broadcast new badges to admin
```

**Status:** ⬜ Not started
**Effort:** 8 hours
**Depends on:** Analytics table + Typesense

---

## Core Modules Explained

### Route Pattern (Example: Auth)

All routes follow this pattern:

```javascript
// backend/src/routes/auth.js
import { Router } from 'express'
import { validate } from '../middleware/validate.js'
import { auth } from '../middleware/auth.js'
import { rateLimit } from '../middleware/rateLimit.js'
import { msg91 } from '../services/msg91.js'
import { redis } from '../services/redis.js'
import { supabase } from '../services/supabase.js'
import { generateOTP, issueJWT } from '../utils/helpers.js'

const router = Router()

// Public: Send OTP
router.post('/send-otp',
  rateLimit({ max: 5, window: 60 }),  // 5 per minute
  validate(sendOtpSchema),             // Validate request
  async (req, res, next) => {
    try {
      const { phone } = req.body
      
      // Check lockout
      const lockoutKey = `otp:lockout:${phone}`
      if (await redis.get(lockoutKey)) {
        return res.status(429).json({
          success: false,
          error: { code: 'OTP_LOCKED', message: 'Too many attempts. Try in 10 minutes.' }
        })
      }
      
      // Generate OTP
      const otp = generateOTP()
      await redis.setex(`otp:${phone}`, 300, otp)  // 5-min TTL
      
      // Send via MSG91
      await msg91.send({ to: phone, message: `Your OTP is ${otp}` })
      
      res.json({
        success: true,
        data: { message: 'OTP sent to your phone' }
      })
    } catch (err) {
      next(err)
    }
  }
)

// Public: Verify OTP & issue JWT
router.post('/verify-otp',
  rateLimit({ max: 5, window: 60 }),
  validate(verifyOtpSchema),
  async (req, res, next) => {
    try {
      const { phone, otp } = req.body
      
      // Check attempts
      const attemptsKey = `otp:attempts:${phone}`
      const attempts = await redis.incr(attemptsKey)
      
      if (attempts > 3) {
        await redis.setex(`otp:lockout:${phone}`, 600, '1')  // 10-min lockout
        return res.status(429).json({
          success: false,
          error: { code: 'OTP_LOCKED', message: 'Locked for 10 minutes' }
        })
      }
      
      // Verify OTP
      const storedOtp = await redis.get(`otp:${phone}`)
      if (storedOtp !== otp) {
        return res.status(401).json({
          success: false,
          error: { code: 'INVALID_OTP', message: 'Incorrect OTP' }
        })
      }
      
      // Clean up
      await redis.del(`otp:${phone}`, attemptsKey)
      
      // Create/update profile
      const { data: user, error } = await supabase
        .from('profiles')
        .upsert({ phone, role: 'customer' }, { onConflict: 'phone' })
        .select()
        .single()
      
      if (error) throw error
      
      // Issue JWT
      const token = issueJWT({ userId: user.id, phone, role: user.role })
      
      res.json({
        success: true,
        data: { token, user }
      })
    } catch (err) {
      next(err)
    }
  }
)

// Protected: Get current user
router.get('/me',
  auth(),             // JWT verification
  async (req, res) => {
    res.json({
      success: true,
      data: { user: req.user }
    })
  }
)

export default router
```

### Middleware Pattern (Example: roleGuard)

```javascript
// backend/src/middleware/roleGuard.js
export const roleGuard = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'NOT_AUTHENTICATED', message: 'JWT required' }
      })
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: `Role ${req.user.role} not allowed` }
      })
    }
    
    next()
  }
}

// Usage in routes:
router.post('/admin/reports',
  auth(),
  roleGuard(['admin']),  // Only admin
  async (req, res) => { ... }
)
```

### Service Pattern (Example: Supabase)

```javascript
// backend/src/services/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// Usage in routes:
const orders = await supabase
  .from('orders')
  .select('*, shops(*), order_items(*)')
  .eq('customer_id', userId)
  .order('created_at', { ascending: false })
  .range(0, 19)
```

### BullMQ Job Pattern (Example: notifyShop)

```javascript
// backend/src/jobs/notifyShop.js
import { Queue } from 'bullmq'
import { redis } from '../services/redis.js'
import { fcm } from '../services/fcm.js'
import { msg91 } from '../services/msg91.js'
import logger from '../utils/logger.js'

const queue = new Queue('notify-shop', {
  connection: redis
})

// Producer: Queue job (called from routes/orders.js)
export const queueNotifyShop = async (orderId, shopData) => {
  await queue.add(
    'notify-shop',
    { orderId, shopData },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: false
    }
  )
}

// Consumer: Handle job (called from jobs/worker.js)
export const handleNotifyShop = async (job) => {
  const { orderId, shopData } = job.data
  
  try {
    const shopOwner = await supabase
      .from('profiles')
      .select('fcm_token, phone')
      .eq('id', shopData.owner_id)
      .single()
    
    // FCM (high priority)
    if (shopOwner.fcm_token) {
      await fcm.send({
        token: shopOwner.fcm_token,
        notification: {
          title: 'New Order!',
          body: `Order #${orderId}`,
          priority: 'high'
        }
      })
    }
    
    // SMS (fallback)
    await msg91.send({
      to: shopOwner.phone,
      message: `New order #${orderId}. ₹${shopData.total}`
    })
    
    logger.info({ event: 'shop_notified', orderId })
  } catch (err) {
    logger.error({ event: 'notify_shop_failed', orderId, error: err.message })
    throw err  // Trigger retry
  }
}
```

### Socket.IO Handler Pattern (Example: orderRoom)

```javascript
// backend/src/socket/orderRoom.js
export const registerOrderRoom = (io, socket) => {
  // Customer/Shop/Delivery join order room
  socket.on('order:join', ({ orderId, userId, role }) => {
    socket.join(`order:${orderId}`)
    logger.info({
      event: 'user_joined_order_room',
      orderId,
      userId,
      role
    })
  })
  
  // Shop accepts order → broadcast to all
  socket.on('order:accepted', ({ orderId, shopData }) => {
    io.to(`order:${orderId}`).emit('order:status_changed', {
      status: 'accepted',
      acceptedAt: new Date(),
      estimatedReadyTime: shopData.readyTime
    })
    logger.info({ event: 'order_accepted', orderId })
  })
  
  // Delivery partner status update → broadcast
  socket.on('delivery:status_update', ({ orderId, status }) => {
    io.to(`order:${orderId}`).emit('order:status_changed', {
      status,  // 'picked_up', 'out_for_delivery', 'delivered'
      updatedAt: new Date()
    })
  })
}
```

---

## Development Workflow

### Local Setup

```bash
# 1. Clone repo
git clone https://github.com/nearby-app/nearby.git
cd nearby

# 2. Install dependencies
npm install
cd backend && npm install && cd ..

# 3. Create .env from template
cp backend/.env.example backend/.env
# (Fill in actual secrets)

# 4. Start local environment
docker-compose up
# Spins up Redis (6379), Typesense (8108), API (3000)

# 5. Run backend in dev mode
cd backend
npm run dev
# Listens on localhost:3000, auto-reloads on file changes

# 6. Test health endpoint
curl http://localhost:3000/health
# Should return: { status: 'ok', version: '1.0.0' }
```

### Making Changes

```bash
# 1. Create feature branch
git checkout -b feat/auth-otp
# (Branches: feat/*, fix/*, refactor/*, docs/*)

# 2. Make changes & test locally
npm run test

# 3. Lint & format
npm run lint

# 4. Commit with descriptive message
git commit -m "feat: implement OTP send & verify endpoints"
# (Follow: <type>(<scope>): <subject> — see CODING_CONVENTIONS.md)

# 5. Push & create PR
git push -u origin feat/auth-otp
gh pr create --title "Auth: OTP login" --body "..."

# 6. Get reviewed
# (Wait for code-reviewer + security-reviewer)

# 7. Merge
gh pr merge <PR_NUMBER> --squash
```

### Testing Endpoints (Manual)

```bash
# Send OTP
curl -X POST http://localhost:3000/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{ "phone": "+919876543210" }'

# Verify OTP (with the OTP from logs/Redis)
curl -X POST http://localhost:3000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{ "phone": "+919876543210", "otp": "123456" }'

# Use returned JWT
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### Running Tests

```bash
# Unit tests (all *.test.js files)
npm run test

# With coverage
npm run test -- --coverage

# Watch mode (re-run on file change)
npm run test -- --watch

# Specific test file
npm run test -- auth.test.js
```

---

## Common Tasks & Recipes

### Add a New Route

**Example:** Add `POST /shops/:id/products`

1. **Create schema** (`backend/src/utils/validators.js`):
   ```javascript
   export const createProductSchema = Joi.object({
     name: Joi.string().required(),
     price_paise: Joi.number().integer().positive().required(),
     stock: Joi.number().integer().min(0).required()
   })
   ```

2. **Add handler** (`backend/src/routes/products.js`):
   ```javascript
   router.post('/:shopId/products',
     auth(),
     roleGuard(['shop_owner']),
     validate(createProductSchema),
     async (req, res, next) => {
       try {
         const { shopId } = req.params
         const { name, price_paise, stock } = req.body
         
         // Verify shop ownership
         const shop = await supabase.from('shops').select('*').eq('id', shopId).single()
         if (shop.owner_id !== req.user.userId) {
           return res.status(403).json({ success: false, error: { code: 'FORBIDDEN' } })
         }
         
         // Insert product
         const product = await supabase
           .from('products')
           .insert([{ shop_id: shopId, name, price_paise, stock }])
           .select()
           .single()
         
         // Index in Typesense
         await typesense.collections('products').documents().create({
           id: product.id,
           name,
           shop_id: shopId,
           price_paise,
           in_stock: stock > 0
         })
         
         res.json({ success: true, data: product })
       } catch (err) {
         next(err)
       }
     }
   )
   ```

3. **Write test** (`backend/tests/routes/products.test.js`):
   ```javascript
   describe('POST /api/v1/products/:shopId/products', () => {
     it('should create product for shop owner', async () => {
       const res = await request(app)
         .post(`/api/v1/products/${shopId}/products`)
         .set('Authorization', `Bearer ${token}`)
         .send({ name: 'Milk', price_paise: 5000, stock: 10 })
       
       expect(res.status).toBe(201)
       expect(res.body.data.name).toBe('Milk')
     })
   })
   ```

### Queue a Background Job

**Example:** Notify shop when order placed

1. **Producer** (in `routes/orders.js`):
   ```javascript
   import { queueNotifyShop } from '../jobs/notifyShop.js'
   
   const order = await supabase.from('orders').insert([...]).select().single()
   await queueNotifyShop(order.id, { owner_id: shop.owner_id })
   ```

2. **Consumer** (in `jobs/worker.js`):
   ```javascript
   import { handleNotifyShop } from './notifyShop.js'
   
   queue.process('notify-shop', handleNotifyShop)
   ```

### Add a Socket.IO Event

**Example:** Broadcast order status change

1. **Emitter** (in `routes/orders.js`):
   ```javascript
   const io = require('../socket/index.js').getIO()
   
   io.to(`order:${orderId}`).emit('order:status_changed', {
     status: 'accepted',
     timestamp: new Date()
   })
   ```

2. **Listener** (in client app):
   ```javascript
   useEffect(() => {
     socket.on('order:status_changed', (data) => {
       setOrderStatus(data.status)
       showNotification(`Order ${data.status}!`)
     })
   }, [socket])
   ```

### Debug Issues

```bash
# View logs
tail -f backend/logs/app.log

# Inspect Redis
redis-cli
> GET otp:+919876543210
> KEYS *

# Inspect database
supabase -p nearby db shell
> SELECT * FROM profiles LIMIT 5;

# Test API with verbose output
curl -v -X POST http://localhost:3000/api/v1/auth/send-otp ...

# Monitor background jobs
# (BullMQ has UI on localhost:3001 if enabled)
```

---

## Testing Strategy

### Test Pyramid

```
           /\              End-to-End (5%)
          /  \            - Critical user flows
         /────\           - Playwright tests
        /      \
       /        \         Integration (20%)
      /──────────\        - API endpoints (Supertest)
     /            \       - Database queries
    /              \      - Service integrations
   /                \
  /                  \    Unit (75%)
 /────────────────────\   - Functions, utils
/                      \  - Middlewares (mocked)
─────────────────────────
```

### Unit Tests (Jest)

```javascript
// backend/tests/utils/validators.test.js
import Joi from 'joi'
import { createOrderSchema } from '../../src/utils/validators.js'

describe('Validators', () => {
  it('should validate correct order data', () => {
    const data = {
      shop_id: '123',
      items: [{ product_id: 'p1', qty: 2 }]
    }
    const { error } = createOrderSchema.validate(data)
    expect(error).toBeUndefined()
  })
  
  it('should reject order without shop_id', () => {
    const data = { items: [] }
    const { error } = createOrderSchema.validate(data)
    expect(error).toBeDefined()
  })
})
```

### Integration Tests (Supertest)

```javascript
// backend/tests/routes/auth.test.js
import request from 'supertest'
import { app } from '../../src/index.js'

describe('POST /api/v1/auth/send-otp', () => {
  it('should send OTP to phone', async () => {
    const res = await request(app)
      .post('/api/v1/auth/send-otp')
      .send({ phone: '+919876543210' })
    
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })
})
```

### Coverage Requirements

**Minimum: 80%**

```bash
npm run test -- --coverage
# Summary output:
# ├─ Statements: 82%
# ├─ Branches: 78% (⚠️ Below threshold)
# ├─ Functions: 85%
# └─ Lines: 83%
```

---

## Debugging & Logs

### Log Levels

```javascript
import logger from './utils/logger.js'

logger.info({ event: 'order_created', orderId })       // Normal flow
logger.warn({ event: 'stock_low', productId, stock })  // Worth noting
logger.error({ event: 'payment_failed', error })       // Error path
```

### Structured Logging (Winston)

```
2026-04-06T14:30:45Z [INFO] { "event": "auth:otp_sent", "phone": "+919876543210", "duration_ms": 142 }
2026-04-06T14:30:48Z [INFO] { "event": "auth:otp_verified", "userId": "abc-123", "role": "customer" }
2026-04-06T14:30:50Z [ERROR] { "event": "payment_webhook", "code": "SIGNATURE_MISMATCH", "orderId": "xyz-789" }
```

### Redis Debugging

```bash
redis-cli
MONITOR           # Watch all commands
KEYS "*otp*"      # Find OTP keys
GET otp:+919876543210
DEL otp:+919876543210
FLUSHALL          # Clear all (dev only!)
```

### Database Debugging

```bash
supabase -p nearby db shell

-- Check profiles
SELECT id, phone, role FROM profiles LIMIT 5;

-- Check recent orders
SELECT id, customer_id, status, created_at FROM orders ORDER BY created_at DESC LIMIT 10;

-- Check RLS policy
SELECT * FROM pg_policies WHERE tablename = 'orders';
```

---

## Deployment Pipeline

### CI/CD (GitHub Actions)

```yaml
# .github/workflows/test.yml
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm run lint
      - run: npm run test -- --coverage
```

### Pre-merge Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Linter passes (`npm run lint`)
- [ ] Coverage ≥ 80% (`npm run test -- --coverage`)
- [ ] No console.log in code
- [ ] No hardcoded secrets
- [ ] API response follows format: `{ success, data?, error? }`
- [ ] Database queries use parameterized statements
- [ ] All new endpoints documented in API.md

### Production Deployment (DigitalOcean + Coolify)

```bash
# 1. Merge to main
git checkout main
git pull origin main

# 2. Coolify detects new commit
# (Auto-deploys if CI/CD passes)

# 3. Verify deployment
curl https://api.nearby.app/health

# 4. Monitor logs
coolify logs nearby-api

# 5. Rollback if needed
coolify rollback nearby-api --previous
```

---

## Next Steps

### Immediate (This Week)

1. **Create Supabase migrations** — Database foundation
2. **Implement auth endpoints** — OTP + JWT
3. **Write auth tests** — Ensure lockout & JWT work
4. **Test locally** — Postman or cURL

### This Sprint (Sprint 1)

1. ✅ Set up infrastructure (done)
2. ⏳ Database migrations (in progress)
3. ⏳ Auth system (in progress)
4. ⏳ Test auth flow end-to-end
5. ⏳ Update docs with actual endpoint formats

### Next Sprint (Sprint 2)

1. Shop CRUD + KYC
2. Product CRUD + image upload
3. Typesense indexing
4. Search endpoints

---

## Quick Reference

| Task | Command |
|------|---------|
| Start dev server | `cd backend && npm run dev` |
| Run tests | `npm run test` |
| Check coverage | `npm run test -- --coverage` |
| Lint code | `npm run lint` |
| View logs | `tail -f backend/logs/app.log` |
| Connect to Redis | `redis-cli` |
| Connect to database | `supabase -p nearby db shell` |
| Create feature branch | `git checkout -b feat/name` |
| Create PR | `gh pr create --title "..." --body "..."` |

---

*Last Updated: April 6, 2026 | For questions, see CLAUDE.md or contact @nearby-team*
