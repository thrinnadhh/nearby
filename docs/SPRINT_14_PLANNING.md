# Sprint 14: Admin Dashboard + KYC Flow
**Approval & Shop Management for NearBy Platform**

---

## Executive Summary

**Sprint Duration:** 1 week  
**Owner:** Frontend engineer ([RN1] — React + Vite expert)  
**Goal:** Build the admin web dashboard for KYC approval, shop management, dispute resolution, and platform analytics.

**Dependency:** ✅ **UNBLOCKED** — All backend APIs (Sprints 1–6), all mobile apps (Sprints 7–13) are production-ready. No API gaps.

**Definition of Done:**
- [ ] 12/12 tasks completed
- [ ] 80%+ test coverage (Jest + React Testing Library)
- [ ] Zero CRITICAL/HIGH security issues (OWASP Top 10)
- [ ] All acceptance criteria met
- [ ] Code reviewed + merged to main
- [ ] Deployment ready to staging

---

## Current Build Status

| Component | Status | Notes |
|-----------|--------|-------|
| Backend API | ✅ Complete | 49/49 tasks (Sprints 1–6); 529/529 tests passing |
| Customer App | ✅ Complete | Sprints 8–10; all features end-to-end |
| Shop Owner App | ✅ Complete | Sprints 11–12; product catalog, bulk upload, earnings dashboard |
| Delivery Partner App | ✅ Complete | Sprint 13; partner registration, KYC, GPS tracking; 42/42 tests passing |
| **Admin Dashboard** | ⏳ **Sprint 14** | Web app: KYC review, shop management, disputes, analytics |
| Launch Prep | ⏳ Sprint 15–16 | E2E testing, go-live |

**Combined Test Status:** 571/571 tests passing (100%) — Ready for admin dashboard integration.

---

## Architecture & Setup

### Technology Stack
```
Frontend:    React 18 + Vite + TypeScript (strict mode)
Build:       npm run build → dist/
Dev server:  npm run dev (http://localhost:5173)
UI Kit:      Tailwind CSS v3 + Headless UI
State:       React Query v5 (data fetching + caching)
Tables:      TanStack Table v8 (sortable, filterable data)
Auth:        JWT from /auth/send-otp + /auth/verify-otp (existing backend)
API Client:  Axios with interceptors (auto-refresh on 401)
Testing:     Jest + React Testing Library
Build Tool:  Vite (esbuild backend, ~3s build time)
```

### Project Structure
```
apps/admin/
├── src/
│   ├── App.tsx                          — Root layout + routing
│   ├── main.tsx                         — Entry point
│   ├── index.css                        — Tailwind imports
│   ├── pages/
│   │   ├── LoginPage.tsx                — OTP login for admins
│   │   ├── KYCReviewPage.tsx            — KYC queue, approve/reject
│   │   ├── ShopManagementPage.tsx       — All shops, status, controls
│   │   ├── DisputeResolutionPage.tsx    — Order disputes + GPS trails
│   │   ├── OrderMonitorPage.tsx         — Live orders + alerts
│   │   ├── AnalyticsDashboard.tsx       — GMV, charts, city breakdown
│   │   ├── DeliveryPartnerMgmt.tsx      — Partner KYC approval, earnings
│   │   ├── ContentModerationPage.tsx    — Flag/remove reviews + products
│   │   └── BroadcastToolPage.tsx        — FCM + SMS campaigns
│   ├── components/
│   │   ├── KYCDocumentViewer.tsx        — R2 signed URL viewer
│   │   ├── OrderStatusTimeline.tsx      — Order state machine visualization
│   │   ├── DataTable.tsx                — Reusable TanStack Table wrapper
│   │   ├── ApprovalModal.tsx            — Approve/reject with reason
│   │   ├── GPSTrailMap.tsx              — Leaflet map of delivery GPS
│   │   ├── AnalyticsCard.tsx            — Metric cards (GMV, orders, etc.)
│   │   ├── ChartCard.tsx                — Chart containers (Recharts)
│   │   └── NotificationBell.tsx         — Real-time Socket.IO alerts
│   ├── services/
│   │   ├── api.ts                       — Axios instance + interceptors
│   │   ├── auth.ts                      — OTP login, JWT handling
│   │   ├── kyc.ts                       — GET /admin/kyc/queue, PATCH approve/reject
│   │   ├── shops.ts                     — GET /admin/shops, PATCH suspend/reinstate
│   │   ├── disputes.ts                  — GET /admin/disputes, POST resolution
│   │   ├── orders.ts                    — GET /admin/orders/live, stuck detection
│   │   ├── analytics.ts                 — GET /admin/analytics
│   │   ├── partners.ts                  — GET /admin/delivery-partners
│   │   └── moderation.ts                — POST /admin/content/flag
│   ├── hooks/
│   │   ├── useAuthAdmin.ts              — Persist JWT in localStorage + refresh
│   │   ├── useKYCQueue.ts               — React Query for KYC approvals
│   │   ├── useShops.ts                  — React Query for shop list
│   │   ├── useOrders.ts                 — Real-time orders via Socket.IO
│   │   ├── useAnalytics.ts              — Periodic analytics fetch
│   │   └── useSocket.ts                 — Socket.IO admin room connection
│   ├── types/
│   │   ├── kyc.ts                       — KYCApplication, KYCDocument types
│   │   ├── shop.ts                      — Shop, ShopStatus, ShopMetrics
│   │   ├── order.ts                     — Order, OrderStatus, OrderEvent
│   │   ├── dispute.ts                   — Dispute, DisputeResolution
│   │   ├── analytics.ts                 — AnalyticsMetrics, TimeSeriesData
│   │   └── index.ts                     — Barrel export
│   ├── utils/
│   │   ├── formatting.ts                — Format currency, dates, phone
│   │   ├── validation.ts                — OTP, admin email, etc.
│   │   └── permissions.ts               — Check admin role scopes
│   ├── __tests__/
│   │   ├── LoginPage.test.tsx           — OTP flow for admin
│   │   ├── KYCReviewPage.test.tsx       — Approve/reject functionality
│   │   ├── ShopManagementPage.test.tsx  — Suspend/reinstate
│   │   ├── DisputeResolution.test.tsx   — Resolve with refund
│   │   ├── OrderMonitor.test.tsx        — Stuck order alerts
│   │   ├── AnalyticsDashboard.test.tsx  — Metrics + charts
│   │   └── services/
│   │       ├── api.test.ts              — Axios mock + interceptors
│   │       ├── kyc.test.ts              — API calls
│   │       └── [other service tests]
│   └── jest.config.js
├── vite.config.ts
├── tsconfig.json
├── package.json
└── index.html
```

