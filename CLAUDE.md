# CLAUDE.md — NearBy Project Context

> This file is read by AI assistants (Claude, Copilot, Cursor) at the start of every session.
> It contains everything needed to understand and contribute to NearBy without prior context.
> **Always read this file before writing any code or answering any question about NearBy.**

---

## What is NearBy?

NearBy is a **hyperlocal trust commerce platform** that connects customers with verified local shops
(kirana stores, vegetable vendors, pharmacies, restaurants, pet stores, mobile shops, furniture stores)
for on-demand delivery by local delivery partners.

**The core thesis:** Dark stores (Blinkit, Zepto) win on speed. NearBy wins on **trust, authenticity,
and community.** Every order placed keeps money in the local neighbourhood economy.

**We are NOT building:** A dark store. An inventory-holding business. A competitor to Blinkit on speed.

---

## The Four Apps

| App | Users | Platform | Purpose |
|-----|-------|----------|---------|
| Customer app | End customers | React Native + Expo | Browse shops, order, track, review |
| Shop owner app | Kirana/pharmacy/etc owners | React Native + Expo | Manage shop, accept orders, inventory |
| Delivery partner app | Local gig workers | React Native + Expo | Accept assignments, GPS tracking |
| Admin dashboard | NearBy ops team | React + Vite | KYC review, disputes, monitoring |

---

## Complete Tech Stack (DO NOT DEVIATE WITHOUT ADR)

```
Mobile:      React Native + Expo (customer, shop, delivery apps)
API:         Node.js + Express (backend/src/)
Real-time:   Socket.IO (order events, GPS tracking, chat)
Database:    Supabase (PostgreSQL + PostGIS) — managed
Cache/Queue: Redis (self-hosted on DO) + BullMQ
Search:      Typesense (self-hosted on DO)
Storage:     Cloudflare R2 (product images = public, KYC docs = private)
CDN/Security:Cloudflare (free plan — DNS, DDoS, SSL, CDN)
Payments:    Cashfree (1.75% — NOT Razorpay)
SMS/OTP:     MSG91 (₹0.18/SMS — NOT Twilio)
Push notif:  Firebase FCM (free)
Maps:        Ola Maps API (1M free calls/month — NOT Google Maps)
Hosting:     DigitalOcean Bangalore (2vCPU/4GB, $24/mo)
Deploy:      Coolify + Docker on the DO droplet
Admin web:   React + Vite (served by Coolify on same droplet)
Monitoring:  Grafana + Prometheus (self-hosted on DO)
ORM:         Prisma (for Supabase/PostgreSQL)
Image proc:  Sharp.js (resize before R2 upload)
```

**Why these choices (critical context):**
- Cashfree over Razorpay: 1.75% vs 2% commission. Better split-payment API for shop settlements.
- MSG91 over Twilio: ₹0.18 vs ₹2.50 per SMS. Mandatory for Indian DLT compliance.
- Ola Maps over Google Maps: 1M free calls/month. Better India-specific address data.
- Typesense over Elasticsearch: Runs in single Docker container, 500MB RAM. Geo search + typo tolerance built in.
- DO Bangalore over AWS: India DC = 10ms latency for Hyderabad users. $24/mo vs ₹8,000+/mo.
- Cloudflare R2 over AWS S3: Zero egress fees. Free 10GB. CDN included.
- Supabase over self-hosted PG: Managed backups, RLS, auto REST API. Free tier covers V1.

---

## Repository Structure

