# Sprint 14 — Admin Dashboard + KYC Flow

**Duration:** 1 week (Days 1–5)  
**Goal:** Admin can review KYC, manage shops, monitor orders, resolve disputes, view analytics, manage delivery partners, and broadcast messages.  
**Dependencies:** ✅ Sprint 13.5–13.7 admin APIs complete (22 endpoints, 164+ tests, all passing)  
**Tech Stack:** React 18 + Vite + Tailwind CSS + React Query (TanStack Query) + TypeScript

---

## Current Project Status

### Completed
- ✅ Backend Node.js/Express API (851+ tests, 85%+ coverage)
- ✅ Customer app (Sprint 10, 100% complete)
- ✅ Shop owner app (Sprints 11–12, 100% complete with 348/349 tests)
- ✅ Admin API endpoints (Sprints 13.5–13.7, 22 endpoints + 164 tests)
  - KYC endpoints (approve, reject, queue)
  - Shop management (suspend, reinstate, list)
  - Order monitoring (list, escalate)
  - Disputes (list, detail, resolve with refunds)
  - Analytics (summary, daily, top shops)
  - Delivery partners (list, suspend, earnings)
  - Content moderation (list, approve, remove)
  - Broadcast (campaign, history)
  - Socket.IO admin room (order updates, stuck alerts)

### Remaining for Sprint 14
- 🔲 Admin dashboard React app (12 tasks)
- 🔲 Delivery partner app (Sprint 13, 11 tasks)
- 🔲 Integration testing & bug fixes (Sprint 15, 11 tasks)
- 🔲 Launch preparation (Sprint 16, 10 tasks)

---

## Sprint 14 Task Breakdown

### **Task 14.1 — Set Up React + Vite Admin Project** 
**Owner:** [RN1]  
**Effort:** 2 hours  
**Status:** ⬜ Not started

**Deliverables:**
- Vite project scaffold with React 18, TypeScript, Tailwind CSS
- React Router v6 with layout (navbar + sidebar)
- React Query (TanStack Query) v5 for API state management
- Environment variables (.env, .env.example)
- API client setup (axios + interceptors for JWT)
- Basic folder structure:
  ```
  apps/admin/src/
  ├── components/      # Reusable UI components
  ├── pages/          # Page-level components
  ├── hooks/          # Custom hooks (useAuth, useAdminQuery, etc.)
  ├── services/       # API client functions
  ├── store/          # Zustand for auth state
  ├── types/          # TypeScript interfaces
  ├── utils/          # Helpers (formatting, validation)
  ├── App.tsx         # Root router
  └── main.tsx        # Entry point
  ```

**Acceptance Criteria:**
- [ ] `npm run dev` starts Vite dev server on localhost:5173
- [ ] TypeScript strict mode enabled (0 errors)
- [ ] Tailwind CSS working (one test component styled)
- [ ] React Router layout working (navbar + pages visible)
- [ ] API client initialized with JWT interceptor
- [ ] package.json has react, vite, tailwind, react-query, axios, react-router-dom

**Reference:**
- Tech stack from CLAUDE.md
- Tailwind CSS CDN or CLI setup
- React Router v6 guide

---

### **Task 14.2 — Admin Login Screen**
**Owner:** [RN1]  
**Effort:** 1.5 hours  
**Status:** ⬜ Not started

**Deliverables:**
- Login page: phone number input + OTP verification
- Role validation: only `admin` role can access dashboard
- JWT token storage in localStorage
- Redirect logic (protected routes)

**API Calls:**
- `POST /api/v1/auth/send-otp` — Send OTP to admin phone
- `POST /api/v1/auth/verify-otp` — Verify OTP, get JWT
- `GET /api/v1/auth/profile` — Verify admin role

**Acceptance Criteria:**
- [ ] Phone input with +91 prefix, 10-digit validation
- [ ] OTP input (6 digits, auto-submit)
- [ ] JWT stored in localStorage
- [ ] Non-admin role redirects to login
- [ ] Protected routes require auth
- [ ] Logout clears JWT + localStorage

---

### **Task 14.3 — KYC Review Queue**
**Owner:** [RN1]  
**Effort:** 2 hours  
**Status:** ⬜ Not started

