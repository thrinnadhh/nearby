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
| 1.9 | Bootstrap Node.js + Express project | [BE] | ⬜ | With middleware, error handling, logging |
| 1.10 | Set up docker-compose.yml for local dev | [BE] | ⬜ | Redis + Typesense + API all in one |
| 1.11 | Register MSG91 account + DLT template approval | [PM] | ⬜ | Takes 2–3 days — start immediately |
| 1.12 | Create Firebase project + FCM config | [DV] | ⬜ | Download google-services.json |
| 1.13 | Implement POST /auth/send-otp | [BE] | ⬜ | MSG91 + Redis OTP storage |
| 1.14 | Implement POST /auth/verify-otp | [BE] | ⬜ | JWT issue, role assignment |
| 1.15 | Implement JWT middleware + roleGuard | [BE] | ⬜ | customer/shop_owner/delivery/admin |
| 1.16 | Set up GitHub Actions CI pipeline | [DV] | ⬜ | Run tests on every PR |
| 1.17 | Write tests for auth flow | [BE] | ⬜ | OTP send, verify, lockout |

**Sprint 1 Definition of Done:** Any dev can `docker-compose up` and test OTP login via Postman.

---

### Sprint 2: Shop & Product Core

**Goal:** Shop owner can register, upload KYC, add products. Products searchable in Typesense.

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 2.1 | Implement POST /shops (create shop) | [BE] | ✅ | Basic profile, status: pending_kyc. 8 tests pass, 92% coverage. |
| 2.2 | Implement POST /shops/:id/kyc | [BE] | ⬜ | Multipart upload → R2 private bucket |
| 2.3 | Implement GET/PATCH /shops/:id | [BE] | ⬜ | Get shop, update profile |
| 2.4 | Implement PATCH /shops/:id/toggle | [BE] | ⬜ | Open/close + Typesense sync |
| 2.5 | Implement POST /shops/:id/products | [BE] | ⬜ | Single product + R2 image + Typesense index |
| 2.6 | Implement POST /shops/:id/products/bulk | [BE] | ⬜ | CSV parse, validate, batch index |
| 2.7 | Implement PATCH /products/:id | [BE] | ⬜ | Stock toggle, price update + Typesense sync |
| 2.8 | Implement DELETE /products/:id | [BE] | ⬜ | Soft delete, Typesense remove |
| 2.9 | Implement GET /search/shops | [BE] | ⬜ | Typesense geo + category + open_now |
| 2.10 | Implement GET /search/products | [BE] | ⬜ | Cross-shop product search |
| 2.11 | Set up Typesense shop + product schemas | [BE] | ⬜ | Fields: geo, trust_score, is_open, etc. |
| 2.12 | Implement Sharp.js image resize pipeline | [BE] | ⬜ | 600×600 + 150×150 thumbnail |
| 2.13 | GET /products/template (CSV download) | [BE] | ⬜ | Category-specific columns |
| 2.14 | Design: shop owner app wireframes | [DS] | ⬜ | Registration, dashboard, product list |
| 2.15 | Design: customer app wireframes | [DS] | ⬜ | Home, search, shop profile |

**Sprint 2 DoD:** Admin can POST a shop, upload KYC docs, add products, and search returns them.

---

## Block 2 — Order Engine (Sprints 3–4)

### Sprint 3: Order Creation & Shop Notifications