---

## Task Breakdown

### **Task 14.1: Set up React + Vite admin project** _(~3 hours)_

**Acceptance Criteria:**
- [x] Vite project initialized with React 18 + TypeScript
- [x] Tailwind CSS v3 configured (PostCSS)
- [x] Routing: React Router v6 with protected routes
- [x] Environment variables (.env.example) set up
- [x] `npm run dev` launches on `http://localhost:5173`
- [x] `npm run build` outputs `dist/` with sourcemaps
- [x] ESLint + Prettier configured
- [x] jest.config.js set up for unit tests

**Implementation Details:**

```bash
# Project bootstrap
cd apps && npx create-vite@latest admin -- --template react-ts

# Install dependencies
cd admin
npm install react-router-dom axios react-query @tanstack/react-query
npm install -D tailwindcss postcss autoprefixer jest @testing-library/react

# Initialize Tailwind
npx tailwindcss init -p

# Create .env.example
cat > .env.example << 'EOF'
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_SOCKET_URL=http://localhost:3000
EOF
```

**Key Files to Create:**
- `vite.config.ts` — Vite + React + TypeScript config
- `tsconfig.json` — TypeScript strict mode enabled
- `tailwind.config.js` — Tailwind + content paths
- `jest.config.js` — Test setup
- `src/App.tsx` — Root layout with routing
- `src/main.tsx` — React DOM render

**Testing:**
```bash
npm run dev        # Should start server on :5173
npm run build      # Should compile without errors
npm test           # Should run empty test suite
```

---

### **Task 14.2: Admin login (OTP + admin role check)** _(~4 hours)_

**Acceptance Criteria:**
- [x] LoginPage.tsx — Phone input (10-digit), send OTP button
- [x] OTP input — 6-digit auto-advance, 60s resend timer
- [x] Verify OTP — POST /auth/verify-otp → JWT
- [x] JWT persisted to localStorage (expo-web-storage pattern)
- [x] Validate role === "admin" in JWT payload
- [x] On success → redirect to KYC review page
- [x] On failure → "Invalid OTP" + retry
- [x] Protected routes require JWT + admin role
- [x] Auto-logout on 401 (token expired)
- [x] 25+ tests covering all flows

**Implementation Details:**

```tsx
// src/pages/LoginPage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendOtp, verifyOtp } from '../services/auth';

export function LoginPage() {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const navigate = useNavigate();

  const handleSendOtp = async () => {
    // Validate phone (10 digits)
    if (!/^\d{10}$/.test(phone)) {
      setError('Phone must be 10 digits');
      return;
    }
    setLoading(true);
    try {
      await sendOtp(phone);
      setStep('otp');
      setResendTimer(60);
      const interval = setInterval(() => {
        setResendTimer(t => t > 0 ? t - 1 : 0);
      }, 1000);
      return () => clearInterval(interval);
    } catch (err) {
      setError('Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!/^\d{6}$/.test(otp)) {
      setError('OTP must be 6 digits');
      return;
    }
    setLoading(true);
    try {
      const { token, user } = await verifyOtp(phone, otp);
      if (user.role !== 'admin') {
        setError('Admin access only');
        return;
      }
      localStorage.setItem('adminToken', token);
      localStorage.setItem('adminUser', JSON.stringify(user));
      navigate('/kyc-review');
    } catch (err) {
      setError('Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  // ... UI implementation with Tailwind
}
```

**API Contract:**
- POST `/auth/send-otp` — `{ phone: string }` → `{ message: "OTP sent" }`
- POST `/auth/verify-otp` — `{ phone: string, otp: string }` → `{ token: JWT, user: { id, phone, role } }`

**Tests:**
- [x] Phone validation (accepts 10 digits, rejects <10 or >10)
- [x] Send OTP — calls API and transitions to OTP step
- [x] Resend timer — countdown from 60 to 0
- [x] OTP input — auto-advances through 6 boxes
- [x] Verify OTP — success path (admin role) → navigate
- [x] Verify OTP — failure path (non-admin) → error
- [x] Verify OTP — invalid format → error
- [x] JWT persisted to localStorage
- [x] Protected routes redirect to login if no JWT

---

### **Task 14.3: KYC review queue table** _(~5 hours)_

**Acceptance Criteria:**
- [x] GET /admin/kyc/queue — fetch pending KYC applications
- [x] TanStack Table v8 — sortable by date_submitted, status, shop_name
- [x] Filter by status: all, pending, approved, rejected
- [x] Pagination: 10 per page, show total count
- [x] Columns: ID | Shop Name | Owner Phone | Status | Submitted | Actions
- [x] "View Documents" button → opens document viewer modal
- [x] "Approve" / "Reject" buttons → open modal with reason field
- [x] Oldest applications first (FIFO fairness)
- [x] Real-time badge: "Pending for X hours"
- [x] Empty state when no pending KYCs
- [x] Error state with retry button
- [x] 35+ tests covering table, filters, sorting, pagination

**Implementation Details:**

```tsx
// src/pages/KYCReviewPage.tsx
import { useQuery } from 'react-query';
import { getKYCQueue, approveKYC, rejectKYC } from '../services/kyc';
import DataTable from '../components/DataTable';
import ApprovalModal from '../components/ApprovalModal';

export function KYCReviewPage() {
  const [status, setStatus] = useState('pending');
  const [sorting, setSorting] = useState([{ id: 'date_submitted', desc: true }]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [selectedKYC, setSelectedKYC] = useState(null);

  const { data, isLoading, error } = useQuery(
    ['kyc-queue', status, pagination],
    () => getKYCQueue({
      status: status === 'all' ? undefined : status,
      offset: pagination.pageIndex * pagination.pageSize,
      limit: pagination.pageSize,
      sort: sorting[0].id,
      order: sorting[0].desc ? 'desc' : 'asc'
    }),
    { refetchInterval: 30000 } // Refresh every 30s
  );

  const handleApprove = async (kyc, reason = '') => {
    await approveKYC(kyc.id, reason);
    // Invalidate query to refetch
  };

  const handleReject = async (kyc, reason) => {
    await rejectKYC(kyc.id, reason);
    // Invalidate query to refetch
  };

  // ... DataTable setup with columns, sorting, pagination
}
```

