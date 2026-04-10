# NearBy — 16-Week Sprint Plan

> Team: 2 React Native devs · 1 Node.js backend dev · 1 designer · 1 PM
> Start date: Week of [INSERT DATE]
> Launch target: Week 16 end

---

## How to Use This Document

- Each sprint = 1 week
- Tasks marked [BE] = Backend · [RN] = React Native · [DS] = Design · [DV] = DevOps
- Update the STATUS column as work progresses: ⬜ Not started · 🔵 In progress · ✅ Done · 🔴 Blocked
- At the start of each sprint, PM reviews this doc and updates the "Current Sprint" in README.md

---

## Block 1 — Foundation (Sprints 1–2)

### Sprint 1: Infrastructure & Auth

**Goal:** Every dev can run the full stack locally. OTP login works end-to-end.

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 1.1 | Create GitHub org + monorepo structure | [DV] | ⬜ | Follow structure in CLAUDE.md |
| 1.2 | Set up DigitalOcean Bangalore droplet | [DV] | ⬜ | 2vCPU/4GB, $24/mo |
| 1.3 | Install Coolify on DO droplet | [DV] | ⬜ | For container management |
| 1.4 | Set up Cloudflare domain + DNS | [DV] | ⬜ | api.nearby.app, cdn.nearby.app |
| 1.5 | Create Supabase project + run migration 001–008 | [BE] | ⬜ | All SQL files in supabase/migrations/ |
| 1.6 | Set up Redis on DO droplet via Coolify | [DV] | ⬜ | With persistence enabled |
| 1.7 | Set up Typesense on DO droplet via Coolify | [DV] | ⬜ | Create shops + products indexes |
| 1.8 | Set up Cloudflare R2 (public + private buckets) | [DV] | ⬜ | nearby-products, nearby-kyc |
| 1.9 | Bootstrap Node.js + Express project | [BE] | ✅ | Implemented in `backend/` with middleware stack, error handling, logging, Socket.IO bootstrapping. |
| 1.10 | Set up docker-compose.yml for local dev | [BE] | ✅ | `docker-compose.yml` present for local Redis + Typesense + API workflow. |
| 1.11 | Register MSG91 account + DLT template approval | [PM] | ⬜ | Takes 2–3 days — start immediately |
| 1.12 | Create Firebase project + FCM config | [DV] | ⬜ | Download google-services.json |
| 1.13 | Implement POST /auth/send-otp | [BE] | ✅ | Implemented in backend auth routes with Redis-backed OTP flow. |
| 1.14 | Implement POST /auth/verify-otp | [BE] | ✅ | Implemented with JWT issue and profile-linked auth flow. |
| 1.15 | Implement JWT middleware + roleGuard | [BE] | ✅ | `authenticate`, JWT verify, and role guards implemented for protected routes. |
| 1.16 | Set up GitHub Actions CI pipeline | [DV] | ⬜ | Run tests on every PR |
| 1.17 | Write tests for auth flow | [BE] | ✅ | Auth integration tests exist for OTP send/verify and lockout behavior. |

**Sprint 1 Definition of Done:** Any dev can `docker-compose up` and test OTP login via Postman.

---

### Sprint 2: Shop & Product Core