**Deliverables:**
- Table view of pending KYC applications
- Columns: Shop name, Owner name, Phone, Status, Submitted date, Actions
- Sortable by name, submitted_at, status
- Filterable by status (pending, approved, rejected)
- Pagination (20 per page)
- Click row → detail view (Task 14.4)

**API Calls:**
- `GET /api/v1/admin/kyc/queue?page=1&limit=20&status=pending&sort=submitted_at` — List KYC queue

**Acceptance Criteria:**
- [ ] Table renders with data from API
- [ ] Sorting works (name, date, status)
- [ ] Filtering by status works
- [ ] Pagination controls visible
- [ ] Row click navigates to detail view
- [ ] Empty state shown if no KYC pending
- [ ] Loading spinner while fetching

---

### **Task 14.4 — KYC Document Viewer**
**Owner:** [RN1]  
**Effort:** 2.5 hours  
**Status:** ⬜ Not started

**Deliverables:**
- Detail page for single KYC application
- Display shop info (name, owner, phone, address)
- Document viewer with signed R2 URLs (Aadhaar, GST, shop photo)
- Document carousel or tabs for multiple docs
- Zoom/pan for images (react-medium-image-zoom or similar)
- Approve/Reject buttons → Task 14.5

**API Calls:**
- `GET /api/v1/admin/kyc/:id` — Get KYC detail with document URLs

**Acceptance Criteria:**
- [ ] KYC detail page loads
- [ ] All documents display (Aadhaar, GST, photo)
- [ ] Images clickable to zoom
- [ ] Document carousel works (previous/next buttons)
- [ ] Phone number masked in display (security)
- [ ] Approve/Reject buttons visible
- [ ] Loading states and error messages

---

### **Task 14.5 — Approve / Reject with Reason**
**Owner:** [RN1]  
**Effort:** 1.5 hours  
**Status:** ⬜ Not started

**Deliverables:**
- Modal/slide-out form for approval (optional notes)
- Modal/slide-out form for rejection (required reason, min 10 chars)
- Success/error toast notifications
- Redirect to queue after action
- Email/SMS confirmation to shop (backend triggers)

**API Calls:**
- `PATCH /api/v1/admin/kyc/:id/approve` — Approve KYC
- `PATCH /api/v1/admin/kyc/:id/reject` — Reject KYC

**Acceptance Criteria:**
- [ ] Approve modal shows with notes field
- [ ] Reject modal shows with required reason field
- [ ] Form validation works (reason min 10 chars)
- [ ] API call on submit
- [ ] Success toast shown
- [ ] Redirect to queue after 2s
- [ ] Backend triggers SMS + FCM to shop

---

### **Task 14.6 — Shop Management Table**
**Owner:** [RN1]  
**Effort:** 2 hours  
**Status:** ⬜ Not started

**Deliverables:**
- Table of all shops (with KYC status, trust score, earnings, etc.)
- Columns: Shop name, Owner, Status (open/closed/suspended), KYC status, Trust score, Created date, Actions
- Sortable by name, trust_score, created_at
- Searchable by shop name, owner phone
- Suspend / Reinstate buttons
- Click shop row → detail view (optional)

**API Calls:**
- `GET /api/v1/admin/shops?page=1&limit=20&sort=name&search=kirana` — List shops
- `PATCH /api/v1/admin/shops/:id/suspend` — Suspend shop
- `PATCH /api/v1/admin/shops/:id/reinstate` — Reinstate shop

**Acceptance Criteria:**
- [ ] Table renders all shops with pagination
- [ ] Sortable by name/trust/date
- [ ] Searchable by name/phone
- [ ] Suspend button with reason modal
- [ ] Reinstate button with confirmation
- [ ] Status badges (Open/Closed/Suspended)
- [ ] Trust score colored (Trusted=green, Good=yellow, etc.)

---

### **Task 14.7 — Live Order Monitor**
**Owner:** [RN1]  
**Effort:** 2.5 hours  
**Status:** ⬜ Not started