**Backend API Contract:**
```
GET /admin/kyc/queue?status=pending&limit=10&offset=0&sort=date_submitted&order=desc
Response: {
  success: true,
  data: {
    applications: [
      {
        id: UUID,
        shop_id: UUID,
        shop_name: string,
        owner_phone: string,
        status: "pending" | "approved" | "rejected",
        documents: {
          aadhaar_url: string,
          gst_url?: string,
          shop_photo_url: string
        },
        submitted_at: ISO8601,
        admin_notes?: string
      }
    ],
    total: number,
    page: number,
    pages: number
  }
}
```

**Tests:**
- [x] Fetch KYC queue on mount
- [x] Display all pending applications with correct columns
- [x] Sort by date_submitted (newest first)
- [x] Filter by status (all, pending, approved, rejected)
- [x] Pagination: show page 1 (10 items), navigate to page 2
- [x] "View Documents" opens modal with viewer
- [x] "Approve" button → opens modal with reason input
- [x] "Reject" button → opens modal with required reason
- [x] Real-time badge shows hours pending
- [x] Error state with retry button
- [x] Empty state when no KYCs
- [x] Refresh every 30 seconds (auto-update)

---

### **Task 14.4: KYC document viewer (R2 signed URL)** _(~3 hours)_

**Acceptance Criteria:**
- [x] KYCDocumentViewer.tsx — displays Aadhaar, GST, shop photo
- [x] Fetches signed URL from R2 (5-min TTL via backend)
- [x] Images load via `<img>` with fallback for PDF/doc
- [x] Full-screen lightbox modal for documents
- [x] Download button (signed URL)
- [x] Error handling — "Document not found" or "Expired link"
- [x] Responsive on mobile/tablet
- [x] No manual R2 credential exposure in frontend
- [x] 20+ tests for viewer, lightbox, download

**Implementation Details:**

```tsx
// src/components/KYCDocumentViewer.tsx
import { useState, useEffect } from 'react';
import { getSignedDocumentUrl } from '../services/kyc';

interface Props {
  documentKey: string; // e.g., "kyc/aadhaar/shop-001.jpg"
  label: string;
}

export function KYCDocumentViewer({ documentKey, label }: Props) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    getSignedDocumentUrl(documentKey)
      .then(setUrl)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [documentKey]);

  if (loading) return <div className="animate-pulse">Loading...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div>
      <img
        src={url}
        alt={label}
        className="max-w-sm cursor-pointer rounded"
        onClick={() => setIsFullScreen(true)}
      />
      {isFullScreen && (
        <Modal onClose={() => setIsFullScreen(false)}>
          <img src={url} alt={label} className="max-w-4xl" />
          <a href={url} download className="mt-4 btn btn-primary">
            Download
          </a>
        </Modal>
      )}
    </div>
  );
}
```

**Backend API Contract (Existing):**
```
GET /admin/kyc/signed-url?key=kyc/aadhaar/shop-001.jpg
Response: {
  success: true,
  data: {
    url: "https://cdn.nearby.app/kyc/aadhaar/shop-001.jpg?X-Amz-Signature=..."
  }
}
```

**Tests:**
- [x] Fetch signed URL on mount
- [x] Display image from signed URL
- [x] Click image opens fullscreen modal
- [x] Download button has correct href
- [x] Error state shows "Document not found"
- [x] Loading spinner while fetching URL
- [x] Close modal with X button
- [x] Lightbox is responsive

---

### **Task 14.5: Approve / reject with reason** _(~4 hours)_

**Acceptance Criteria:**
- [x] ApprovalModal.tsx — modal for approve/reject
- [x] Approve flow: optional notes field → POST /admin/kyc/:id/approve
- [x] Reject flow: required reason field (min 10 chars) → POST /admin/kyc/:id/reject
- [x] Backend triggers MSG91 SMS + FCM to shop owner
- [x] On success → toast notification + reload queue
- [x] On error → show error message + allow retry
- [x] Optimistic UI update (gray out row while processing)
- [x] Validation — reject reason required, min length
- [x] 30+ tests for both flows, validation, notifications

**Implementation Details:**

```tsx
// src/components/ApprovalModal.tsx
interface Props {
  kyc: KYCApplication;
  action: 'approve' | 'reject';
  onClose: () => void;
  onSuccess: () => void;
}

export function ApprovalModal({ kyc, action, onClose, onSuccess }: Props) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    // Validation
    if (action === 'reject' && notes.length < 10) {
      setError('Reason must be at least 10 characters');
      return;
    }

    setLoading(true);
    try {
      if (action === 'approve') {
        await approveKYC(kyc.id, { admin_notes: notes });
        // Toast: "KYC approved. Shop notified via SMS & FCM."
      } else {
        await rejectKYC(kyc.id, { rejection_reason: notes });
        // Toast: "KYC rejected. Shop notified."
      }
      onSuccess(); // Refetch queue
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={action === 'approve' ? 'Approve KYC' : 'Reject KYC'}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600">Shop: {kyc.shop_name}</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={action === 'approve' ? 'Optional admin notes' : 'Reason for rejection (required)'}
          className="w-full p-2 border rounded"
          rows={4}
        />
        {error && <div className="text-red-600">{error}</div>}
        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={loading || (action === 'reject' && notes.length < 10)}
            className="btn btn-primary"
          >
            {loading ? 'Processing...' : action === 'approve' ? 'Approve KYC' : 'Reject KYC'}
          </button>
          <button onClick={onClose} className="btn btn-ghost">
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
```

**Backend API Contract:**
```
PATCH /admin/kyc/:id/approve
Body: { admin_notes?: string }
Response: { success: true, data: { kyc: KYCApplication } }

PATCH /admin/kyc/:id/reject
Body: { rejection_reason: string }
Response: { success: true, data: { kyc: KYCApplication } }
```

**Tests:**
- [x] Approve flow: optional notes + submit
- [x] Reject flow: required reason, min 10 chars
- [x] Reject without reason shows error
- [x] Loading state during submit
- [x] Success toast notification
- [x] Error toast on failure
- [x] Modal closes after success
- [x] Reload queue on success

---

### **Task 14.6: Shop management table (all shops)** _(~5 hours)_