**Goal:** Shop owner can register, upload KYC, add products. Products searchable in Typesense.

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 2.1 | Implement POST /shops (create shop) | [BE] | ✅ | Implemented and integration-tested. |
| 2.2 | Implement POST /shops/:id/kyc | [BE] | ✅ | Multipart KYC upload to R2 private bucket with signed URL flow. |
| 2.3 | Implement GET/PATCH /shops/:id | [BE] | ✅ | Shop profile read/update implemented and tested. |
| 2.4 | Implement PATCH /shops/:id/toggle | [BE] | ✅ | Open/close flow implemented with async Typesense sync. |
| 2.5 | Implement POST /shops/:id/products | [BE] | ✅ | Single product create with optional image upload, R2 URL mapping, Typesense queue. |
| 2.6 | Implement POST /shops/:id/products/bulk | [BE] | ✅ | CSV parse/validate with partial success handling and non-blocking Typesense sync. |
| 2.7 | Implement PATCH /products/:id | [BE] | ✅ | Product price/stock update implemented with ownership checks and Typesense sync. |
| 2.8 | Implement DELETE /products/:id | [BE] | ✅ | Soft delete via `deleted_at` implemented with Typesense removal queue. |
| 2.9 | Implement GET /search/shops | [BE] | ✅ | Public Typesense geo search implemented with category/open filters and validation. |
| 2.10 | Implement GET /search/products | [BE] | ✅ | Public Typesense product search with `q`, optional category/shop filters, typo tolerance, and validation. |
| 2.11 | Set up Typesense shop + product schemas | [BE] | ✅ | Canonical `shops` + `products` schemas added with geo/trust/open/search fields and `npm run seed:typesense` bootstrap. |
| 2.12 | Implement Sharp.js image resize pipeline | [BE] | ✅ | Sharp-based 600×600 full + 150×150 thumbnail pipeline implemented and now unit-verified for resize + failure handling. |
| 2.13 | GET /products/template (CSV download) | [BE] | ✅ | CSV template download implemented with optional category-prefilled sample row. |
| 2.14 | Design: shop owner app wireframes | [DS] | ⬜ | Registration, dashboard, product list |
| 2.15 | Design: customer app wireframes | [DS] | ⬜ | Home, search, shop profile |

**Sprint 2 DoD:** Admin can POST a shop, upload KYC docs, add products, and search returns them.

---

## Block 2 — Order Engine (Sprints 3–4)

### Sprint 3: Order Creation & Shop Notifications

**Goal:** Customer can place an order. Shop gets notified. 3-minute auto-cancel works.

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 3.1 | Implement POST /orders | [BE] | ✅ | Validates stock, locks qty, creates order |
| 3.2 | Idempotency key handling | [BE] | ✅ | Redis-backed duplicate prevention with 10 minute TTL |
| 3.3 | Server-side price calculation | [BE] | ✅ | DB prices are authoritative; client price ignored |
| 3.4 | Implement BullMQ notifyShop job | [BE] | ✅ | FCM first, MSG91 SMS fallback |
| 3.5 | Implement BullMQ autoCancel job | [BE] | ✅ | Delayed 3 minute cancel, stock restore, refund path, customer notify |
| 3.6 | Implement Socket.IO order room | [BE] | ✅ | Customer + shop join order:{orderId} |
| 3.7 | Implement PATCH /orders/:id/accept | [BE] | ✅ | Updates status, notifies customer, cancels delayed auto-cancel, triggers delivery assign |
| 3.8 | Implement PATCH /orders/:id/reject | [BE] | ✅ | Status update, stock restore, refund path |
| 3.9 | Implement PATCH /orders/:id/ready | [BE] | ✅ | Status update with downstream delivery notification hook |
| 3.10 | Implement PATCH /orders/:id/cancel | [BE] | ✅ | Eligibility checks, stock restore, refund path |
| 3.11 | Implement GET /orders + GET /orders/:id | [BE] | ✅ | Own-order access enforced for customer/shop owner views |
| 3.12 | Partial order cancel (item unavailable) | [BE] | ✅ | Item removal plus partial refund path |
| 3.13 | Set up Socket.IO server | [BE] | ✅ | Dedicated Socket.IO server on separate port |
| 3.14 | Write tests for order state machine | [BE] | ✅ | Route, state-machine, and job coverage added |

**Sprint 3 DoD:** Via Postman, place order → shop gets FCM → shop accepts → customer gets update via Socket.IO.

---

### Sprint 4: Payments (Cashfree)

**Goal:** Real UPI payment works end-to-end. Refunds work. COD works.

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 4.1 | Set up Cashfree production account | [PM] | ⬜ | Business KYC needed |
| 4.2 | Implement POST /payments/initiate | [BE] | ⬜ | Create Cashfree order, return payment_session_id |
| 4.3 | Implement POST /payments/webhook | [BE] | ⬜ | HMAC verify + idempotency + order update |
| 4.4 | Implement Cashfree refund service | [BE] | ⬜ | Called by autoCancel, reject, cancel |
| 4.5 | COD order flow | [BE] | ⬜ | Skip payment gateway, order confirmed directly |
| 4.6 | Implement payment reconciliation job | [BE] | ⬜ | Every 15 min, detect orphaned payments |
| 4.7 | GET /payments/:id status endpoint | [BE] | ⬜ | For client polling fallback |
| 4.8 | Test real UPI payment end-to-end | [BE] | ⬜ | Use Cashfree test credentials |
| 4.9 | Test refund flow | [BE] | ⬜ | Cancel order → Cashfree refund |
| 4.10 | Set up Cashfree settlement (T+1 to shops) | [BE] | ⬜ | Cashfree X settlement API |