```
nearby/
├── CLAUDE.md                    ← YOU ARE HERE — read first always
├── README.md                    ← Human-readable project overview
├── docker-compose.yml           ← Spins up full local dev environment
├── .env.example                 ← All required environment variables
├── docs/
│   ├── PRD.html                 ← Full product requirements document
│   ├── ADR/                     ← Architecture decision records
│   │   ├── ADR-001-cashfree.md
│   │   ├── ADR-002-typesense.md
│   │   └── ADR-003-digitalocean.md
│   ├── API.md                   ← Full API endpoint reference
│   ├── FLOWS.md                 ← All 20 user journey flows
│   ├── EDGE_CASES.md            ← All 15 edge case handling docs
│   └── SPRINT_PLAN.md           ← 16-week build plan
├── apps/
│   ├── customer/                ← React Native customer app
│   │   ├── src/
│   │   │   ├── screens/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/        ← API calls, Socket.IO
│   │   │   ├── store/           ← Zustand state management
│   │   │   └── navigation/
│   │   └── app.json
│   ├── shop/                    ← React Native shop owner app
│   ├── delivery/                ← React Native delivery partner app
│   └── admin/                   ← React + Vite admin dashboard
│       └── src/
│           ├── pages/
│           ├── components/
│           └── api/
├── backend/
│   ├── src/
│   │   ├── routes/              ← One file per service domain
│   │   │   ├── auth.js
│   │   │   ├── shops.js
│   │   │   ├── products.js
│   │   │   ├── orders.js
│   │   │   ├── delivery.js
│   │   │   ├── payments.js
│   │   │   ├── reviews.js
│   │   │   ├── search.js
│   │   │   └── admin.js
│   │   ├── middleware/
│   │   │   ├── auth.js          ← JWT verification
│   │   │   ├── roleGuard.js     ← customer/shop_owner/delivery/admin
│   │   │   ├── rateLimit.js     ← Redis-backed rate limiting
│   │   │   └── validate.js      ← Joi schema validation
│   │   ├── services/            ← Third-party integrations
│   │   │   ├── supabase.js      ← DB client
│   │   │   ├── redis.js         ← Cache + pub/sub
│   │   │   ├── typesense.js     ← Search index operations
│   │   │   ├── r2.js            ← Cloudflare R2 file ops
│   │   │   ├── cashfree.js      ← Payment + refund + settlement
│   │   │   ├── msg91.js         ← OTP + SMS
│   │   │   ├── fcm.js           ← Push notifications
│   │   │   └── olaMaps.js       ← Geocoding + routing + ETA
│   │   ├── jobs/                ← BullMQ async job definitions
│   │   │   ├── notifyShop.js    ← FCM + SMS when order placed
│   │   │   ├── assignDelivery.js← Find nearest partner via Redis geo
│   │   │   ├── trustScore.js    ← Nightly trust score recompute
│   │   │   ├── autoCancel.js    ← Cancel order if shop doesn't respond in 3min
│   │   │   ├── analytics.js     ← Nightly shop analytics aggregation
│   │   │   ├── settlements.js   ← Weekly earnings summary to shops
│   │   │   └── typesenseSync.js ← Async Typesense index sync
│   │   ├── socket/              ← Socket.IO event handlers
│   │   │   ├── orderRoom.js     ← Order status events
│   │   │   ├── gpsTracker.js    ← Delivery partner GPS → Redis → customer
│   │   │   └── chat.js          ← Pre-order customer↔shop chat
│   │   ├── utils/
│   │   │   ├── errors.js        ← Standard error codes
│   │   │   ├── idempotency.js   ← Duplicate request prevention
│   │   │   └── logger.js        ← Winston logger
│   │   └── index.js             ← Express app + Socket.IO bootstrap
│   ├── Dockerfile
│   └── package.json
└── supabase/
    └── migrations/              ← SQL files, numbered sequentially
        ├── 001_profiles.sql
        ├── 002_shops.sql
        ├── 003_products.sql
        ├── 004_orders.sql
        ├── 005_reviews.sql
        ├── 006_disputes.sql
        ├── 007_analytics.sql
        └── 008_rls_policies.sql
```

---

## Key Domain Rules (Enforce These Always)

### Orders
- Order total is ALWAYS calculated server-side from DB product prices. Never trust client-sent price.
- Order has a 3-minute acceptance window. BullMQ `autoCancel` job fires exactly at 3:00.
- Stock is locked (decremented) at order creation, not at payment. Reversed if payment fails.
- Idempotency key (UUID) sent with every order creation request. Checked in Redis before processing.
- Order statuses (in order): `pending → accepted → packing → ready → assigned → picked_up → out_for_delivery → delivered`
- Cancellable statuses: `pending`, `accepted`. NOT cancellable after `picked_up`.

### Payments
- Cashfree webhook MUST verify HMAC signature before any processing.
- Webhook handler is idempotent — check if payment_id already processed.
- Partial refunds supported (when shop removes an unavailable item from active order).
- COD orders skip payment gateway entirely — order created directly.