**Goal:** Customer can place an order. Shop gets notified. 3-minute auto-cancel works.

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 3.1 | Implement POST /orders | [BE] | ⬜ | Validate stock, lock qty, create order |
| 3.2 | Idempotency key handling | [BE] | ⬜ | Redis check, prevent duplicates |
| 3.3 | Server-side price calculation | [BE] | ⬜ | NEVER trust client price |
| 3.4 | Implement BullMQ notifyShop job | [BE] | ⬜ | FCM + MSG91 SMS to shop |
| 3.5 | Implement BullMQ autoCancel job | [BE] | ⬜ | Delayed 3 min, cancel + refund |
| 3.6 | Implement Socket.IO order room | [BE] | ⬜ | Customer + shop join order:{orderId} |
| 3.7 | Implement PATCH /orders/:id/accept | [BE] | ⬜ | Update status, notify customer, trigger delivery assign |
| 3.8 | Implement PATCH /orders/:id/reject | [BE] | ⬜ | Status update + auto refund |
| 3.9 | Implement PATCH /orders/:id/ready | [BE] | ⬜ | Notify delivery partner to pickup |
| 3.10 | Implement PATCH /orders/:id/cancel | [BE] | ⬜ | Eligibility check + refund |
| 3.11 | Implement GET /orders + GET /orders/:id | [BE] | ⬜ | With RLS (own orders only) |
| 3.12 | Partial order cancel (item unavailable) | [BE] | ⬜ | Remove item + partial refund |
| 3.13 | Set up Socket.IO server | [BE] | ⬜ | Separate port 3001, room management |
| 3.14 | Write tests for order state machine | [BE] | ⬜ | All status transitions |

**Sprint 3 DoD:** Via Postman, place order → shop gets FCM → shop accepts → customer gets update via Socket.IO.

---

## Block 3 — Fulfillment (Sprints 5–6)

### Sprint 5: Delivery Tracking & Search

**Goal:** Delivery partner can accept assignment + GPS tracking. Search shops by geo + category.

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 5.1 | Implement POST /delivery/availability | [BE] | ⬜ | Partner go online/offline |
| 5.2 | Implement GET /delivery/assignments | [BE] | ⬜ | List active orders for partner |
| 5.3 | Implement PATCH /delivery/:id/pickup | [BE] | ⬜ | Confirm pickup with OTP |
| 5.4 | Implement PATCH /delivery/:id/deliver | [BE] | ⬜ | Confirm delivery with OTP |
| 5.5 | Implement POST /delivery/:id/location | [BE] | ⬜ | GPS stream + Socket.IO push to customer |
| 5.6 | Implement BullMQ assignDelivery job | [BE] | ⬜ | Find nearest partner via Redis geo |
| 5.7 | Set up Typesense shop index | [BE] | ⬜ | Geo, trust_score, is_open, category |
| 5.8 | Set up Typesense product index | [BE] | ⬜ | Shop geo, price, availability |
| 5.9 | Implement GET /search/shops | [BE] | ⬜ | Geo + category + open_now filters |
| 5.10 | Implement GET /search/products | [BE] | ⬜ | Cross-shop product search with typo tolerance |

**Sprint 5 DoD:** Delivery partner accepts assignment, GPS tracked in real-time, customer sees live location.

---

### Sprint 6: Reviews & Trust Score

**Goal:** Customers can rate shops. Trust score computed nightly.

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 6.1 | Implement POST /reviews | [BE] | ⬜ | Submit review after delivery |
| 6.2 | Implement GET /shops/:id/reviews | [BE] | ⬜ | List shop reviews paginated |
| 6.3 | Implement BullMQ trustScore job | [BE] | ⬜ | Nightly at 2 AM IST |
| 6.4 | Implement GET /shops/:id/analytics | [BE] | ⬜ | Orders, avg rating, completion rate |

**Sprint 6 DoD:** Shop owners see review ratings + trust score badge updates.

---

## Block 4 — Mobile Apps (Sprints 7–12)

### Sprint 7–8: Customer App (Auth + Shop Discovery)

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 7.1 | Set up React Native + Expo project | [RN] | ⬜ | Zustand store, navigation, API client |
| 7.2 | Implement OTP login screen | [RN] | ⬜ | Send OTP → verify → token storage |
| 7.3 | Implement home screen with Typesense search | [RN] | ⬜ | Geo filtered shop list |
| 7.4 | Implement shop detail screen | [RN] | ⬜ | Products, reviews, ratings, add to cart |
| 8.1 | Implement product search with filters | [RN] | ⬜ | Category, price range, delivery time |
| 8.2 | Implement cart + checkout | [RN] | ⬜ | Same-shop cart, payment mode selection |