**Sprint 4 DoD:** Full order placed → UPI paid → order confirmed → cancelled → refunded. All via Postman/test.

---

## Block 3 — Delivery & Real-Time (Sprints 5–6)

### Sprint 5: Delivery Assignment & GPS Tracking

**Goal:** Delivery partner gets assigned. Customer sees live GPS. OTP delivery works.

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 5.1 | Implement PATCH /delivery/availability | [BE] | ⬜ | GPS → Redis GEOADD |
| 5.2 | Implement BullMQ assignDelivery job | [BE] | ⬜ | Redis GEORADIUS → nearest partner |
| 5.3 | Implement POST /delivery/:id/location | [BE] | ⬜ | GPS → Redis → Ola Maps ETA → Socket.IO |
| 5.4 | Implement PATCH /delivery/:id/pickup | [BE] | ⬜ | Confirm pickup, start tracking |
| 5.5 | Implement PATCH /delivery/:id/deliver | [BE] | ⬜ | OTP verify → order delivered |
| 5.6 | OTP generation for delivery confirmation | [BE] | ⬜ | 4 digits, stored in order.delivery_otp |
| 5.7 | OTP SMS to customer on partner pickup | [BE] | ⬜ | MSG91 send |
| 5.8 | Socket.IO GPS room (delivery → customer) | [BE] | ⬜ | Real-time lat/lng + ETA broadcast |
| 5.9 | Ola Maps ETA calculation service | [BE] | ⬜ | Distance Matrix API integration |
| 5.10 | Delivery partner rating after delivery | [BE] | ⬜ | Customer rates 1–5 stars |
| 5.11 | "No partner available" escalation | [BE] | ⬜ | Expand to 5km, wait 10 min, notify customer |
| 5.12 | GPS trail storage for disputes | [BE] | ⬜ | Store compressed trail per order, 30-day TTL |

**Sprint 5 DoD:** Full delivery flow: assign → pickup → GPS tracking visible → OTP confirm → delivered.

---

### Sprint 6: Chat & Trust Score

**Goal:** Pre-order chat works. Nightly trust score runs. Reviews work.

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 6.1 | Implement Socket.IO chat (customer ↔ shop) | [BE] | ⬜ | Room: shop:{shopId}:chat |
| 6.2 | Persist chat messages to Supabase | [BE] | ⬜ | messages table with TTL index |
| 6.3 | Chat notification to shop (FCM) | [BE] | ⬜ | New message → FCM push |
| 6.4 | Implement POST /reviews | [BE] | ⬜ | Validate delivered order, one per order |
| 6.5 | Implement GET /shops/:id/reviews | [BE] | ⬜ | Paginated, sorted by recency/rating |
| 6.6 | Implement BullMQ trustScore nightly job | [BE] | ⬜ | Formula, badge assignment, Typesense update |
| 6.7 | Trust score alert (below 40) | [BE] | ⬜ | Admin FCM + shop FCM warning |
| 6.8 | Implement review-prompt delayed job | [BE] | ⬜ | 2 min after delivery → FCM to customer |
| 6.9 | BullMQ analytics nightly job | [BE] | ⬜ | Aggregate shop_events → shop_analytics_daily |
| 6.10 | GET /shops/:id/analytics endpoint | [BE] | ⬜ | Period: 7d, 30d, 90d |
| 6.11 | GET /shops/:id/earnings endpoint | [BE] | ⬜ | Daily, weekly, settlement history |
| 6.12 | Write integration tests (full order flow) | [BE] | ⬜ | Place → pay → deliver → review |

**Sprint 6 DoD:** Full backend complete. All endpoints tested. Ready for app development.

---

## Block 4 — Customer App (Sprints 7–10)

