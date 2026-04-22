# SPRINT 14 PLANNER REPORT — VALIDATION & ENHANCEMENT

**Status:** 🔴 **CRITICAL ISSUES FOUND**
- Backend admin APIs NOT implemented (0 of 18 endpoints)
- Admin dashboard frontend depends on missing APIs
- Recommendation: Create Sprint 13.5 (Backend Admin APIs) in parallel with Sprint 14

---

## KEY FINDINGS

### ✅ What's Good
- Sprint 14 frontend scope is well-defined (12 tasks, 58 hours)
- Acceptance criteria are testable
- Tech stack is locked and appropriate
- Daily breakdown and task sequencing is logical
- 80%+ coverage target is realistic

### 🔴 What's Critical
**BLOCKER:** `backend/src/routes/admin.js` exists but is **EMPTY** (only router skeleton)

Missing 18 backend endpoints that all 12 frontend tasks depend on:
- KYC queue, approve/reject
- Shop management (suspend, reinstate)
- Order monitoring via Socket.IO
- Dispute resolution with GPS trail + Cashfree refund
- Analytics aggregation
- Delivery partner management
- Content moderation
- Broadcast tool with rate limiting

**Impact:** Cannot fully test frontend without backend APIs

**Solutions:**
1. **Recommended:** Create Sprint 13.5 (Backend Admin APIs) to run in parallel
   - Effort: ~20-25 hours
   - Can be done by backend engineer while frontend works on 14.1-14.2
   
2. **Alternative:** Extend Sprint 14 timeline to 10-12 days to include backend

---

## SECTION 1: TASK RISK BREAKDOWN

| Task | Risk | Backend Dependency | Notes |
|------|------|-------------------|-------|
| 14.1 | 🟢 LOW | None | Pure frontend, no API needed |
| 14.2 | 🟢 LOW | Existing (/auth) | Reuses proven OTP flow |
| 14.3 | 🟠 MED | Missing | `GET /admin/kyc/queue` — must implement |
| 14.4 | 🟠 MED | Likely exists | `GET /admin/kyc/signed-url` — verify |
| 14.5 | 🔴 HIGH | Missing | `PATCH approve/reject` — critical |
| 14.6 | 🔴 HIGH | Missing | `GET /admin/shops`, suspend/reinstate |
| 14.7 | 🔴 HIGH | Missing | Socket.IO admin room + order events |
| 14.8 | 🔴 HIGH | Missing | Disputes, GPS trail, Cashfree refund |
| 14.9 | 🟠 MED | Missing | `GET /admin/analytics` — verify daily aggregation |
| 14.10 | 🟠 MED | Missing | `/admin/delivery-partners` endpoints |
| 14.11 | 🟢 LOW | Missing | Content moderation (lower priority) |
| 14.12 | 🟠 MED | Missing | Broadcast + BullMQ job |

---

## SECTION 2: RECOMMENDED EXECUTION PATH

### Option A: Create Sprint 13.5 (Backend Admin APIs) — RECOMMENDED

**Timeline:** Week of April 20
- Backend Engineer: Sprint 13.5 (Mon-Wed, 20-25 hours)
  - KYC endpoints, shop endpoints, order events, disputes, analytics, moderation, broadcast
  - All 18 endpoints + tests
- Frontend Engineer: Sprint 14.1-14.2 (Mon-Tue)
  - Vite setup + Login
- Then Frontend: Sprint 14.3-14.12 (Wed-Fri + Mon-Tue)
  - All remaining 10 tasks with tested backend APIs available

**Benefit:** No frontend blocking, parallel work, better code quality
**Effort:** +25 hours backend, Frontend stays 58 hours
**Timeline:** 8-9 days total instead of unpredictable delays

### Option B: Extend Sprint 14 to Include Backend (10-12 days)

**Timeline:** Week of April 20-27
- Days 1-3: Backend admin APIs (20-25 hours)
- Days 3-9: Frontend (58 hours)
- Days 9-10: Integration + testing

**Benefit:** Single sprint cohesion, no context switches
**Risk:** One person doing backend + frontend = cognitive overload, quality suffers
**Not recommended** unless backend engineer unavailable

### Option C: Mock Backend for Sprint 14, Integrate Later

**Timeline:** Week of April 20
- Days 1-8: Frontend with mocked API responses
- After week: Swap mocks for real APIs

**Benefit:** Frontend completes on schedule
**Risk:** Integration surprises, different error handling, API contract mismatches
**Not recommended** — we learned this lesson in previous sprints

---

## SECTION 3: DAILY BREAKDOWN (7-8 Days Frontend Only)

### DAY 1 — Setup & Login (3h + 4h = 7h)