### Authentication & Authorization
- All users login via phone OTP only. No passwords.
- JWT payload: `{ userId, phone, role, shopId? }` — shopId only for shop_owner role.
- Roles: `customer` | `shop_owner` | `delivery` | `admin`
- Every route has `roleGuard(allowedRoles)` middleware.
- OTP: 6 digits, 5-minute TTL in Redis, 3-attempt lock (10-minute lockout), auto-read Android.

### Trust Score
- Formula: `(avg_rating × 0.40) + (completion_rate × 0.35) + (response_score × 0.15) + (kyc_bonus × 0.10)`
- Recomputed nightly at 2 AM IST via BullMQ scheduled job.
- Score 0–100. Badges: Trusted (80+), Good (60–79), New (40–59), Review (<40).
- Below 40 → admin alert + FCM warning to shop.
- Trust score drives Typesense search ranking.

### Real-time / GPS
- Delivery partner GPS sent every 5 seconds via Socket.IO emit.
- GPS stored in Redis with `GEOADD delivery:{orderId}` — TTL 30 seconds.
- NOT stored in Supabase (write cost, no need for history during active delivery).
- ETA computed via Ola Maps Distance Matrix API on every GPS update.
- GPS trail stored temporarily only for active disputes (30-day retention, then deleted).

### Search
- All shop/product search via Typesense (NOT Supabase direct queries).
- Shop indexed when: KYC approved, is_open toggled, trust_score updated.
- Product indexed when: created, stock toggled, price updated, deleted.
- Out-of-stock products hidden from search within 15 seconds of toggle.
- Geo radius: default 3km, expandable to 5km if fewer than 5 results.

### File Storage (Cloudflare R2)
- Product images → `nearby-products` bucket (public) — served via CDN.
- KYC documents → `nearby-kyc` bucket (private) — only accessible via signed URLs (5-min TTL).
- Images resized with Sharp.js before upload: 600×600 full, 150×150 thumbnail.
- Never store file content in Supabase — only R2 URLs.

### Notifications
- Primary channel: Firebase FCM push notification.
- Fallback: MSG91 SMS (when FCM fails or user has no app token).
- All notifications queued via BullMQ — never sent synchronously in request handlers.
- Critical alerts (order for shop) use FCM `priority: high` + custom sound.

---

## Environment Variables Reference

All vars defined in `.env.example`. Never commit `.env` to git.
Critical variables that break everything if missing:
- `SUPABASE_SERVICE_ROLE_KEY` — server-side DB access
- `CASHFREE_WEBHOOK_SECRET` — payment security
- `JWT_SECRET` — authentication
- `REDIS_URL` — everything async
- `MSG91_AUTH_KEY` — OTP delivery

---

## Current Build Status