---

### Sprint 9–10: Shop Owner App

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 9.1 | Implement OTP login | [RN] | ⬜ | Reuse auth from customer app |
| 9.2 | Implement shop registration flow | [RN] | ⬜ | Name, location, category, phone |
| 9.3 | Implement KYC upload | [RN] | ⬜ | Document camera, upload to R2 |
| 9.4 | Implement product management | [RN] | ⬜ | Add/edit/delete, bulk CSV import |
| 10.1 | Implement order management dashboard | [RN] | ⬜ | Accept/reject/mark ready |
| 10.2 | Implement Socket.IO real-time order push | [RN] | ⬜ | FCM + in-app notification |

---

### Sprint 11–12: Delivery Partner App

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 11.1 | Implement OTP login | [RN] | ⬜ | Same pattern as other apps |
| 11.2 | Implement go online/offline toggle | [RN] | ⬜ | Geolocate + Redis update |
| 11.3 | Implement assignment queue | [RN] | ⬜ | Accept/reject assignments |
| 11.4 | Implement order pickup screen | [RN] | ⬜ | GPS navigation to shop + OTP entry |
| 12.1 | Implement live tracking + GPS push | [RN] | ⬜ | 5sec updates, Socket.IO to customer |
| 12.2 | Implement delivery completion | [RN] | ⬜ | OTP verification + delivery confirmation |

---

## Block 5 — Admin (Sprints 13–14)

### Sprint 13: Admin Dashboard Core

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 13.1 | Set up React + Vite admin project | [RN] | ⬜ | Auth, routing, API client |
| 13.2 | Implement KYC review queue | [RN] | ⬜ | List pending, approve/reject with reason |
| 13.3 | Implement shop suspension | [RN] | ⬜ | List shops, suspend/reinstate |
| 13.4 | Implement dispute resolution | [RN] | ⬜ | List open disputes, mark resolved |

---

### Sprint 14: Admin Monitoring & Reporting

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 14.1 | Implement platform analytics dashboard | [RN] | ⬜ | Orders, revenue, partner count |
| 14.2 | Implement broadcast messaging | [RN] | ⬜ | Send FCM to all/segment of users |
| 14.3 | Set up Grafana + Prometheus monitoring | [DV] | ⬜ | API health, request rates, error rates |

---

## Block 6 — Launch (Sprints 15–16)

### Sprint 15: Polish & Testing

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 15.1 | E2E testing on all critical flows | [QA] | ⬜ | OTP → shop → order → delivery → review |
| 15.2 | Load testing (Redis/Typesense) | [DV] | ⬜ | Simulate 1000 concurrent users |
| 15.3 | Security audit | [DV] | ⬜ | OWASP Top 10, secrets management, RLS |
| 15.4 | Analytics refinement | [BE] | ⬜ | Nightly jobs working, reports accurate |
| 15.5 | Bug fixes + polish | [ALL] | ⬜ | Fix issues from testing, UI refinement |

---

### Sprint 16: Launch

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 16.1 | Deploy to production (Coolify) | [DV] | ⬜ | API, admin, databases all live |
| 16.2 | Deploy mobile apps to App Store + Play Store | [RN] | ⬜ | Beta → production release |
| 16.3 | Soft launch (internal testing) | [PM] | ⬜ | Team uses app for real orders |
| 16.4 | Public beta (100 beta users) | [PM] | ⬜ | Collect feedback, fix critical issues |
| 16.5 | Official launch | [PM] | ⬜ | Public announcement, press release |

---

*Last updated: April 7, 2026 | Sprint 2 Task 2.1 complete*