**Task 14.1:** Vite Setup
- `apps/admin/` directory created
- React Router v6 configured
- Tailwind CSS + PostCSS ready
- Jest + React Testing Library configured
- `.env.example` created (API_BASE_URL, SOCKET_URL)

**Task 14.2:** Admin OTP Login
- `src/pages/LoginPage.tsx` — phone input + OTP input
- `src/hooks/useAuthAdmin.ts` — calls backend /auth/send-otp, /auth/verify-otp
- JWT persisted to localStorage
- Protected routes redirect to login if no JWT
- Auto-logout on 401 via Axios interceptor

**Tests:** 15+ (form validation, state, redirects)

---

### DAY 2 — Data Tables (KYC Queue + Document Viewer)

**Task 14.3:** KYC Queue Table (5h)
- `src/pages/KYCReviewPage.tsx`
- `src/components/DataTable.tsx` — reusable TanStack wrapper
- `src/hooks/useKYCQueue.ts` — React Query data fetching
- Filters: status, date range
- Pagination: 10 items/page
- Tests: 25+

**Task 14.4:** Document Viewer (3h)
- `src/components/KYCDocumentViewer.tsx` — lightbox modal
- Fetches signed URL from backend
- Download button
- Error handling (expired, missing)
- Tests: 20+

---

### DAY 3 — Approvals & Shop Mgmt (4h + 5h = 9h → split to Day 3-4)

**Task 14.5:** Approve/Reject Modal (4h)
- Modal with notes field (approve) or required reason (reject)
- PATCH /admin/kyc/:id/approve or reject
- Optimistic UI updates
- Toast notifications
- Tests: 30+

**Task 14.6:** Shop Management Table (5h)
- Reuses DataTable from 14.3
- Filters, search, sort
- Suspend/reinstate with reason modal
- Tests: 40+

---

### DAY 4 — Real-time Features (5h + 4h = 9h → split to Day 4-5)

**Task 14.7:** Order Monitor (5h)
- Real-time via Socket.IO admin room
- Stuck order detection (3m pending, 10m accepted)
- Order detail modal with timeline
- Escalate button
- Tests: 35+

**Task 14.8:** Dispute Resolution (4h)
- Dispute list + detail modal
- GPS trail map (Leaflet)
- Refund approval
- Tests: 35+

---

### DAY 5 — Analytics & Partners (5h + 4h = 9h → split to Day 5-6)

**Task 14.9:** Analytics Dashboard (5h)
- Metric cards, line chart, bar chart (Recharts)
- Date range picker
- Top 10 shops table
- Tests: 30+

**Task 14.10:** Delivery Partner Mgmt (4h)
- Reuses DataTable, KYCDocumentViewer, ApprovalModal
- Similar structure to shop mgmt
- Tests: 30+

---

### DAY 6 — Moderation & Broadcast (3h + 3h = 6h)

**Task 14.11:** Content Moderation (3h)
- Tabs: Reviews | Products
- Filter, search, approve/remove
- Tests: 25+

**Task 14.12:** Broadcast Tool (3h)
- Compose, target, schedule
- Preview notification
- Tests: 20+

---

### DAY 7 — Integration Testing (8h)

- Complete unit tests for all 12 tasks
- Integration test suites (login → approve → order monitor)
- E2E smoke tests
- Security: ESLint, Prettier, Axe a11y, OWASP checks
- Coverage: 80%+ target

---

### DAY 8 — Code Review & Staging (2-4h)

- Clean up code, no console.log, no secrets
- Build succeeds
- Deploy to staging
- Smoke tests on staging
- Ready to merge

---

## SECTION 4: CRITICAL SUCCESS FACTORS

### Must Have (Non-Negotiable)
- ✅ All backend admin APIs exist and are tested (prerequisite)
- ✅ 80%+ test coverage
- ✅ Zero CRITICAL/HIGH security issues
- ✅ TypeScript strict mode (0 errors)
- ✅ Staging deployment successful

### Nice to Have (High Value)
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Real-time order updates don't lag
- ✅ Performance: <200ms API calls, <1s page loads

---

## SECTION 5: BLOCKERS & SOLUTIONS

### BLOCKER #1: Missing Backend Admin APIs

**Status:** 🔴 **CRITICAL**
**Impact:** Frontend can't test without mocking
**Solution:** Create Sprint 13.5 immediately

**18 Endpoints Needed:**

