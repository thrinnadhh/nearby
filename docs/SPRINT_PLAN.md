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
| 2.3 | Implement GET/PATCH /shops/:id | [BE] | ⬜ | Get shop, update profile |
| 2.4 | Implement PATCH /shops/:id/toggle | [BE] | ⬜ | Open/close + Typesense sync |
| 2.5 | Implement POST /shops/:id/products | [BE] | ⬜ | Single product + R2 image + Typesense index |
| 2.6 | Implement POST /shops/:id/products/bulk | [BE] | ⬜ | CSV parse, validate, batch index |

---

## Full Sprint Timeline

### Sprint 1 (Week 1–2) — Infrastructure
Backend skeleton, Socket.IO, all service integrations, middleware stack, test infra.
- Status: 🟩 COMPLETE
- 57 tests passing, Express + Socket.IO bootstrapped

### Sprint 2 (Week 3–4) — Shop Registration
POST /shops (registration), POST /shops/:id/kyc (document upload), shop profile CRUD.
- Task 2.1: 🟩 COMPLETE — POST /shops
- Task 2.2: 🟩 COMPLETE — POST /shops/:id/kyc
- Task 2.3–2.6: ⬜ Not started

### Sprint 3 (Week 5–6) — Product Management
POST /shops/:id/products, product images, bulk CSV upload, Typesense indexing.
- Task 3.1–3.4: ⬜ Not started

### Sprint 4 (Week 7–8) — Search & Discovery
GET /search/shops (geo), GET /search/products (cross-shop), filters, sorting.
- Task 4.1–4.3: ⬜ Not started

### Sprint 5 (Week 9–10) — Orders (Part 1)
POST /orders, order validation, stock locking, idempotency, order status machine.
- Task 5.1–5.4: ⬜ Not started

### Sprint 6 (Week 11–12) — Payments
Cashfree integration, payment initiation, webhook handler, refunds, settlements.
- Task 6.1–6.4: ⬜ Not started

### Sprint 7 (Week 13–14) — Delivery (Part 1)
Delivery partner assignment, GPS tracking, ETA calculation, Socket.IO updates.
- Task 7.1–7.3: ⬜ Not started

### Sprint 8 (Week 15–16) — Reviews & Disputes
Post-delivery reviews, trust score recalc, dispute initiation, admin moderation.
- Task 8.1–8.3: ⬜ Not started

### Sprint 9 (Week 17–18) — Customer App (Part 1)
Auth screens, shop browsing, product search, cart, checkout UI (React Native + Expo).
- Task 9.1–9.4: ⬜ Not started

### Sprint 10 (Week 19–20) — Customer App (Part 2)
Order tracking, delivery updates, chat, reviews, profile management (React Native).
- Task 10.1–10.3: ⬜ Not started

### Sprint 11 (Week 21–22) — Shop Owner App (Part 1)
Shop profile, product management, order acceptance/rejection UI (React Native).
- Task 11.1–11.3: ⬜ Not started

### Sprint 12 (Week 23–24) — Shop Owner App (Part 2)
Analytics, earnings, settlements, inventory sync (React Native).
- Task 12.1–12.3: ⬜ Not started

### Sprint 13 (Week 25–26) — Delivery Partner App
Availability toggle, assignment notifications, GPS tracking, pickup/delivery confirmation (React Native).
- Task 13.1–13.4: ⬜ Not started

### Sprint 14 (Week 27–28) — Admin Dashboard (Part 1)
KYC review queue, approve/reject, shop listings, suspension (React + Vite).
- Task 14.1–14.3: ⬜ Not started

### Sprint 15 (Week 29–30) — Admin Dashboard (Part 2)
Disputes, analytics, broadcasts, monitoring, trust score overrides (React + Vite).
- Task 15.1–15.3: ⬜ Not started

### Sprint 16 (Week 31–32) — Launch Prep
Performance optimization, security audit, load testing, documentation, launch checklist.
- Task 16.1–16.5: ⬜ Not started

---

## Key Milestones

| Milestone | Sprint | Criteria |
|-----------|--------|----------|
| Minimum Viable Product (MVP) | Sprint 8 | Customers can order, payment works, delivery tracked, reviews posted |
| Beta launch | Sprint 10 | All 3 customer apps functional, shop + delivery apps usable |
| Admin ready | Sprint 15 | Full admin dashboard operational, KYC + dispute workflows |
| Production launch | Sprint 16 | All systems load-tested, security audited, documentation complete |

---

## Definition of Done (DoD)

Each task is only "done" when:
- [ ] Code written, tested (80%+ coverage)
- [ ] All tests passing
- [ ] API_CHANGELOG.md updated (if API change)
- [ ] CLAUDE.md build status updated
- [ ] SPRINT_PLAN.md marked complete
- [ ] Commit message follows conventional commits
- [ ] Code review passed (no CRITICAL/HIGH issues)
- [ ] Database migrations applied (if schema change)

---

## Notes

- Sprint pacing: 2 weeks per sprint, ~3 tasks per sprint
- Frontend (apps/) starts after backend core (orders + payments) in Sprint 5+
- Admin dashboard starts in Sprint 14 (after core features stable)
- Load testing + optimization in final sprint

*Last updated: April 7, 2026 | Sprint 2 Tasks 2.1 & 2.2 complete*
