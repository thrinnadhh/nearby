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