1. `GET /api/v1/admin/kyc/queue` — list pending KYC (paginated, filterable)
2. `GET /api/v1/admin/kyc/signed-url?key=...` — R2 signed URL (5-min TTL)
3. `PATCH /api/v1/admin/kyc/:id/approve` — approve KYC (optional notes)
4. `PATCH /api/v1/admin/kyc/:id/reject` — reject KYC (required reason)
5. `GET /api/v1/admin/shops` — list all shops (paginated, filterable, searchable)
6. `PATCH /api/v1/admin/shops/:id/suspend` — suspend shop (with reason)
7. `PATCH /api/v1/admin/shops/:id/reinstate` — reinstate shop
8. `GET /api/v1/admin/orders/live` — live order monitor (Socket.IO compatible)
9. `GET /api/v1/admin/disputes` — list disputes
10. `GET /api/v1/admin/disputes/:id` — dispute detail with GPS trail
11. `PATCH /api/v1/admin/disputes/:id/resolve` — resolve + refund via Cashfree
12. `GET /api/v1/admin/analytics` — GMV, orders, customers, shops metrics
13. `GET /api/v1/admin/analytics/daily` — daily breakdown by city
14. `GET /api/v1/admin/delivery-partners` — list all partners (same as shops)
15. `PATCH /api/v1/admin/delivery-partners/:id/suspend` — suspend partner
16. `PATCH /api/v1/admin/delivery-partners/:id/reinstate` — reinstate partner
17. `GET /api/v1/admin/moderation/queue` — flagged reviews + products
18. `POST /api/v1/admin/moderation/:id/remove` — soft-delete content
19. `POST /api/v1/admin/broadcast` — send FCM + SMS campaign

---

### BLOCKER #2: Socket.IO Admin Room Not Specified

**Status:** ⚠️ **MEDIUM**
**Impact:** Task 14.7 (Order Monitor) unclear on real-time event flow
**Solution:** Clarify with backend engineer

**Questions:**
- What events does admin room broadcast? (order:created, order:status-changed, order:stuck-alert?)
- How often? (every status change, or polling-based?)
- How is "stuck detection" implemented? (backend job or real-time timestamp check?)

**Recommendation:** Add to Sprint 13.5 backend spec: Socket.IO admin room with order events

---

### BLOCKER #3: GPS Trail Storage Not Specified

**Status:** ⚠️ **MEDIUM**
**Impact:** Task 14.8 (Dispute Resolution) needs GPS trail data model
**Solution:** Clarify database schema

**Questions:**
- Is `disputes` table's `gps_trail` column already defined?
- Format: JSON array of {lat, lng, timestamp}?
- Retention: 30 days? Or tied to dispute resolution?

**Recommendation:** Add to Sprint 13.5 backend spec: Disputes table with GPS trail column

---

## SECTION 6: RECOMMENDATIONS

### Immediate Actions (This Week)

1. **Confirm Sprint 13.5 (Backend Admin APIs) will run in parallel** 🟢 RECOMMENDED
   - Backend engineer creates 18 endpoints + tests
   - All tested before Frontend starts integration
   - Effort: 20-25 hours
   - Timeline: Mon-Wed (April 20-22)

2. **Frontend engineer starts Sprint 14.1-14.2 (Setup + Login) on Monday**
   - No blocking from backend
   - Can be done first 2 days (7-8 hours)
   - By Wednesday, backend APIs are ready for integration

3. **Clarify Socket.IO admin room design**
   - Backend: Which events? Polling or real-time?
   - Frontend: Optimization for high-volume orders

4. **Verify R2 signed URL endpoint exists**
   - Check: `GET /admin/kyc/signed-url` in backend
   - If not in Sprint 13.5, add to task list

### Risk Mitigation

1. **Data table reusability**
   - All 3 data tables (KYC, Shops, Partners) should share `<DataTable>` component
   - Define interface in 14.3, reuse in 14.6 + 14.10
   - Estimated savings: 8-10 hours

2. **API mocking strategy**
   - Use MSW (Mock Service Worker) for unit tests
   - Real backend for integration tests
   - Ensures no surprise API changes mid-sprint

3. **Component reusability**
   - Document all reusable patterns: DataTable, ApprovalModal, DocumentViewer, OrderStatusTimeline
   - Apply DRY principle aggressively
   - Estimated effort savings: 5-8 hours

---

## FINAL VERDICT

🔴 **NOT READY FOR EXECUTION** until Sprint 13.5 backend endpoints are committed to

**Conditional Approval:**
✅ **READY IF** Sprint 13.5 (Backend Admin APIs) is scheduled in parallel (April 20-22)
✅ **READY IF** all 18 backend endpoints are implemented + tested
✅ **READY IF** Socket.IO admin room design is clarified

---

**Sign-off:** nearby-planner agent
**Date:** April 20, 2026
**Next:** Confirm Sprint 13.5 scope, then dispatch to nearby-builder