**Acceptance Criteria:**
- [x] ShopManagementPage.tsx — table of all shops
- [x] GET /admin/shops — fetch with filters
- [x] Columns: ID | Name | Owner | KYC Status | Open? | Trust Score | Actions
- [x] Filter by: all, kyc_pending, kyc_approved, kyc_rejected, suspended
- [x] Sort by: name, trust_score, created_at
- [x] Actions: View Details | Suspend | Reinstate | Edit Profile
- [x] Suspend → reason modal → triggers MSG91 + FCM
- [x] Reinstate → confirm modal → reverses suspension
- [x] Edit → modal to change contact, bank details, hours
- [x] Search by shop name or owner phone
- [x] 40+ tests for filters, sorting, actions

**Implementation Details:**

```tsx
// src/pages/ShopManagementPage.tsx
export function ShopManagementPage() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState([{ id: 'created_at', desc: true }]);

  const { data, isLoading } = useQuery(
    ['shops', filter, search, sorting],
    () => getShops({
      status: filter === 'all' ? undefined : filter,
      q: search || undefined,
      sort: sorting[0].id,
      order: sorting[0].desc ? 'desc' : 'asc'
    }),
    { refetchInterval: 60000 }
  );

  const handleSuspend = async (shop, reason) => {
    await suspendShop(shop.id, { reason });
    // Triggers: MSG91 SMS + FCM to shop owner
  };

  const handleReinstate = async (shop) => {
    await reinstateShop(shop.id);
    // Triggers: FCM to shop owner
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 border rounded"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 border rounded"
        >
          <option value="all">All Shops</option>
          <option value="kyc_pending">Pending KYC</option>
          <option value="kyc_approved">KYC Approved</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <DataTable
        columns={[
          { id: 'name', header: 'Shop Name', sortable: true },
          { id: 'owner', header: 'Owner', sortable: false },
          { id: 'kyc_status', header: 'KYC Status' },
          { id: 'is_open', header: 'Status', cell: (row) => row.is_open ? '🟢 Open' : '🔴 Closed' },
          { id: 'trust_score', header: 'Trust Score', sortable: true },
          {
            id: 'actions',
            header: 'Actions',
            cell: (row) => (
              <div className="space-x-2">
                <button onClick={() => setSelectedShop(row)}>View</button>
                {row.status !== 'suspended' && (
                  <button onClick={() => handleSuspend(row)}>Suspend</button>
                )}
                {row.status === 'suspended' && (
                  <button onClick={() => handleReinstate(row)}>Reinstate</button>
                )}
              </div>
            )
          }
        ]}
        data={data?.shops || []}
        sorting={sorting}
        onSortingChange={setSorting}
        isLoading={isLoading}
      />
    </div>
  );
}
```

**Backend API Contract:**
```
GET /admin/shops?status=all&q=&sort=created_at&order=desc
Response: {
  success: true,
  data: {
    shops: [
      {
        id: UUID,
        name: string,
        owner_name: string,
        owner_phone: string,
        kyc_status: "pending" | "approved" | "rejected",
        is_open: boolean,
        trust_score: number,
        status: "active" | "suspended" | "closed",
        created_at: ISO8601
      }
    ]
  }
}

PATCH /admin/shops/:id/suspend
Body: { reason: string }
Response: { success: true }

PATCH /admin/shops/:id/reinstate
Response: { success: true }
```

**Tests:**
- [x] Fetch all shops on mount
- [x] Filter by KYC status, suspended
- [x] Search by shop name
- [x] Sort by name, trust score, created date
- [x] Suspend modal shows reason input
- [x] Reinstate confirmation modal
- [x] Actions disabled for certain statuses
- [x] Success toast after suspend/reinstate

---

### **Task 14.7: Live order monitor** _(~5 hours)_

**Acceptance Criteria:**
- [x] OrderMonitorPage.tsx — real-time order dashboard
- [x] Socket.IO `admin` room → listen for order events
- [x] Fetch initial orders: GET /admin/orders/live?status=all
- [x] Columns: Order ID | Customer | Shop | Status | Total | ETA | Actions
- [x] Filter by: all, pending, accepted, packing, ready, assigned, out_for_delivery, delivered
- [x] Stuck order detection: pending > 3 min or accepted > 10 min → red highlight + ⚠️ badge
- [x] Real-time status updates via Socket.IO
- [x] Refresh button + auto-refresh every 30s
- [x] "Escalate to Admin" button → sends FCM alert + logs event
- [x] Order detail modal on click (show timeline, items, delivery partner)
- [x] 35+ tests for Socket.IO, real-time updates, stuck detection

**Implementation Details:**

```tsx
// src/pages/OrderMonitorPage.tsx
export function OrderMonitorPage() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all');
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Fetch initial orders
    getLiveOrders({ status: filter === 'all' ? undefined : filter })
      .then(setOrders);

    // Connect to Socket.IO admin room
    const newSocket = io(process.env.VITE_SOCKET_URL, {
      auth: { token: localStorage.getItem('adminToken') }
    });

    newSocket.on('order:status-changed', (event) => {
      // Update order in list
      setOrders(prev => prev.map(o => o.id === event.order_id ? { ...o, status: event.new_status } : o));
    });

    newSocket.on('order:stuck-alert', (event) => {
      // Highlight stuck order + show toast
      showToast(`⚠️ Order ${event.order_id} stuck for ${event.duration_minutes}m`, 'warning');
    });

    setSocket(newSocket);
    return () => newSocket.close();
  }, [filter]);

  const isStuck = (order) => {
    const now = new Date();
    const createdAt = new Date(order.created_at);
    const minutes = (now.getTime() - createdAt.getTime()) / 60000;

    if (order.status === 'pending' && minutes > 3) return true;
    if (order.status === 'accepted' && minutes > 10) return true;
    return false;
  };

  const handleEscalate = async (order) => {
    await escalateOrder(order.id, { admin_reason: 'Stuck or critical' });
    showToast('Escalated. Shop + support notified.', 'success');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Live Orders</h1>
        <button onClick={() => getLiveOrders()} className="btn btn-sm btn-outline">
          🔄 Refresh
        </button>
      </div>

      <select value={filter} onChange={(e) => setFilter(e.target.value)}>
        <option value="all">All</option>
        <option value="pending">Pending (0-3min)</option>
        <option value="stuck">⚠️ Stuck Orders</option>
        {/* ... other statuses */}
      </select>

      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th>Order ID</th>
            <th>Customer</th>
            <th>Shop</th>
            <th>Status</th>
            <th>Total</th>
            <th>ETA</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(order => (
            <tr
              key={order.id}
              className={isStuck(order) ? 'bg-red-100' : ''}
              onClick={() => setSelectedOrder(order)}
            >
              <td className="font-mono text-sm">{order.id.slice(0, 8)}</td>
              <td>{order.customer_phone}</td>
              <td>{order.shop_name}</td>
              <td>
                {order.status}
                {isStuck(order) && <span className="ml-2 text-red-600">⚠️ STUCK</span>}
              </td>
              <td>₹{order.total_paise / 100}</td>
              <td>{order.eta ? formatTime(new Date(order.eta)) : '—'}</td>
              <td>
                <button onClick={() => handleEscalate(order)} className="btn btn-sm btn-warning">
                  Escalate
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedOrder && (
        <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
    </div>
  );
}
```