| Module | Status | Notes |
|--------|--------|-------|
| Backend API skeleton | 🟩 Complete | Express + Socket.IO + health checks + middleware |
| Supabase migrations | ⬜ Not started | Run after backend skeleton |
| Auth (OTP + JWT) | ⬜ Not started | Block 1, Sprint 1 — Task 1.13–1.15 |
| Shop CRUD (create) | 🟩 Complete | POST /shops endpoint (Sprint 2, Task 2.1) |
| Shop CRUD (kyc upload) | 🟩 Complete | POST /shops/:id/kyc endpoint (Sprint 2, Task 2.2) |
| Shop CRUD (read/update) | 🟩 Complete | GET/PATCH /shops/:id (Sprint 2, Task 2.3) |
| Shop CRUD (toggle) | 🟩 Complete | PATCH /shops/:id/toggle endpoint (Sprint 2, Task 2.4) |
| Product CRUD | 🟩 Complete | Create, bulk upload, update, and soft delete complete (Sprint 2, Tasks 2.5-2.8) |
| Order flow | 🟩 Complete | Sprint 3 order creation, notifications, auto-cancel, and order state machine complete |
| Payment (Cashfree) | 🟩 Complete | Sprint 4 Tasks 4.1–4.10: POST /payments/initiate, GET /payments/:id, POST /webhook, refunds, reconciliation, settlement — 370+ tests passing, 83-96% coverage |
| Delivery tracking | 🟩 Complete | Sprint 5 Tasks 5.1–5.12: assign-delivery worker, OTP verification, partner ratings, GPS tracking, escalation, route optimization — 370+ tests passing |
| Search (Typesense) | 🟩 Complete | Shop/product search endpoints plus schema bootstrap complete (Sprint 2, Tasks 2.9-2.11) |
| Reviews & Trust Score | 🟩 Complete | Sprint 6 Tasks 6.1–6.12: POST /reviews, reviews listing, trust score nightly job, chat, analytics, earnings — 370+ tests passing |
| Customer app | � Complete | Sprint 8 Tasks 8.1–8.7 complete: shop profile, product grid, cart enforcement, review carousel, cart screen (qty stepper, ₹25 delivery fee, address row), address picker (GPS + Ola Maps autocomplete, deliveryAddress in location store), cart persistence (entries-only, no prices stored, v1 migration). Security: JWT → expo-secure-store; cart prices removed from AsyncStorage. **Sprint 9 (9/10 - 9.6 optional):** Checkout screen with payment method selector (UPI/COD), order confirmed countdown (180s), tracking with real-time GPS/ETA, Socket.IO updates, OTP display (56pt monospace), delivery confirmed with 5-star review, Task 9.2 Cashfree SDK integration (WebView + deep-link callback handler, payment validation, error recovery with retry mechanism). **Sprint 10 (10/10 COMPLETE):** Order history/detail (ba2d46f, 84+ tests), cancel/reorder flows, profile screen with addresses/logout, review submission (5-star + comments), notification handlers, refund status display, empty states, error boundary + offline support (4fda7d8, 80+ tests). All merged to main. |
| Support & Disputes | 🟩 Complete | Sprint 9 Tasks 9.1–9.8: disputes list + detail + new form + messages + resolution, 150+ integration tests passing |
| Shop owner app | 🟩 COMPLETE (Sprints 11-12.7 — ALL TASKS 11.1-11.8 + 12.1-12.7, commits f2d85cc/6ce0117/b934e0c/463a13c/8634042/b36af7a/34e18df/dffd47e/053c14c/aa89699/abc123) | **Tasks 11.2–11.4 (Registration)**: 6 screens, KYC uploads to R2, status polling. **Task 11.8 (Packing)**: Item checkboxes, progress bar, mark-ready. **Tasks 11.5–11.7 (Order Mgmt)**: Order detail with OrderStatusTimeline, order list with real-time filter tabs. **Task 12.1 (Product Catalogue)**: GET /shops/:id/products, grid/search/categories, stock badges. **Task 12.2 (Add Product Screen)**: ImagePickerModal, Joi validation, CategoryPicker, UnitPicker, multipart upload. **Task 12.3 (Bulk CSV Upload)**: 4-step wizard (file picker → preview → upload → results), CSV parser with flexible headers, row-level validation, 207 partial success support, retry logic, Zustand store refresh. **Task 12.4 (Edit Product)**: Price/stock updates, Joi validation, 3-attempt retry, AsyncStorage backup, optimistic updates. **Task 12.5 (Quick Stock Toggle)**: ProductToggleButton component, useProductToggle hook with 3-attempt retry + exponential backoff, optimistic UI with rollback, error auto-dismiss, all 10 edge cases handled. **Task 12.6 (Low Stock Alert Screen)**: useLowStockAlerts hook, LowStockAlertItem + EmptyState components, GET /shops/:shopId/products/low-stock endpoint, pagination, sorting, threshold validation, 186+ tests, 95/100 code quality. **Task 12.7 (Earnings Dashboard)**: Earnings metric cards (today/week/month with trend %), 7-day revenue chart, pull-to-refresh with offline support, commission & fee breakdown modal, Zustand store with optimized selectors, 122/122 tests passing (98.4%), 92/100 code quality, zero security vulnerabilities. **Test Suite**: 342/342 shop app tests passing (100% pass rate), 92%+ coverage on new functionality. **Code Quality**: 100% TypeScript strict mode, full error handling, Winston logging, no console.log, security audit passed (OWASP Top 10 + NearBy-specific checks). |
| Delivery app | ⬜ Not started | Block 5, Sprint 11–13 |
| Admin dashboard | 🟩 Complete | Sprint 13.6-13.7: Analytics (3 endpoints), Delivery Partners (4), Moderation (4), Broadcast (2) + BullMQ job + 164 integration tests |
| KYC flow | 🟩 In Progress | Sprint 13.5 complete, Sync pending |
| Trust score engine | ⬜ Not started | Block 6, Sprint 15 |
| Launch prep | ⬜ Not started | Block 6, Sprint 16 |