### Sprint 7: Customer App — Auth & Home

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 7.1 | Set up Expo project (customer app) | [RN1] | ⬜ | TypeScript, Expo Router |
| 7.2 | Set up Zustand state store | [RN1] | ⬜ | auth, cart, orders slices |
| 7.3 | Login screen — phone number entry | [RN1] | ⬜ | 10-digit validation |
| 7.4 | OTP screen — 6-box input + auto-read | [RN1] | ⬜ | SMS auto-read on Android |
| 7.5 | Location permission + Ola Maps geocoding | [RN1] | ⬜ | GPS or manual address |
| 7.6 | Home screen — shop category grid | [RN1] | ⬜ | Typesense results |
| 7.7 | Shop card component | [RN1] | ⬜ | Trust badge, distance, rating, hours |
| 7.8 | Nearby shops list (geo-filtered) | [RN1] | ⬜ | Typesense geo query |
| 7.9 | Category filter chips | [RN1] | ⬜ | Kirana, Veg, Pharmacy, etc. |
| 7.10 | Search bar + full-text product search | [RN1] | ⬜ | Typesense, 100ms debounce |
| 7.11 | FCM token registration on login | [RN1] | ⬜ | Store token in Supabase profile |

---

### Sprint 8: Customer App — Shop & Cart

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 8.1 | Shop profile screen | [RN1] | ⬜ | Owner photo, trust badge, reviews, hours |
| 8.2 | Product grid/list with categories | [RN1] | ⬜ | Out-of-stock greyed out |
| 8.3 | Add to cart interaction | [RN1] | ⬜ | Same-shop enforcement |
| 8.4 | Cart screen | [RN1] | ⬜ | Items, qty, subtotal, delivery fee, total |
| 8.5 | Address picker (Ola Maps) | [RN1] | ⬜ | GPS or search, map pin drag |
| 8.6 | Cart persistence (survive app close) | [RN1] | ⬜ | AsyncStorage |
| 8.7 | Review carousel on shop screen | [RN1] | ⬜ | Stars, comment, verified badge |
| 8.8 | Chat screen (pre-order) | [RN1] | ⬜ | Socket.IO, message bubbles |
| 8.9 | Shop "open now" status indicator | [RN1] | ⬜ | Real-time via Socket.IO |

---

### Sprint 9: Customer App — Checkout & Tracking

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 9.1 | Checkout screen | [RN1] | ⬜ | Order summary, payment method select |
| 9.2 | Cashfree SDK integration (UPI) | [RN1] | ⬜ | cashfree-pg React Native SDK |
| 9.3 | COD flow | [RN1] | ⬜ | Skip SDK, confirm directly |
| 9.4 | Order confirmed screen | [RN1] | ⬜ | Countdown to shop acceptance |
| 9.5 | Order tracking screen | [RN1] | ⬜ | Status timeline + map |
| 9.6 | Leaflet.js + OSM live map | [RN1] | ⬜ | WebView with Leaflet for tracking |
| 9.7 | Socket.IO client — GPS updates on map | [RN1] | ⬜ | Moving marker |
| 9.8 | ETA display ("Suresh is 8 min away") | [RN1] | ⬜ | From Socket.IO event |
| 9.9 | OTP display screen for delivery | [RN1] | ⬜ | Large 4-digit display |
| 9.10 | Delivery confirmed screen + review prompt | [RN1] | ⬜ | 5-star quick rating |

---

### Sprint 10: Customer App — History & Profile

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 10.1 | Order history list | [RN1] | ⬜ | All statuses, infinite scroll |
| 10.2 | Order detail screen | [RN1] | ⬜ | Full timeline, items, partner info |
| 10.3 | Cancel order screen | [RN1] | ⬜ | Reason select, confirm |
| 10.4 | Reorder flow | [RN1] | ⬜ | Availability check, prefill cart |
| 10.5 | Review submission screen | [RN1] | ⬜ | Stars, comment, emoji tags |
| 10.6 | Profile screen | [RN1] | ⬜ | Name, phone, saved addresses |
| 10.7 | Push notification handlers | [RN1] | ⬜ | Navigate to correct screen on tap |
| 10.8 | Refund status display | [RN1] | ⬜ | "Refund processing / credited" |
| 10.9 | Empty states for all screens | [RN1] | ⬜ | No shops, no orders, no results |
| 10.10 | Error handling + offline state | [RN1] | ⬜ | No network banner, retry |

---

## Block 5 — Shop & Delivery Apps (Sprints 11–14)