**Backend API Contract:**
```
GET /admin/orders/live?status=pending&limit=50
Response: {
  success: true,
  data: {
    orders: [
      {
        id: UUID,
        customer_phone: string,
        shop_id: UUID,
        shop_name: string,
        status: OrderStatus,
        total_paise: number,
        created_at: ISO8601,
        eta?: ISO8601,
        delivery_partner?: { id, name, phone },
        items: Array
      }
    ]
  }
}

Socket.IO events (listen):
  order:status-changed → { order_id, new_status, changed_at }
  order:stuck-alert → { order_id, status, duration_minutes }
  order:escalated → { order_id, admin_id, reason }
```

**Tests:**
- [x] Fetch initial orders on mount
- [x] Connect to Socket.IO admin room
- [x] Receive order:status-changed → update UI
- [x] Detect stuck orders (pending > 3m, accepted > 10m)
- [x] Highlight stuck orders with red background + ⚠️ badge
- [x] Filter by status
- [x] Escalate button → POST + notify
- [x] Click order opens detail modal with timeline

---

### **Task 14.8: Dispute resolution screen** _(~4 hours)_

**Acceptance Criteria:**
- [x] DisputeResolutionPage.tsx — list of open disputes
- [x] GET /admin/disputes — fetch with filter (open, resolved, escalated)
- [x] Columns: ID | Order | Customer | Reason | Severity | Created | Status
- [x] Click row → detail modal with timeline + GPS trail
- [x] Reasons: product_wrong, product_missing, product_damaged, delivery_late, order_never_delivered
- [x] View GPS trail: map with delivery partner's live route during order
- [x] Refund button → modal with amount + approve/reject
- [x] Refund approval: POST /admin/disputes/:id/resolve → Cashfree refund + notify
- [x] Add notes/resolution comment
- [x] Severity badge: critical, high, medium, low
- [x] 35+ tests for dispute flows, refunds, GPS trail

**Implementation Details:**

```tsx
// src/pages/DisputeResolutionPage.tsx
export function DisputeResolutionPage() {
  const [disputes, setDisputes] = useState([]);
  const [filter, setFilter] = useState('open');
  const [selectedDispute, setSelectedDispute] = useState(null);

  const { data } = useQuery(
    ['disputes', filter],
    () => getDisputes({ status: filter }),
    { refetchInterval: 30000 }
  );

  useEffect(() => {
    setDisputes(data?.disputes || []);
  }, [data]);

  const handleResolveDispute = async (dispute, resolution) => {
    await resolveDispute(dispute.id, {
      resolution_type: resolution.type, // 'refund_full', 'refund_partial', 'no_refund'
      refund_amount_paise: resolution.amount,
      notes: resolution.notes
    });
    showToast('Dispute resolved. Customer notified.', 'success');
  };

  return (
    <div className="space-y-4">
      <select value={filter} onChange={(e) => setFilter(e.target.value)}>
        <option value="open">Open Disputes</option>
        <option value="resolved">Resolved</option>
        <option value="escalated">Escalated</option>
      </select>

      <table className="w-full">
        <thead>
          <tr>
            <th>ID</th>
            <th>Order</th>
            <th>Customer</th>
            <th>Reason</th>
            <th>Severity</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {disputes.map(dispute => (
            <tr key={dispute.id} onClick={() => setSelectedDispute(dispute)}>
              <td>{dispute.id.slice(0, 8)}</td>
              <td>{dispute.order_id.slice(0, 8)}</td>
              <td>{dispute.customer_phone}</td>
              <td>{dispute.reason}</td>
              <td>
                <span className={`badge badge-${SEVERITY_MAP[dispute.severity]}`}>
                  {dispute.severity}
                </span>
              </td>
              <td>{formatDate(dispute.created_at)}</td>
              <td>
                <button className="btn btn-sm btn-primary">Resolve</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedDispute && (
        <DisputeDetailModal
          dispute={selectedDispute}
          onResolve={handleResolveDispute}
          onClose={() => setSelectedDispute(null)}
        />
      )}
    </div>
  );
}

// src/components/DisputeDetailModal.tsx
function DisputeDetailModal({ dispute, onResolve, onClose }) {
  const [refundAmount, setRefundAmount] = useState(dispute.order_total_paise);
  const [notes, setNotes] = useState('');

  return (
    <Modal isOpen onClose={onClose} title={`Dispute #${dispute.id.slice(0, 8)}`}>
      <div className="space-y-4">
        {/* Timeline */}
        <OrderStatusTimeline order={dispute.order} />

        {/* GPS Trail Map */}
        <GPSTrailMap orderId={dispute.order_id} />

        {/* Refund */}
        <div className="space-y-2">
          <label>Refund Amount (₹)</label>
          <input
            type="number"
            value={refundAmount / 100}
            onChange={(e) => setRefundAmount(parseInt(e.target.value) * 100)}
            className="w-full px-3 py-2 border rounded"
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Resolution notes"
            className="w-full px-3 py-2 border rounded"
            rows={3}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onResolve(dispute, { type: 'refund_full', amount: refundAmount, notes })}
            className="btn btn-primary"
          >
            Approve Refund
          </button>
          <button
            onClick={() => onResolve(dispute, { type: 'no_refund', notes })}
            className="btn btn-outline"
          >
            Deny Refund
          </button>
          <button onClick={onClose} className="btn btn-ghost">
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
```

**Backend API Contract:**
```
GET /admin/disputes?status=open&limit=20
Response: {
  success: true,
  data: {
    disputes: [
      {
        id: UUID,
        order_id: UUID,
        customer_phone: string,
        shop_id: UUID,
        reason: string,
        severity: "critical" | "high" | "medium" | "low",
        order_total_paise: number,
        gps_trail: Array<{ lat, lng, timestamp }>,
        created_at: ISO8601,
        status: "open" | "resolved" | "escalated"
      }
    ]
  }
}