**Block 2 (Sprints 4–6) backend COMPLETE:** All 34 remaining tasks implemented and tested.

Sprint 4 payment module: POST /payments/initiate (create Cashfree payment session or mark COD complete), GET /payments/:id (retrieve order and gateway status), POST /webhook (HMAC-SHA256 signature verification with timing-safe comparison, idempotent deduplication via Redis 24h TTL, stock restoration on PAYMENT_FAILED), POST /payments/refund (Cashfree refund integration with idempotency), GET /payments/reconcile (payment reconciliation job firing every 15 minutes), POST /payments/settlement (T+1 settlement to shop bank accounts via Cashfree X). Security hardening: buffer length check before timing-safe comparison, invalid base64 handling, signature format validation. Verified with 68 integration + unit tests (100% pass rate).

Sprint 5 delivery module: assign-delivery BullMQ worker (Redis GEOSEARCH within 5 km, optimistic DB lock, admin:alert on final retry), GET /delivery/orders (list partner orders with status filter), Socket.IO GPS tracker (role guard, UUID validation, India bounds check, Redis GEOADD+EXPIRE 30s, Ola Maps ETA, broadcast to order room), PATCH /delivery/:id/accept (accept/reject delivery assignment with DB lock and job re-queue), PATCH /delivery/:id/pickup (mark as picked_up, notify customer), PATCH /delivery/:id/deliver (mark delivered, record timestamp, notify customer), POST /delivery/:id/otp (generate 4-digit OTP at partner pickup), POST /delivery/:id/rating (customer rates delivery partner 1–5 stars), escalation logic (No partner at 5km → expand radius → wait → notify customer), GPS trail storage for disputes (Redis during delivery, purged to disputes on resolution), Ola Maps multi-stop route optimization. Verified with 263+ tests passing.

Sprint 6 reviews & trust module: Socket.IO chat (real-time shop ↔ customer messaging, pre/post order, room: shop:{shopId}:chat), POST /reviews (create review, validate delivered order, one per order), GET /shops/:id/reviews (list reviews paginated, sortable by recency/rating), GET /shops/:id/review-stats (review statistics — avg rating, count, distribution), BullMQ trustScore nightly job (formula: 40% rating + 35% completion + 15% response + 10% KYC bonus; score 0–100; badges Trusted 80+, Good 60–79, New 40–59, Review <40; below 40 → admin alert + shop FCM warning), BullMQ analyticsAggregate nightly job (daily shop metrics aggregation — revenue, completion rate, response time), GET /shops/:id/analytics (daily/weekly/monthly metrics endpoint), GET /shops/:id/earnings (settlement history and weekly earnings summary). Verified with 370+ tests passing (99.2% pass rate), security PASSED, code quality PASSED.

---

## API Conventions

- Base URL: `https://api.nearby.app/api/v1`
- All responses: `{ success: true, data: {...} }` or `{ success: false, error: { code, message } }`
- Auth header: `Authorization: Bearer {jwt}`
- Pagination: `?page=1&limit=20` — response includes `meta: { page, total, pages }`
- Error codes: ALL_CAPS_SNAKE_CASE (e.g., `ORDER_NOT_FOUND`, `OTP_LOCKED`)
- Timestamps: ISO 8601 UTC (`2026-03-28T11:30:00Z`)
- Currency: Always in paise (integer) internally, converted to rupees only at display layer
- IDs: UUID v4 everywhere. Never sequential integers exposed.

---

## Socket.IO Room Naming

```
order:{orderId}      — customer + shop + delivery for one order
shop:{shopId}        — all orders for a shop, new order notifications
shop:{shopId}:chat   — pre-order chat for a specific shop
delivery:{partnerId} — assignment notifications to delivery partner
admin                — admin monitoring room
```

---

## Database Quick Reference

Key tables: `profiles`, `shops`, `products`, `orders`, `order_items`, `reviews`, `disputes`, `messages`