### Sprint 11: Shop Owner App — Core

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 11.1 | Set up shop owner Expo project | [RN2] | ⬜ | Separate app, shared components library |
| 11.2 | Registration flow (5 screens) | [RN2] | ⬜ | OTP → profile → photo → KYC → review |
| 11.3 | KYC document upload (Aadhaar, GST, photo) | [RN2] | ⬜ | Camera + gallery, upload to R2 |
| 11.4 | Under-review waiting screen | [RN2] | ⬜ | Status tracker |
| 11.5 | Shop dashboard home | [RN2] | ⬜ | Open/close toggle, earnings today, alerts |
| 11.6 | Order inbox (loud alert) | [RN2] | ⬜ | Custom ringtone, full-screen, countdown |
| 11.7 | Order detail + accept/reject | [RN2] | ⬜ | 3-min countdown, reason on reject |
| 11.8 | Pack checklist screen | [RN2] | ⬜ | Tick each item, mark ready |
| 11.9 | FCM integration (high-priority orders) | [RN2] | ⬜ | Custom sound, heads-up notification |

---

### Sprint 12: Shop Owner App — Inventory & Earnings

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 12.1 | Product catalogue screen | [RN2] | ⬜ | Grid, search within, stock badges |
| 12.2 | Add product screen (single) | [RN2] | ⬜ | Camera, form, R2 upload |
| 12.3 | Bulk CSV upload flow | [RN2] | ⬜ | File picker, preview, confirm |
| 12.4 | Edit product screen | [RN2] | ⬜ | Price, stock, availability toggle |
| 12.5 | Quick stock toggle (swipe or tap) | [RN2] | ⬜ | Instant feedback, Typesense sync |
| 12.6 | Low stock alert screen | [RN2] | ⬜ | List of items near zero |
| 12.7 | Earnings dashboard | [RN2] | ⬜ | Today, week, month chart |
| 12.8 | Settlement history | [RN2] | ⬜ | Each payout with UTR number |
| 12.9 | Monthly statement PDF share | [RN2] | ⬜ | Generate via API, share via WhatsApp |
| 12.10 | Shop analytics screen | [RN2] | ⬜ | Views, orders, top products |
| 12.11 | Chat screen (customer messages) | [RN2] | ⬜ | Inbox + individual chat |
| 12.12 | Open/close toggle + holiday mode | [RN2] | ⬜ | Date picker for holiday range |
| 12.13 | Shop settings screen | [RN2] | ⬜ | Hours, radius, bank details, description |

---

### Sprint 13: Delivery Partner App

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 13.1 | Set up delivery partner Expo project | [RN2] | ⬜ | |
| 13.2 | Registration + light KYC | [RN2] | ⬜ | OTP → Aadhaar → vehicle photo → bank |
| 13.3 | Go online/offline toggle | [RN2] | ⬜ | Big button, GPS start/stop |
| 13.4 | Background GPS broadcasting | [RN2] | ⬜ | Expo TaskManager, Socket.IO emit every 5s |
| 13.5 | Order assignment alert | [RN2] | ⬜ | Loud alert, map preview, accept/skip (30s) |
| 13.6 | Navigation to shop (Ola Maps deep-link) | [RN2] | ⬜ | Open Ola Maps with shop coords |
| 13.7 | Pickup confirmation screen | [RN2] | ⬜ | Order summary, confirm button |
| 13.8 | Navigation to customer (Ola Maps deep-link) | [RN2] | ⬜ | |
| 13.9 | OTP input screen for delivery | [RN2] | ⬜ | 4-digit input + confirm |
| 13.10 | Earnings today + history | [RN2] | ⬜ | Per-delivery, daily total, withdrawals |
| 13.11 | Rating display (own performance) | [RN2] | ⬜ | Star rating + recent feedback |

---

