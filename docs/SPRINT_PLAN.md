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
- Task 2.3: 🟩 COMPLETE — GET/PATCH /shops/:id
- Task 2.4–2.6: ⬜ Not started

### Sprint 3 (Week 5–6) — Product Management
POST /shops/:id/products, product images, bulk CSV upload, Typesense indexing.
- Task 3.1–3.4: ⬜ Not started

### Sprint 4 (Week 7–8) — Search & Discovery
Typesense product + shop search, geo-radius, filters, typo tolerance.
- Task 4.1–4.3: ⬜ Not started

### Sprint 5 (Week 9–10) — Order Creation & Acceptance
POST /orders (cart → order), shop order acceptance/rejection, 3-min auto-cancel.
- Task 5.1–5.3: ⬜ Not started

### Sprint 6 (Week 11–12) — Order Lifecycle & Delivery Dispatch
Order status updates, delivery partner assignment, GPS tracking, real-time updates.
- Task 6.1–6.3: ⬜ Not started

### Sprint 7 (Week 13–14) — Payment Integration
Cashfree payment gateway, webhook handling, refunds, settlement summaries.
- Task 7.1–7.3: ⬜ Not started

### Sprint 8 (Week 15–16) — Reviews & Ratings
Customer reviews (post-delivery), shop/product ratings, trust score recomputation.
- Task 8.1–8.3: ⬜ Not started

### Sprint 9 (Week 17–18) — Customer App (Part 1)
Auth (OTP), shop discovery (search/map), product browsing, add to cart.
- Task 9.1–9.3: ⬜ Not started

### Sprint 10 (Week 19–20) — Customer App (Part 2)
Checkout, payment, order tracking, notifications, reviews (React Native).
- Task 10.1–10.3: ⬜ Not started

### Sprint 11 (Week 21–22) — Shop Owner App (Part 1)
Auth (OTP), accept/reject orders, order details, live tracking (React Native).
- Task 11.1–11.3: ⬜ Not started

### Sprint 12 (Week 23–24) — Shop Owner App (Part 2)
Analytics, earnings, settlements, inventory sync (React Native).
- Task 12.1–12.3: ⬜ Not started

### Sprint 13 (Week 25–26) — Delivery Partner App
Availability toggle, assignment notifications, GPS tracking, pickup/delivery confirmation (React Native).
- Task 13.1–13.4: ⬜ Not started

### Sprint 14 (Week 27–28) — Admin Dashboard
KYC queue, shop approval/suspension, dispute resolution, platform analytics.
- Task 14.1–14.4: ⬜ Not started

### Sprint 15 (Week 29–30) — KYC & Trust Score Engine
Automated KYC status workflow, trust score recomputation, shop badges.
- Task 15.1–15.3: ⬜ Not started

### Sprint 16 (Week 31–32) — Launch Preparation
Performance optimization, security audit, load testing, documentation, go-live checklist.
- Task 16.1–16.4: ⬜ Not started

---

## Milestone Summary

| Milestone | Sprints | Status | Description |
|-----------|---------|--------|-------------|
| Backend Skeleton | 1 | 🟩 | Express + Socket.IO + all middleware + services |
| Shop Registration | 1-2 | 🟩 | POST/GET/PATCH /shops, KYC upload |
| Product Management | 2-3 | 🟨 | POST /products, CSV bulk upload, Typesense indexing |
| Search & Discovery | 3-4 | ⬜ | Shop search, product search, geo filters |
| Order Flow | 5-6 | ⬜ | Create order, shop acceptance, delivery dispatch |
| Payments | 7 | ⬜ | Cashfree payment, refunds, settlements |
| Customer App | 9-10 | ⬜ | React Native, auth to checkout |
| Shop Owner App | 11-12 | ⬜ | React Native, manage shop + orders |
| Delivery App | 13 | ⬜ | React Native, GPS + tracking |
| Admin Dashboard | 14 | ⬜ | KYC review, moderation, analytics |
| Launch Readiness | 15-16 | ⬜ | Optimization, security, testing, go-live |

---

## Risk & Dependency Matrix

| Task | Dependencies | Risk | Mitigation |
|------|--------------|------|-----------|
| 2.3 (GET/PATCH /shops) | 2.1 (POST /shops) | LOW | Reuses shop schema, familiar patterns |
| 2.4 (toggle) | 2.3, Typesense | MEDIUM | Requires Typesense index sync |
| 2.5–2.6 (products) | 2.1–2.3 | MEDIUM | New R2 integration, CSV parsing |
| 3.1–3.4 (search) | 2.5–2.6 | MEDIUM | Typesense schema design critical |
| 5.1–5.3 (orders) | 3.1–3.4, Auth | HIGH | Core business logic, complex state |
| 6.1–6.3 (delivery) | 5.1–5.3 | HIGH | Real-time + geo queries |
| 7.1–7.3 (payments) | 5.1–5.3, Cashfree account | HIGH | PCI compliance, webhook security |
| 9–10 (customer app) | Auth, orders, search | HIGH | All mobile features depend on API |
| 14 (admin) | All endpoints | HIGH | Moderation critical for launch |

---

## Definition of Done

### Per-Task DoD
- [x] Feature implemented per spec
- [x] All tests passing (80%+ coverage)
- [x] Code review approved
- [x] Linting passed (ESLint)
- [x] Documentation updated (API_CHANGELOG.md)
- [x] No hardcoded secrets
- [x] No console.log statements
- [x] Error handling complete
- [x] Security checklist passed

### Per-Sprint DoD
- [x] All tasks 🟩 complete
- [x] Integration tests for task interactions
- [x] Staging deployment verified
- [x] Performance benchmarks met (sub-500ms p95)
- [x] Security scan passed (OWASP Top 10)

### Pre-Launch DoD (Sprint 16)
- [ ] All 16 sprints complete
- [ ] E2E tests for all user flows
- [ ] Load test: 1000 concurrent users
- [ ] Security audit: external consultant
- [ ] Disaster recovery tested
- [ ] Database backup/restore verified
- [ ] Monitoring & alerting configured
- [ ] Launch runbook reviewed
- [ ] Customer support docs ready
- [ ] Terms of Service + Privacy Policy approved

---

## Team Velocity & Capacity

Target: **3–4 tasks per sprint** (2 weeks per sprint)
- Backend engineers: 2–3 FTE
- Mobile engineers: 2–3 FTE (Sprints 9–13)
- QA: 1 FTE (continuous)
- Product/Design: 1 FTE (backlog planning)

Estimated project duration: **32 weeks (8 months)** from project start to public launch.

---

*Last updated: April 7, 2026 (Sprint 2.3 complete)*
