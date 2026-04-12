# NearBy Sprint Plan — 16 Sprints, 4-Month Build

> Each sprint = 2 weeks. Blocks = modules. Tasks = individual features or endpoints.
> Status: ⬜ Not started | 🟨 In progress | 🟩 Complete

---

## Block 1: Backend Foundation (Sprints 1–2)

**Goal:** Shop owner can register, upload KYC, add products. Products searchable in Typesense.

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 2.1 | Implement POST /shops (create shop) | [BE] | 🟩 | Basic profile, status: pending_kyc. 8 tests pass, 92% coverage. |
| 2.2 | Implement POST /shops/:id/kyc | [BE] | 🟩 | Multipart upload → R2 private bucket, signed URLs, idempotency. 8 tests pass, 92% coverage. |
| 2.3 | Implement GET/PATCH /shops/:id | [BE] | 🟩 | Get shop, update profile. 5 GET + 10 PATCH tests pass, 92% coverage. |
| 2.4 | Implement PATCH /shops/:id/toggle | [BE] | 🟩 | Open/close + Typesense sync. 13 tests pass, 100% coverage. BullMQ async job queued, fire-and-forget pattern. |
| 2.5 | Implement POST /shops/:id/products | [BE] | 🟩 | Verified against integration tests: auth, ownership, multipart upload, optional image, R2 URL mapping, Typesense queue. |
| 2.6 | Implement POST /shops/:id/products/bulk | [BE] | 🟩 | Verified against integration tests: auth, role guard, CSV validation, partial success, queue resilience, 2 MB upload limit. |
| 2.7 | Implement PATCH /products/:id | [BE] | 🟩 | Verified against integration tests: auth, role guard, ownership, stock/price updates, Typesense sync. |
| 2.8 | Implement DELETE /products/:id | [BE] | 🟩 | Verified against integration tests: auth, role guard, ownership, soft delete via deleted_at, Typesense remove sync. |

---

## Full Sprint Timeline

### Sprint 1 (Week 1–2) — Infrastructure
Backend skeleton, Socket.IO, all service integrations, middleware stack, test infra.
- Status: 🟩 COMPLETE
- 57 tests passing, Express + Socket.IO bootstrapped

### Sprint 2 (Week 3–4) — Shop Registration
POST /shops (registration), POST /shops/:id/kyc (document upload), shop profile CRUD, shop toggle.
- Task 2.1: 🟩 COMPLETE — POST /shops
- Task 2.2: 🟩 COMPLETE — POST /shops/:id/kyc
- Task 2.3: 🟩 COMPLETE — GET/PATCH /shops/:id
- Task 2.4: 🟩 COMPLETE — PATCH /shops/:id/toggle
- Task 2.5: 🟩 COMPLETE — POST /shops/:id/products
- Task 2.6: 🟩 COMPLETE — POST /shops/:id/products/bulk
- Task 2.7: 🟩 COMPLETE — PATCH /products/:id
- Task 2.8: 🟩 COMPLETE — DELETE /products/:id

### Sprint 3 (Week 5–6) — Product Management
POST /shops/:id/products, product images, bulk CSV upload, Typesense indexing.
- Task 3.1: 🟩 COMPLETE — GET /api/v1/products/template
- Task 3.2: 🟩 COMPLETE — GET /api/v1/search/shops
- Task 3.3–3.4: ⬜ Not started

### Sprint 4 (Week 7–8) — Payments
Cashfree payment initiation, webhook handler, refunds.
- Task 4.1: 🟩 COMPLETE — POST /payments/initiate (create payment session or mark COD complete; 68/68 tests; 83-96% coverage)
- Task 4.2: 🟩 COMPLETE — GET /payments/:id (retrieve payment status; covered in 68 total tests)
- Task 4.3: 🟩 COMPLETE — POST /webhook (HMAC-SHA256 signature verification, idempotent processing, stock restoration on failure; covered in 68 total tests)
- Status: 🟩 COMPLETE

### Sprint 5 (Week 9–10) — Delivery Tracking
assign-delivery BullMQ worker, GPS Socket.IO tracker, delivery state machine, delivery routes.
- Task 5.1: 🟩 COMPLETE — assignDelivery BullMQ worker (Redis GEOSEARCH, optimistic DB lock, admin:alert on final retry, toSafeOrderPayload strip; 11 unit tests)
- Task 5.2: 🟩 COMPLETE — GET /api/v1/delivery/orders (list partner orders, status filter; covered in 21 integration tests)
- Task 5.3: 🟩 COMPLETE — PATCH /api/v1/delivery/orders/:orderId/accept and /reject (accept acknowledges assignment; reject reverts to ready and re-queues assign-delivery after confirmed DB update; 21 integration tests)
- Task 5.4: 🟩 COMPLETE — PATCH /api/v1/delivery/orders/:orderId/pickup (assigned → picked_up, notify-customer enqueued, Socket.IO broadcast; 21 integration tests)
- Task 5.5: 🟩 COMPLETE — PATCH /api/v1/delivery/orders/:orderId/deliver (picked_up|out_for_delivery → delivered, delivered_at recorded, notify-customer enqueued; 21 integration tests)
- Task 5.6: 🟩 COMPLETE — Socket.IO gps:update handler (role guard, UUID regex validation, India bounds check, Redis GEOADD + 30s EXPIRE, Ola Maps ETA best-effort, broadcast gps:position to order room; 13 unit tests)
- Total Sprint 5: 45 new tests | Overall suite: 331/331 passing

### Sprint 6 (Week 11–12) — Reviews & Ratings
POST /reviews, GET /shops/:id/reviews, trust score inputs.
- Status: ⬜ Not started

### Sprint 7–10 (Week 13–20) — Customer App
React Native customer app: browse, order, track, review.
- Status: ⬜ Not started

### Sprint 9–12 (Week 17–24) — Shop Owner App
React Native shop owner app: manage shop, accept orders, inventory.
- Status: ⬜ Not started

### Sprint 11–13 (Week 21–26) — Delivery App
React Native delivery partner app: accept assignments, GPS tracking.
- Status: ⬜ Not started

### Sprint 13–15 (Week 25–30) — Admin Dashboard
React + Vite admin dashboard: KYC review, disputes, monitoring.
- Status: ⬜ Not started

### Sprint 14 (Week 27–28) — KYC Flow
Admin KYC review, approve/reject, shop verification.
- Status: ⬜ Not started

### Sprint 15 (Week 29–30) — Trust Score Engine
Nightly trust score recompute, badge assignment, admin alerts.
- Status: ⬜ Not started

### Sprint 16 (Week 31–32) — Launch Prep
Performance testing, security audit, monitoring setup, go-live checklist.
- Status: ⬜ Not started