**Deliverables:**
- Real-time order dashboard with Socket.IO
- Status breakdown: pending, accepted, packing, ready, assigned, picked_up, out_for_delivery, delivered
- Table with key columns: Order ID, Customer, Shop, Total, Status, Created, Updated
- Auto-refresh on order:updated Socket.IO event
- Stuck order alerts (3+ min pending, 10+ min accepted)
- Escalate button → Task 14.8

**Socket.IO Events:**
- Join admin room on page load
- Listen to order:updated, order:stuck-alert events
- Update table in real-time

**API Calls:**
- `GET /api/v1/admin/orders/live?status=pending` — List orders by status

**Acceptance Criteria:**
- [ ] Table renders orders from API
- [ ] Status tabs work (All, Pending, Accepted, etc.)
- [ ] Socket.IO real-time updates visible
- [ ] Stuck order alert notification shown
- [ ] Escalate button navigates to detail
- [ ] Timestamp shows "X min ago" format
- [ ] Auto-refresh every 30s fallback if no Socket.IO

---

### **Task 14.8 — Dispute Resolution Screen**
**Owner:** [RN1]  
**Effort:** 2 hours  
**Status:** ⬜ Not started

**Deliverables:**
- List of open disputes (similar table to Task 14.6)
- Detail page for single dispute:
  - Order timeline (all status changes)
  - GPS trail map (if available)
  - Refund status (processing/credited/failed)
  - Refund amount input
  - Approve / Deny buttons
  - Chat transcript (if any messages)

**API Calls:**
- `GET /api/v1/admin/disputes?status=open` — List disputes
- `GET /api/v1/admin/disputes/:id` — Get detail with GPS trail
- `PATCH /api/v1/admin/disputes/:id/resolve` — Resolve (approve/deny refund)

**Acceptance Criteria:**
- [ ] Disputes list shows all open disputes
- [ ] Click dispute → detail page
- [ ] Timeline shows order status changes
- [ ] GPS trail displays on map (react-leaflet or similar)
- [ ] Refund input with validation
- [ ] Approve / Deny buttons with confirmation
- [ ] Success message after resolve
- [ ] Calls Cashfree refund API on approve

---

### **Task 14.9 — Platform Analytics Dashboard**
**Owner:** [RN1]  
**Effort:** 3 hours  
**Status:** ⬜ Not started

**Deliverables:**
- Summary cards: Total GMV, Orders count, Active customers, Active shops
- Time period selector (Today, 7d, 30d, 90d)
- Line chart: daily revenue over period
- Bar chart: orders by city
- Top 10 shops table (by revenue)
- Key metrics below cards (avg order value, repeat customer %)

**Libraries:**
- Recharts for charts
- React Query for data fetching and caching

**API Calls:**
- `GET /api/v1/admin/analytics` — Summary metrics
- `GET /api/v1/admin/analytics/daily?range=7d` — Daily breakdown
- `GET /api/v1/admin/analytics/top-shops` — Top shops

**Acceptance Criteria:**
- [ ] Summary cards display correct totals
- [ ] Line chart shows revenue trend
- [ ] Bar chart shows city breakdown
- [ ] Period selector works (Today/7d/30d/90d)
- [ ] Charts responsive on mobile
- [ ] Data updates every 5 min via React Query
- [ ] Loading skeletons shown while fetching

---

### **Task 14.10 — Delivery Partner Management**
**Owner:** [RN1]  
**Effort:** 1.5 hours  
**Status:** ⬜ Not started

**Deliverables:**
- Table of delivery partners (similar to shops)
- Columns: Name, Phone, Orders, Rating, Total earnings, Status, Actions
- Sortable by name, orders, rating, earnings
- Suspend / Reinstate buttons
- Click partner → earnings detail view

**API Calls:**
- `GET /api/v1/admin/delivery-partners` — List partners
- `PATCH /api/v1/admin/delivery-partners/:id/suspend` — Suspend
- `PATCH /api/v1/admin/delivery-partners/:id/reinstate` — Reinstate
- `GET /api/v1/admin/delivery-partners/:id/earnings` — Earnings history