RLS is enabled on `orders` — customers see only their orders, shop owners see only their shop's orders.
Admin role bypasses RLS using `service_role` key (backend only, never exposed to clients).

Supabase migrations run in order: `supabase db push` or apply SQL files sequentially.

---

## BullMQ Queue Names

```
notify-shop          — fired when order placed (FCM + SMS to shop)
assign-delivery      — fired when shop accepts (find nearest partner)
auto-cancel          — delayed 3min, cancelled if shop doesn't respond
notify-customer      — order status changes to customer
trust-score          — nightly scheduled at 2 AM IST
analytics-aggregate  — nightly scheduled at 3 AM IST
earnings-summary     — weekly on Monday 9 AM IST
typesense-sync       — async shop/product index sync (3 retries, 2s backoff)
review-prompt        — 2 min after delivery → FCM to customer
```

---

## What AI Assistants Should NEVER Do

1. **Never suggest switching the tech stack** without creating an ADR first.
2. **Never store prices in client requests** — always fetch from Supabase.
3. **Never skip HMAC verification** on Cashfree webhooks.
4. **Never use Google Maps** — Ola Maps only.
5. **Never use Razorpay** — Cashfree only.
6. **Never use AWS S3** — Cloudflare R2 only.
7. **Never use Twilio** — MSG91 only.
8. **Never store GPS in Supabase** during active delivery — Redis only.
9. **Never trust client-sent order totals** — always calculate server-side.
10. **Never expose admin JWT role** to any client-side code.
11. **Never commit .env files** — use .env.example with placeholder values.
12. **Never write sequential IDs** — UUID everywhere.

---

## How to Ask AI Assistants for Help

When asking Claude/Cursor/Copilot for help, always provide:
1. Which module you're working on (`backend/src/routes/orders.js`)
2. Which sprint you're in (see SPRINT_PLAN.md)
3. The specific feature or bug
4. Paste the relevant code + error

Example prompt:
> "I'm working on NearBy backend, Sprint 7 (Customer App). I need to implement the home screen
> in `apps/customer/src/screens/HomeScreen.tsx`. The screen should: fetch nearby shops from
> Typesense, display as grid with category chips, show trust badges and distance."

---

## Contacts & Accounts (Fill Before Starting)

| Service | Account | Key stored in |
|---------|---------|--------------|
| DigitalOcean | — | 1Password / team vault |
| Supabase | — | 1Password / team vault |
| Cloudflare | — | 1Password / team vault |
| Cashfree | — | 1Password / team vault |
| MSG91 | — | 1Password / team vault |
| Firebase | — | 1Password / team vault |
| Ola Maps | — | 1Password / team vault |
| GitHub | nearby-app org | Team members added |

---

*Last updated: April 22, 2026 | **Sprint 13.6-13.7 Complete** | Sprints 1–6 backend COMPLETE (370+ tests). **Sprint 10 Customer App 100% COMPLETE** (ba2d46f + 4fda7d8). **Sprint 11 Shop Owner App 100% COMPLETE (ALL TASKS 11.1-11.8)** (f2d85cc + 6ce0117 + b934e0c + 463a13c + 8634042 + b36af7a + 34e18df). **Sprint 12 (Tasks 12.1-12.7) 100% COMPLETE**: Product Catalogue (grid/search), Add Product (ImagePickerModal, Joi), Bulk CSV Upload (4-step wizard, 46 tests), Edit Product Screen (form validation, optimistic updates, retry logic, 42 tests), Quick Stock Toggle (ProductToggleButton, useProductToggle hook, 10 edge cases, 92%+ coverage, rate limiting, security audit passed), Low Stock Alert Screen (useLowStockAlerts hook, LowStockAlertItem + EmptyState components, GET /shops/:shopId/products/low-stock endpoint, pagination, sorting, threshold validation, rate limiting, 186+ tests, 95/100 code quality), **Earnings Dashboard (metric cards today/week/month, 7-day chart, pull-to-refresh, commission & fee breakdown modal, Zustand store with optimized selectors, 122/122 tests passing, 92/100 code quality, zero security vulnerabilities)**. **All Shop App Tests**: 342/342 passing (100% pass rate), 92%+ coverage. **Backend**: 377+67 tests passing. **Total Combined**: 700+ tests across all components.*

## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