PATCH /admin/disputes/:id/resolve
Body: { resolution_type: "refund_full" | "refund_partial" | "no_refund", refund_amount_paise?: number, notes: string }
Response: { success: true, data: { dispute } }
```

**Tests:**
- [x] Fetch disputes on mount
- [x] Filter by status (open, resolved, escalated)
- [x] Click dispute opens detail modal
- [x] Display order timeline
- [x] Display GPS trail on map
- [x] Adjust refund amount
- [x] Approve refund → POST + notify customer
- [x] Deny refund → POST + notify customer

---

### **Task 14.9: Platform analytics dashboard** _(~5 hours)_

**Acceptance Criteria:**
- [x] AnalyticsDashboard.tsx — overview of platform metrics
- [x] Top metrics: Total GMV (₹), Orders, Customers, Shops
- [x] 7-day revenue trend (line chart)
- [x] City breakdown (bar chart: GMV by city)
- [x] Top 10 shops (by revenue)
- [x] Delivery partner stats: active, completed orders, avg rating
- [x] Date range picker (7d, 30d, 90d custom)
- [x] GET /admin/analytics — fetch metrics
- [x] Recharts for charts, React Query for caching
- [x] Real-time refresh every 60s
- [x] 30+ tests for charts, metrics, date range

**Implementation Details:**

```tsx
// src/pages/AnalyticsDashboard.tsx
export function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState('7d');
  const [metrics, setMetrics] = useState(null);

  const { data, isLoading } = useQuery(
    ['analytics', dateRange],
    () => getAnalytics({ period: dateRange }),
    { refetchInterval: 60000 }
  );

  useEffect(() => {
    setMetrics(data?.metrics);
  }, [data]);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Platform Analytics</h1>
        <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="custom">Custom range</option>
        </select>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <AnalyticsCard
          title="Total GMV"
          value={`₹${metrics.total_gmv_paise / 100}`}
          trend={metrics.gmv_trend}
        />
        <AnalyticsCard
          title="Orders"
          value={metrics.total_orders}
          trend={metrics.order_trend}
        />
        <AnalyticsCard
          title="Customers"
          value={metrics.unique_customers}
          trend={metrics.customer_trend}
        />
        <AnalyticsCard
          title="Shops"
          value={metrics.active_shops}
          trend={metrics.shop_trend}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        <ChartCard title="7-Day Revenue">
          <LineChart data={metrics.revenue_timeline}>
            <CartesianGrid />
            <XAxis />
            <YAxis />
            <Line type="monotone" dataKey="revenue" stroke="#8b5cf6" />
          </LineChart>
        </ChartCard>

        <ChartCard title="City Breakdown">
          <BarChart data={metrics.city_breakdown}>
            <CartesianGrid />
            <XAxis />
            <YAxis />
            <Bar dataKey="gmv" fill="#3b82f6" />
          </BarChart>
        </ChartCard>
      </div>

      {/* Top Shops */}
      <div>
        <h2 className="text-lg font-bold mb-4">Top 10 Shops</h2>
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th>Rank</th>
              <th>Shop Name</th>
              <th>GMV (₹)</th>
              <th>Orders</th>
              <th>Avg Order</th>
            </tr>
          </thead>
          <tbody>
            {metrics.top_shops.map((shop, idx) => (
              <tr key={shop.id}>
                <td>{idx + 1}</td>
                <td>{shop.name}</td>
                <td>₹{shop.gmv_paise / 100}</td>
                <td>{shop.order_count}</td>
                <td>₹{(shop.gmv_paise / shop.order_count / 100).toFixed(0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

**Backend API Contract:**
```
GET /admin/analytics?period=7d
Response: {
  success: true,
  data: {
    metrics: {
      total_gmv_paise: number,
      total_orders: number,
      unique_customers: number,
      active_shops: number,
      gmv_trend: "+5.2%",
      order_trend: "-2.1%",
      revenue_timeline: Array<{ date, revenue_paise }>,
      city_breakdown: Array<{ city, gmv_paise, order_count }>,
      top_shops: Array<{ id, name, gmv_paise, order_count }>
    }
  }
}
```

**Tests:**
- [x] Fetch analytics on mount
- [x] Display metric cards with correct values
- [x] Render line chart (revenue trend)
- [x] Render bar chart (city breakdown)
- [x] Change date range → refetch data
- [x] Show loading spinner while fetching
- [x] Auto-refresh every 60s

---

### **Task 14.10: Delivery partner management** _(~4 hours)_

**Acceptance Criteria:**
- [x] DeliveryPartnerMgmtPage.tsx — list of all delivery partners
- [x] GET /admin/delivery-partners — fetch with filters
- [x] Columns: ID | Name | Phone | KYC Status | Orders | Rating | Earnings | Actions
- [x] Filter by: all, kyc_pending, kyc_approved, active, suspended
- [x] Sort by: name, orders, rating, earnings
- [x] View KYC documents (Aadhaar, vehicle, bank) — same as shop KYC viewer
- [x] Approve / reject KYC (same flow as shops)
- [x] Suspend / reinstate partner
- [x] View earnings history
- [x] Action: view earnings, suspend, reinstate
- [x] 30+ tests for filters, approvals, actions

**Implementation Details:**

Similar to ShopManagementPage, but for delivery partners.

**Backend API Contract:**
```
GET /admin/delivery-partners?status=all&sort=created_at&order=desc
Response: {
  success: true,
  data: {
    partners: [
      {
        id: UUID,
        name: string,
        phone: string,
        kyc_status: "pending" | "approved" | "rejected",
        completed_orders: number,
        rating: number (0-5),
        total_earnings_paise: number,
        status: "active" | "suspended",
        created_at: ISO8601
      }
    ]
  }
}

PATCH /admin/delivery-partners/:id/kyc/approve
Body: { admin_notes?: string }

PATCH /admin/delivery-partners/:id/suspend
Body: { reason: string }

PATCH /admin/delivery-partners/:id/reinstate
```

**Tests:**
- [x] Fetch all delivery partners
- [x] Filter by KYC status, active/suspended
- [x] Sort by name, orders, rating
- [x] View KYC documents
- [x] Approve KYC
- [x] Reject KYC with reason
- [x] Suspend partner
- [x] Reinstate partner

---

### **Task 14.11: Content moderation (reviews + products)** _(~3 hours)_

**Acceptance Criteria:**
- [x] ContentModerationPage.tsx — flag and remove reviews/products
- [x] GET /admin/moderation/queue — fetch flagged content
- [x] Two tabs: Reviews | Products
- [x] Show: Content | Reason flagged | Who flagged | Actions
- [x] Action: View Full Content | Approve | Remove
- [x] Remove → soft-delete via `deleted_at` column
- [x] Notify shop/customer when content removed
- [x] Search and filter by date, status (open, resolved, spam)
- [x] 25+ tests for moderation flows

**Implementation Details:**

```tsx
// src/pages/ContentModerationPage.tsx
export function ContentModerationPage() {
  const [tab, setTab] = useState('reviews');
  const [filter, setFilter] = useState('open');

  const { data } = useQuery(
    ['moderation', tab, filter],
    () => getModerationQueue({ type: tab, status: filter }),
    { refetchInterval: 30000 }
  );

  const handleRemove = async (item) => {
    if (tab === 'reviews') {
      await removeReview(item.id);
    } else {
      await removeProduct(item.id);
    }
    showToast('Content removed. Creator notified.', 'success');
  };

  const handleApprove = async (item) => {
    await approveModerationItem(item.id);
    showToast('Approved. Item restored.', 'success');
  };

  return (
    <div className="space-y-4">
      <div className="tabs">
        <a
          className={`tab ${tab === 'reviews' ? 'tab-active' : ''}`}
          onClick={() => setTab('reviews')}
        >
          Reviews
        </a>
        <a
          className={`tab ${tab === 'products' ? 'tab-active' : ''}`}
          onClick={() => setTab('products')}
        >
          Products
        </a>
      </div>

      <select value={filter} onChange={(e) => setFilter(e.target.value)}>
        <option value="open">Open</option>
        <option value="approved">Approved</option>
        <option value="removed">Removed</option>
      </select>

      <table className="w-full">
        <thead>
          <tr>
            <th>Content</th>
            <th>Creator</th>
            <th>Reason</th>
            <th>Flagged</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data?.items.map(item => (
            <tr key={item.id}>
              <td className="max-w-xs truncate">{item.content_preview}</td>
              <td>{item.creator_phone}</td>
              <td>{item.flag_reason}</td>
              <td>{formatDate(item.flagged_at)}</td>
              <td className="space-x-2">
                <button onClick={() => handleRemove(item)} className="btn btn-sm btn-error">
                  Remove
                </button>
                <button onClick={() => handleApprove(item)} className="btn btn-sm btn-success">
                  Approve
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Backend API Contract:**
```
GET /admin/moderation/queue?type=reviews&status=open
Response: {
  success: true,
  data: {
    items: [
      {
        id: UUID,
        type: "review" | "product",
        content_preview: string,
        creator_phone: string,
        flag_reason: string,
        flagged_by_user_count: number,
        flagged_at: ISO8601
      }
    ]
  }
}

POST /admin/moderation/:id/remove
Body: { reason: string }

POST /admin/moderation/:id/approve
```

**Tests:**
- [x] Fetch flagged reviews
- [x] Fetch flagged products
- [x] Filter by status (open, approved, removed)
- [x] Remove review → soft-delete
- [x] Remove product → soft-delete
- [x] Approve removes flag

---

### **Task 14.12: Broadcast tool (FCM + SMS campaigns)** _(~3 hours)_

**Acceptance Criteria:**
- [x] BroadcastToolPage.tsx — send bulk FCM + SMS
- [x] Target audience: Shops | Customers | Delivery Partners
- [x] Message compose: title, body, deep-link (optional)
- [x] Schedule: Now | Later (date/time picker)
- [x] Preview: Show how it looks in notification
- [x] POST /admin/broadcast — send campaign
- [x] Rate limiting: max 1 broadcast per hour per role
- [x] Track delivery status: pending, sent, failed
- [x] 20+ tests for composition, preview, send

**Implementation Details:**

```tsx
// src/pages/BroadcastToolPage.tsx
export function BroadcastToolPage() {
  const [target, setTarget] = useState('customers');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [deepLink, setDeepLink] = useState('');
  const [scheduleType, setScheduleType] = useState('now');
  const [scheduledTime, setScheduledTime] = useState('');
  const [preview, setPreview] = useState(false);

  const handleSendBroadcast = async () => {
    const broadcast = {
      target_audience: target,
      title,
      body,
      deep_link: deepLink || undefined,
      schedule_type: scheduleType,
      scheduled_at: scheduleType === 'later' ? scheduledTime : undefined
    };

    try {
      await sendBroadcast(broadcast);
      showToast(`Broadcast scheduled for ${target}`, 'success');
      // Reset form
      setTitle('');
      setBody('');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Broadcast Campaign</h1>

      <div className="space-y-4 border rounded-lg p-6">
        {/* Target Audience */}
        <div>
          <label className="block text-sm font-bold mb-2">Target Audience</label>
          <div className="flex gap-4">
            {['customers', 'shops', 'delivery'].map(aud => (
              <label key={aud} className="flex gap-2">
                <input
                  type="radio"
                  value={aud}
                  checked={target === aud}
                  onChange={(e) => setTarget(e.target.value)}
                />
                {aud.charAt(0).toUpperCase() + aud.slice(1)}
              </label>
            ))}
          </div>
        </div>

        {/* Message */}
        <div>
          <label className="block text-sm font-bold mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Notification title"
            className="w-full px-3 py-2 border rounded"
            maxLength={50}
          />
          <p className="text-xs text-gray-500">{title.length}/50</p>
        </div>

        <div>
          <label className="block text-sm font-bold mb-1">Body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Notification message"
            className="w-full px-3 py-2 border rounded"
            rows={3}
            maxLength={240}
          />
          <p className="text-xs text-gray-500">{body.length}/240</p>
        </div>

        <div>
          <label className="block text-sm font-bold mb-1">Deep Link (optional)</label>
          <input
            type="text"
            value={deepLink}
            onChange={(e) => setDeepLink(e.target.value)}
            placeholder="/orders or /settings"
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        {/* Schedule */}
        <div>
          <label className="block text-sm font-bold mb-2">Schedule</label>
          <div className="flex gap-2 mb-2">
            <label className="flex gap-2">
              <input
                type="radio"
                value="now"
                checked={scheduleType === 'now'}
                onChange={(e) => setScheduleType(e.target.value)}
              />
              Send Now
            </label>
            <label className="flex gap-2">
              <input
                type="radio"
                value="later"
                checked={scheduleType === 'later'}
                onChange={(e) => setScheduleType(e.target.value)}
              />
              Schedule for Later
            </label>
          </div>
          {scheduleType === 'later' && (
            <input
              type="datetime-local"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          )}
        </div>

        {/* Preview */}
        <button
          onClick={() => setPreview(!preview)}
          className="btn btn-outline btn-sm"
        >
          {preview ? 'Hide Preview' : 'Show Preview'}
        </button>

        {preview && (
          <div className="bg-gray-100 p-4 rounded-lg border-l-4 border-blue-500">
            <div className="text-sm font-bold">{title}</div>
            <div className="text-sm mt-1">{body}</div>
          </div>
        )}

        {/* Send Button */}
        <button
          onClick={handleSendBroadcast}
          disabled={!title || !body}
          className="w-full btn btn-primary"
        >
          {scheduleType === 'now' ? 'Send Now' : 'Schedule'}
        </button>
      </div>
    </div>
  );
}
```

**Backend API Contract:**
```
POST /admin/broadcast
Body: {
  target_audience: "customers" | "shops" | "delivery",
  title: string (max 50 chars),
  body: string (max 240 chars),
  deep_link?: string,
  schedule_type: "now" | "later",
  scheduled_at?: ISO8601
}
Response: {
  success: true,
  data: {
    campaign_id: UUID,
    target_audience: string,
    estimated_recipients: number,
    scheduled_for: ISO8601
  }
}
```

**Tests:**
- [x] Compose broadcast (title, body, link)
- [x] Validate max lengths (title 50, body 240)
- [x] Preview notification
- [x] Schedule now
- [x] Schedule later with date/time picker
- [x] Send broadcast → POST
- [x] Success toast with recipient count
- [x] Error handling (rate limit, etc.)

---

## Testing Requirements

### Unit Tests (Jest + React Testing Library)
- [ ] Each component: props, state changes, user interactions
- [ ] Services: API mocks, error handling, retry logic
- [ ] Hooks: state, side effects, cleanup
- [ ] Utils: formatting, validation, calculations

### Integration Tests
- [ ] Login → redirect to KYC review
- [ ] KYC approve → table updates, SMS/FCM sent
- [ ] Shop suspend → table updates, SMS/FCM sent
- [ ] Order escalation → alert notification
- [ ] Dispute refund → Cashfree called, customer notified
- [ ] Broadcast send → task queued, recipients notified

### E2E Tests (optional, Playwright)
- [ ] Admin login flow
- [ ] KYC approval workflow
- [ ] Order monitoring with stuck detection
- [ ] Dispute resolution with refund

**Coverage Target:** 80%+ of functions, branches, lines

---

## Security Requirements

### Authentication & Authorization
- [x] Admin OTP login (same as user login, JWT in localStorage)
- [x] Protected routes require JWT + admin role
- [x] Auto-logout on 401 (token expired)
- [x] JWT refresh on 401 (if available)
- [x] No hardcoded credentials in code

### Data Protection
- [x] HTTPS in production only
- [x] KYC documents via R2 signed URLs (5-min TTL)
- [x] No PII in console logs
- [x] No sensitive data in localStorage (except JWT)
- [x] CORS configured for api.nearby.app only

### Input Validation
- [x] Phone format (10 digits)
- [x] OTP format (6 digits)
- [x] Broadcast message length limits
- [x] Search inputs sanitized
- [x] Date range validation

### Rate Limiting
- [ ] Broadcast: max 1 per hour per admin
- [ ] KYC approval: no per-IP limit (backend will enforce)
- [ ] API calls: standard 100 req/min per token

### Logging
- [x] Log admin actions (approve KYC, suspend shop, etc.)
- [x] Log failed approvals (reason)
- [x] Log broadcast sends (recipients count)
- [ ] No PII in logs (use phone hash for tracing)

---

## Deployment Checklist

Before merging to main:
- [ ] All 12 tasks completed
- [ ] 80%+ test coverage
- [ ] Zero CRITICAL/HIGH security issues
- [ ] Build succeeds: `npm run build`
- [ ] No console errors or warnings
- [ ] TypeScript: 0 errors
- [ ] All API integrations tested with backend
- [ ] Socket.IO connection tested
- [ ] Responsive on desktop, tablet, mobile
- [ ] Loading states smooth (spinners, skeletons)
- [ ] Error states user-friendly
- [ ] Toast notifications display correctly
- [ ] Modals close on Escape key
- [ ] Keyboard navigation works (tabs, arrows)
- [ ] Code reviewed + approved
- [ ] Deployed to staging for QA

---

## Estimated Effort

| Task | Estimate | Notes |
|------|----------|-------|
| 14.1 | 3h | Vite setup, Tailwind, routing |
| 14.2 | 4h | OTP login, JWT, role check, protected routes |
| 14.3 | 5h | TanStack Table, filters, sorting, pagination |
| 14.4 | 3h | R2 viewer, lightbox, download |
| 14.5 | 4h | Approve/reject modals, validation, notifications |
| 14.6 | 5h | Shop table, filters, suspend/reinstate |
| 14.7 | 5h | Order monitor, Socket.IO, stuck detection |
| 14.8 | 4h | Dispute detail, GPS map, refund flow |
| 14.9 | 5h | Analytics, charts, metrics, date range |
| 14.10 | 4h | Partner management (mostly copy of 14.6) |
| 14.11 | 3h | Content moderation, flag/remove |
| 14.12 | 3h | Broadcast compose, schedule, preview |
| Testing | 8h | Unit + integration tests, E2E optional |
| Review | 2h | Code review, refactoring, final checks |
| **Total** | **~58 hours** | **~7-8 days (one dev)** |

**Recommended:** Pair programming on tasks 14.3, 14.7 for data table complexity.

---

## Success Criteria

✅ **Sprint 14 is DONE when:**

1. All 12 tasks merged to main
2. 80%+ test coverage (lines, branches, functions)
3. Zero CRITICAL/HIGH security issues (OWASP Top 10)
4. Zero skipped/xfail tests
5. Build succeeds without warnings
6. Staging deployment successful
7. All acceptance criteria verified
8. Code reviewed by tech lead
9. Documentation updated (API routes, admin flows)

---

## Next Steps

**After Sprint 14:**
- **Sprint 15:** E2E testing + launch prep (stress tests, edge cases, compliance)
- **Sprint 16:** Go-live (activate MSG91 DLT, enable Cashfree production, recruit pilot users)

---

**Created:** April 20, 2026  
**Status:** Ready for implementation  
**Owner:** Frontend engineer ([RN1])  
**Dependencies:** ✅ All backend APIs production-ready (Sprints 1–6)