**Acceptance Criteria:**
- [ ] Table renders all partners with pagination
- [ ] Sortable by name/orders/rating/earnings
- [ ] Suspend/Reinstate buttons with modals
- [ ] Rating displayed with stars
- [ ] Earnings clickable → detail view
- [ ] Status badges (Active/Suspended)

---

### **Task 14.11 — Content Moderation**
**Owner:** [RN1]  
**Effort:** 1.5 hours  
**Status:** ⬜ Not started

**Deliverables:**
- Queue of flagged reviews and products
- Two tabs: Reviews, Products
- Columns: Content preview, Creator, Flag count, Reason, Created date, Actions
- Approve (unflag) / Remove (soft-delete) buttons
- Reason modal for removal (notifies creator)

**API Calls:**
- `GET /api/v1/admin/moderation/queue` — List flagged content
- `POST /api/v1/admin/moderation/:id/approve` — Unflag
- `POST /api/v1/admin/moderation/:id/remove` — Soft-delete

**Acceptance Criteria:**
- [ ] Reviews tab shows flagged reviews
- [ ] Products tab shows flagged products
- [ ] Content preview displays (truncated if long)
- [ ] Approve button unflaqs content
- [ ] Remove button with reason modal
- [ ] Creator notified via FCM on remove
- [ ] Content disappears from queue after action

---

### **Task 14.12 — Broadcast Tool (FCM + SMS)**
**Owner:** [RN1]  
**Effort:** 2 hours  
**Status:** ⬜ Not started

**Deliverables:**
- Form to create broadcast campaign:
  - Title (required)
  - Message body (required, max 500 chars)
  - Deep link (optional)
  - Target audience (dropdown: Customers, Shops, Delivery partners)
  - Schedule (immediate or datetime picker)
- Campaign history table (shows sent/pending campaigns)
- Rate limit: 1 campaign/hour per admin

**API Calls:**
- `POST /api/v1/admin/broadcast` — Create campaign
- `GET /api/v1/admin/broadcast/history` — List campaigns

**Acceptance Criteria:**
- [ ] Form validates title, body, target
- [ ] Datetime picker works for scheduled campaigns
- [ ] API call on submit
- [ ] Success toast shown
- [ ] Campaign appears in history
- [ ] Rate limit enforced (toast if exceeded)
- [ ] Campaign history table shows sent_count, created_at

---

## Sprint 14 Definition of Done

✅ **All 12 tasks complete when:**
1. All 12 pages/components built and tested
2. Integrated with backend APIs (22 endpoints)
3. Socket.IO real-time updates working
4. All protected routes require admin role
5. TypeScript strict mode: 0 errors
6. Responsive design on desktop + tablet
7. Error handling for all API calls
8. Toast notifications for user feedback
9. Loading states and empty states everywhere
10. Basic E2E tests (Playwright) for critical flows:
    - Login → KYC approval → SMS trigger
    - Shop suspend → FCM notification
    - Dispute resolve → Cashfree refund
    - Order escalation → admin alert

---

## Effort Estimate

| Task | Hours | Status |
|------|-------|--------|
| 14.1 | 2 | ⬜ |
| 14.2 | 1.5 | ⬜ |
| 14.3 | 2 | ⬜ |
| 14.4 | 2.5 | ⬜ |
| 14.5 | 1.5 | ⬜ |
| 14.6 | 2 | ⬜ |
| 14.7 | 2.5 | ⬜ |
| 14.8 | 2 | ⬜ |
| 14.9 | 3 | ⬜ |
| 14.10 | 1.5 | ⬜ |
| 14.11 | 1.5 | ⬜ |
| 14.12 | 2 | ⬜ |
| **Total** | **23.5 hours** | |

**Expected completion:** 5–6 developer days

---

## Dependencies & Blockers

**None** — All backend APIs complete and tested. Ready to build immediately.

---

## Next Steps

1. ✅ Plan created (this file)
2. Choose start task:
   - **Option A:** Start with Task 14.1 (Vite setup) — sequential approach
   - **Option B:** Start with Task 14.3 (KYC queue) — if API is priority
3. Run `nearby-orchestrator` with chosen task number

---

**Last updated:** April 27, 2026  
**Created by:** Claude Copilot  
**Status:** Ready to start