### Sprint 14: Admin Dashboard + KYC Flow

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 14.1 | Set up React + Vite admin project | [RN1] | ⬜ | Tailwind CSS, React Query |
| 14.2 | Admin login (separate OTP + admin role check) | [RN1] | ⬜ | Role: admin only |
| 14.3 | KYC review queue table | [RN1] | ⬜ | Sortable, filterable, oldest first |
| 14.4 | KYC document viewer (R2 signed URL) | [RN1] | ⬜ | Aadhaar, GST, shop photo |
| 14.5 | Approve / reject with reason | [RN1] | ⬜ | Triggers MSG91 + FCM to shop |
| 14.6 | Shop management table (all shops) | [RN1] | ⬜ | Suspend / reinstate / edit |
| 14.7 | Live order monitor | [RN1] | ⬜ | Socket.IO admin room, stuck order alerts |
| 14.8 | Dispute resolution screen | [RN1] | ⬜ | Timeline, GPS trail, refund button |
| 14.9 | Platform analytics dashboard | [RN1] | ⬜ | GMV, orders, city breakdown, charts |
| 14.10 | Delivery partner management | [RN1] | ⬜ | Approve KYC, suspend, earnings |
| 14.11 | Content moderation (reviews + products) | [RN1] | ⬜ | Flag and remove |
| 14.12 | Broadcast tool (FCM + SMS) | [RN1] | ⬜ | Target: shops / customers / delivery |

---

## Block 6 — Polish & Launch (Sprints 15–16)

### Sprint 15: Integration Testing & Bug Fixes

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 15.1 | Full end-to-end test on real devices | [ALL] | ⬜ | Real phones, real SIMs, real UPI |
| 15.2 | Test on low-end Android (₹6,000 phone) | [RN2] | ⬜ | Raju persona device |
| 15.3 | Test on 2G/3G network conditions | [ALL] | ⬜ | Network throttling |
| 15.4 | Load test: 100 concurrent orders | [BE] | ⬜ | k6 or Artillery |
| 15.5 | Security audit: OWASP top 10 check | [BE] | ⬜ | SQL injection, auth bypass, rate limit |
| 15.6 | Edge case testing (all 15 edge cases) | [ALL] | ⬜ | From EDGE_CASES.md |
| 15.7 | Fix all P0 and P1 bugs | [ALL] | ⬜ | Tracked in GitHub Issues |
| 15.8 | Set up Grafana dashboards + alerts | [DV] | ⬜ | CPU, API errors, order stuck alerts |
| 15.9 | DO weekly snapshot backup configured | [DV] | ⬜ | |
| 15.10 | App Store / Play Store submissions | [RN1] | ⬜ | All 3 apps submitted |
| 15.11 | Expo OTA update configured | [RN1] | ⬜ | For quick bug fixes post-launch |

---

### Sprint 16: Launch

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 16.1 | MSG91 DLT confirmed and SMS working | [PM] | ⬜ | |
| 16.2 | Cashfree production go-live approved | [PM] | ⬜ | Test real ₹1 transaction |
| 16.3 | All legal docs published (Privacy, ToS) | [PM] | ⬜ | In-app links |
| 16.4 | Onboard 10 pilot shops (in-person) | [PM] | ⬜ | Be there during their first order |
| 16.5 | Recruit 20 delivery partners | [PM] | ⬜ | WhatsApp groups, local colleges |
| 16.6 | 20 beta customers invited | [PM] | ⬜ | Friends, family, neighbours |
| 16.7 | Admin team briefed on support runbook | [PM] | ⬜ | See docs/SUPPORT_RUNBOOK.md |
| 16.8 | All environment vars confirmed production | [DV] | ⬜ | No dev/test keys anywhere |
| 16.9 | Complete pre-launch checklist (35 items) | [ALL] | ⬜ | In PRD.html |
| 16.10 | First live order placed 🎉 | [ALL] | ⬜ | |

---

## Sprint Velocity Tracking

| Sprint | Planned | Completed | Velocity | Notes |
|--------|---------|-----------|----------|-------|
| 1 | 17 | — | — | |
| 2 | 15 | — | — | |
| 3 | 14 | — | — | |
| 4 | 10 | — | — | |
| 5 | 12 | — | — | |
| 6 | 12 | — | — | |
| 7 | 11 | — | — | |
| 8 | 9 | — | — | |
| 9 | 10 | — | — | |
| 10 | 10 | — | — | |
| 11 | 9 | — | — | |
| 12 | 13 | — | — | |
| 13 | 11 | — | — | |
| 14 | 12 | — | — | |
| 15 | 11 | — | — | |
| 16 | 10 | — | — | |

---

*Last updated: March 2026 | Update STATUS column every Friday*
