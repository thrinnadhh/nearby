# Sprints 13.5–13.7: Admin APIs Implementation Guide

**Status:** 🟢 Ready for Backend Implementation  
**Duration:** 3 weeks (Mon–Fri)  
**Owner:** Backend Engineer ([BE])  
**Dependency:** Unblocked — no external dependencies  
**Deliverable:** 25 admin endpoints + 400+ tests passing

---

## Executive Summary

This is the backend implementation guide for the three admin API sprints that run in **parallel with Sprint 14 (frontend admin dashboard)**. Without these endpoints, the frontend cannot be tested.

### What Gets Built
- **Sprint 13.5:** 12 endpoints for KYC review, shop mgmt, orders, disputes
- **Sprint 13.6:** 11 endpoints for analytics, moderation, delivery partners
- **Sprint 13.7:** 11 endpoints for broadcast, Socket.IO integration, E2E tests

### Total Effort
- **Code:** ~35–40 hours
- **Testing:** ~20–25 hours (140+ unit + integration + E2E tests)
- **Total:** ~60 hours (~8 days for single backend engineer)

---

## Sprint 13.5: Core Admin APIs (KYC, Shops, Orders, Disputes)

### Context
All 12 tasks belong in `backend/src/routes/admin.js`. This file currently only has the router skeleton and is empty.

### Task 13.5.1: GET /admin/kyc/queue

**Endpoint:** `GET /api/v1/admin/kyc/queue?page=1&limit=20&status=pending&sort=submitted_at`

**Description:** List all pending KYC submissions for review.

**Request:**
```javascript
// URL params (optional)
page=1          // default 1
limit=20        // default 20
status=pending  // 'pending' | 'approved' | 'rejected'
sort=submitted_at // 'submitted_at' | 'updated_at' | 'shop_name'
```

**Response (Success):**
```javascript
{
  success: true,
  data: {
    kyc_queue: [
      {
        id: 'uuid',
        shop_id: 'uuid',
        shop_name: 'Kirana Store',
        owner_id: 'uuid',
        owner_name: 'Raj Kumar',
        owner_phone: '+919876543210',
        status: 'pending',  // pending | approved | rejected
        submitted_at: '2026-04-20T10:30:00Z',
        updated_at: '2026-04-20T10:30:00Z',
        documents: {
          aadhaar: 'https://r2-url/...',
          gst: 'https://r2-url/...',
          shop_photo: 'https://r2-url/...'
        },
        rejection_reason: null // only if rejected
      }
    ],
    meta: {
      page: 1,
      total: 47,
      pages: 3,
      limit: 20
    }
  }
}
```

**Error Response:**
```javascript
{ success: false, error: { code: 'UNAUTHORIZED', message: 'Admin role required' } }
```

**Acceptance Criteria:**
- ✅ Returns paginated list of KYC submissions
- ✅ Filters by status (pending, approved, rejected)
- ✅ Sorts by submitted_at or updated_at
- ✅ Requires JWT + role=admin
- ✅ Returns metadata (page, total, pages)

**Implementation Notes:**
- Use Supabase RLS: only admin can query kyc_submissions
- Default sort: `submitted_at DESC` (newest first)
- Include shop name + owner info for quick review
- 20+ tests (happy path, pagination, filters, auth)

**File:** `backend/src/routes/admin.js`

**Tests:**
- Test GET with no params (default pagination)
- Test filtering by status
- Test sorting by date
- Test auth (no token, invalid token, non-admin role)
- Test pagination (page 2, 3, invalid page)

---

### Task 13.5.2: PATCH /admin/kyc/:id/approve

**Endpoint:** `PATCH /api/v1/admin/kyc/:id/approve`

**Description:** Approve a KYC submission.

**Request:**
```javascript
{
  notes: 'Documents verified. Shop approved for operation.'  // optional
}
```

**Response (Success):**
```javascript
{
  success: true,
  data: {
    kyc_id: 'uuid',
    shop_id: 'uuid',
    status: 'approved',
    approved_at: '2026-04-20T12:00:00Z',
    admin_id: 'uuid'
  }
}
```

**Side Effects:**
- Updates `kyc_submissions.status = 'approved'`
- Updates `kyc_submissions.approved_at = now()`
- Updates `kyc_submissions.approved_by_admin = admin_id`
- Sends SMS via MSG91: "Congratulations! Your KYC has been approved. Start accepting orders."
- Sends FCM: title="KYC Approved", body="Your shop is now active"

**Acceptance Criteria:**
- ✅ Approves KYC submission
- ✅ Updates shop KYC status
- ✅ Sends SMS notification (MSG91)
- ✅ Sends FCM notification
- ✅ Requires admin role
- ✅ Validates :id is valid UUID

**Implementation Notes:**
- Atomic transaction: update KYC + update shop + trigger notifications
- Notes field is optional (for documentation)
- 15+ tests (happy path, invalid ID, non-admin, DB transaction rollback)

**Tests:**
- Test approve with notes
- Test approve without notes
- Test auth validation
- Test invalid KYC ID
- Test SMS + FCM are triggered
- Test idempotency (approving twice)

---

### Task 13.5.3: PATCH /admin/kyc/:id/reject

**Endpoint:** `PATCH /api/v1/admin/kyc/:id/reject`

**Description:** Reject a KYC submission with a reason.

**Request:**
```javascript
{
  reason: 'Aadhaar document is unclear. Please resubmit a clear copy.'  // required, min 10 chars
}
```

**Response (Success):**
```javascript
{
  success: true,
  data: {
    kyc_id: 'uuid',
    shop_id: 'uuid',
    status: 'rejected',
    rejected_at: '2026-04-20T12:00:00Z',
    reason: 'Aadhaar document is unclear...'
  }
}
```

**Side Effects:**
- Updates `kyc_submissions.status = 'rejected'`
- Updates `kyc_submissions.rejected_at = now()`
- Updates `kyc_submissions.rejected_reason = reason`
- Sends SMS: "Your KYC submission has been rejected. Reason: [reason]"
- Sends FCM: title="KYC Rejected", body=reason

**Acceptance Criteria:**
- ✅ Rejects KYC with reason
- ✅ Reason is required and min 10 chars
- ✅ Sends SMS + FCM with reason
- ✅ Requires admin role
- ✅ Validates reason length

**Implementation Notes:**
- Reason validation: min 10 chars, max 500 chars
- 15+ tests (happy path, short reason, auth, invalid ID, notifications)

**Tests:**
- Test reject with valid reason
- Test reject with short reason (fails)
- Test reject with empty reason (fails)
- Test SMS includes reason
- Test auth validation
- Test invalid KYC ID

---

### Task 13.5.4: GET /admin/shops (list all shops)

**Endpoint:** `GET /api/v1/admin/shops?page=1&limit=20&search=kirana&kyc_status=approved&sort=name`

**Description:** List all shops with KYC status, trust score, and open/closed status.

**Request:**
```javascript
page=1              // default 1
limit=20            // default 20
search=kirana       // search by shop name or owner phone
kyc_status=approved // 'pending' | 'approved' | 'rejected'
is_open=true        // 'true' | 'false' | (empty = all)
sort=name           // 'name' | 'trust_score' | 'created_at'
```

**Response (Success):**
```javascript
{
  success: true,
  data: {
    shops: [
      {
        id: 'uuid',
        name: 'Kirana Store',
        owner_phone: '+919876543210',
        owner_name: 'Raj Kumar',
        kyc_status: 'approved',  // pending | approved | rejected
        is_open: true,
        trust_score: 78.5,
        created_at: '2026-04-01T10:00:00Z',
        suspended_at: null,  // only if suspended
        suspension_reason: null
      }
    ],
    meta: {
      page: 1,
      total: 234,
      pages: 12,
      limit: 20
    }
  }
}
```

**Acceptance Criteria:**
- ✅ Returns paginated list of all shops
- ✅ Filters by KYC status, open/closed
- ✅ Search by shop name or owner phone (case-insensitive)
- ✅ Sorts by name, trust_score, or created_at
- ✅ Requires admin role
- ✅ Includes suspension info if applicable

**Implementation Notes:**
- Search: `shop.name ILIKE '%search%' OR profiles.phone LIKE '%search%'`
- Default sort: `name ASC`
- 20+ tests

**Tests:**
- Test pagination
- Test search by name
- Test search by phone
- Test filter by kyc_status
- Test filter by is_open
- Test sorting options
- Test auth

---

### Task 13.5.5: PATCH /admin/shops/:id/suspend

**Endpoint:** `PATCH /api/v1/admin/shops/:id/suspend`

**Description:** Suspend a shop (prevent new orders).

**Request:**
```javascript
{
  reason: 'Unsanitary conditions reported. Investigation ongoing.'  // required
}
```

**Response (Success):**
```javascript
{
  success: true,
  data: {
    shop_id: 'uuid',
    status: 'suspended',
    suspended_at: '2026-04-20T12:00:00Z',
    reason: 'Unsanitary conditions...'
  }
}
```

**Side Effects:**
- Updates `shops.is_open = false`
- Updates `shops.suspended_at = now()`
- Updates `shops.suspension_reason = reason`
- Sends FCM: "Your shop has been suspended. Reason: [reason]"

**Acceptance Criteria:**
- ✅ Suspends shop (sets is_open=false)
- ✅ Records reason
- ✅ Sends FCM notification
- ✅ Requires admin role
- ✅ Validates :id is valid UUID

**Implementation Notes:**
- 12+ tests

**Tests:**
- Test suspend with reason
- Test shop becomes unavailable in search
- Test FCM notification sent
- Test auth validation
- Test idempotency (suspending twice)

---

### Task 13.5.6: PATCH /admin/shops/:id/reinstate

**Endpoint:** `PATCH /api/v1/admin/shops/:id/reinstate`

**Description:** Reinstate a suspended shop.

**Request:**
```javascript
{
  // no request body needed
}
```

**Response (Success):**
```javascript
{
  success: true,
  data: {
    shop_id: 'uuid',
    status: 'active',
    is_open: true,
    reinstated_at: '2026-04-20T14:00:00Z'
  }
}
```

**Side Effects:**
- Updates `shops.is_open = true`
- Clears `shops.suspended_at`
- Clears `shops.suspension_reason`
- Sends FCM: "Your shop has been reinstated. You can now accept orders."

**Acceptance Criteria:**
- ✅ Reinstates shop (sets is_open=true, clears suspension info)
- ✅ Sends FCM notification
- ✅ Requires admin role

**Implementation Notes:**
- 10+ tests

---

### Task 13.5.7: GET /admin/orders/live (real-time order monitor)

**Endpoint:** `GET /api/v1/admin/orders/live?status=pending&limit=50`

**Description:** Get live orders for real-time monitoring. Data updates via Socket.IO.

**Request:**
```javascript
status=pending  // 'pending' | 'accepted' | 'packing' | 'ready' | 'assigned' | 'out_for_delivery' | '' (all)
limit=50        // max 100
```

**Response (Success):**
```javascript
{
  success: true,
  data: {
    orders: [
      {
        id: 'uuid',
        customer_id: 'uuid',
        customer_name: 'Amit',
        customer_phone: '+919876543210',
        shop_id: 'uuid',
        shop_name: 'Kirana Store',
        status: 'pending',
        total: 45000,  // in paise
        created_at: '2026-04-20T10:30:00Z',
        updated_at: '2026-04-20T10:30:00Z',
        pending_since: 180,  // seconds (how long in pending)
        is_stuck: false,  // true if pending >3min or accepted >10min
        delivery_partner_id: null  // if assigned
      }
    ]
  }
}
```

**Acceptance Criteria:**
- ✅ Returns live orders (recently updated)
- ✅ Filters by status
- ✅ Includes pending_since (seconds)
- ✅ Flags stuck orders (is_stuck = true)
- ✅ Requires admin role
- ✅ Real-time updates via Socket.IO (see task 13.7.3)

**Implementation Notes:**
- "Live" = updated in last 5 minutes
- `pending_since = (now() - updated_at) in seconds`
- `is_stuck = (status='pending' AND pending_since>180) OR (status='accepted' AND pending_since>600)`
- 15+ tests

---

### Task 13.5.8: POST /admin/orders/:id/escalate

**Endpoint:** `POST /api/v1/admin/orders/:id/escalate`

**Description:** Escalate a stuck order for immediate action.

**Request:**
```javascript
{
  reason: 'Shop not responding to customer'  // optional
}
```

**Response (Success):**
```javascript
{
  success: true,
  data: {
    order_id: 'uuid',
    escalated_at: '2026-04-20T12:05:00Z',
    status: 'escalated'
  }
}
```

**Side Effects:**
- Sends FCM to shop: "Your order [ID] has been escalated. Please respond immediately."
- Sends FCM to delivery partner (if assigned): "Escalation alert for order [ID]"
- Logs escalation to orders.escalations array

**Acceptance Criteria:**
- ✅ Escalates order
- ✅ Sends FCM alerts to shop + delivery
- ✅ Requires admin role
- ✅ Validates order exists

**Implementation Notes:**
- 10+ tests

---

### Task 13.5.9: GET /admin/disputes (list disputes)

**Endpoint:** `GET /api/v1/admin/disputes?page=1&status=open&sort=created_at`

**Description:** List all customer disputes.

**Request:**
```javascript
page=1              // default 1
limit=20            // default 20
status=open         // 'open' | 'resolved' | 'escalated'
sort=created_at     // 'created_at' | 'updated_at'
```

**Response (Success):**
```javascript
{
  success: true,
  data: {
    disputes: [
      {
        id: 'uuid',
        order_id: 'uuid',
        customer_id: 'uuid',
        customer_name: 'Amit',
        reason: 'Order not delivered',  // short reason
        status: 'open',
        created_at: '2026-04-20T14:30:00Z',
        updated_at: '2026-04-20T14:30:00Z'
      }
    ],
    meta: {
      page: 1,
      total: 12,
      pages: 1,
      limit: 20
    }
  }
}
```

**Acceptance Criteria:**
- ✅ Returns paginated list of disputes
- ✅ Filters by status
- ✅ Sorts by created_at or updated_at
- ✅ Requires admin role

**Implementation Notes:**
- 15+ tests

---

### Task 13.5.10: GET /admin/disputes/:id (detail)

**Endpoint:** `GET /api/v1/admin/disputes/:id`

**Description:** Get full dispute details including GPS trail and refund status.

**Response (Success):**
```javascript
{
  success: true,
  data: {
    id: 'uuid',
    order_id: 'uuid',
    customer_id: 'uuid',
    customer_name: 'Amit',
    customer_phone: '+919876543210',
    shop_id: 'uuid',
    shop_name: 'Karina Store',
    delivery_partner_id: 'uuid',  // null if not assigned
    delivery_partner_name: 'Ravi',
    reason: 'Delivery partner never arrived',
    status: 'open',
    created_at: '2026-04-20T14:30:00Z',
    order_timeline: [
      { status: 'pending', created_at: '2026-04-20T10:30:00Z' },
      { status: 'accepted', created_at: '2026-04-20T10:35:00Z' },
      { status: 'assigned', created_at: '2026-04-20T10:40:00Z' },
      { status: 'out_for_delivery', created_at: '2026-04-20T11:00:00Z' }
      // ends here, never reached delivered
    ],
    gps_trail: [
      { lat: 13.0826, lng: 80.2707, timestamp: '2026-04-20T11:05:00Z' },
      { lat: 13.0827, lng: 80.2708, timestamp: '2026-04-20T11:10:00Z' },
      { lat: 13.0828, lng: 80.2709, timestamp: '2026-04-20T11:15:00Z' }
      // trail showing delivery partner movement
    ],
    refund_status: 'pending',  // pending | approved | failed
    refund_amount: 45000,  // in paise, original order total
    refund_approved_at: null
  }
}
```

**Acceptance Criteria:**
- ✅ Returns full dispute with order timeline
- ✅ Includes GPS trail (lat, lng, timestamp)
- ✅ Shows refund status
- ✅ Requires admin role

**Implementation Notes:**
- GPS trail is stored in Redis during delivery, moved to disputes on resolution
- Order timeline pulled from orders.timeline_events
- 10+ tests

---

### Task 13.5.11: PATCH /admin/disputes/:id/resolve

**Endpoint:** `PATCH /api/v1/admin/disputes/:id/resolve`

**Description:** Resolve a dispute by approving or denying a refund.

**Request:**
```javascript
{
  decision: 'approve',  // 'approve' | 'deny'
  refund_amount: 45000,  // in paise (can be less than original for partial)
  notes: 'Customer confirmed receipt. Refunding full amount.'  // optional
}
```

**Response (Success):**
```javascript
{
  success: true,
  data: {
    dispute_id: 'uuid',
    status: 'resolved',
    decision: 'approve',
    refund_amount: 45000,
    refund_status: 'processed',
    refund_txn_id: 'cf_refund_uuid',  // Cashfree refund ID
    resolved_at: '2026-04-20T15:00:00Z'
  }
}
```

**Side Effects (if approved):**
- Calls Cashfree refund API: `POST /refunds`
- Updates `disputes.status = 'resolved'`
- Updates `disputes.refund_status = 'processed'`
- Soft-deletes dispute (disputes.deleted_at = now())
- Sends SMS to customer: "Refund of ₹450 has been initiated. It will reach your account in 24-48 hours."
- Sends FCM to customer

**Acceptance Criteria:**
- ✅ Approves or denies refund
- ✅ Calls Cashfree refund API
- ✅ Validates refund_amount <= order_total
- ✅ Sends SMS + FCM to customer
- ✅ Requires admin role
- ✅ Idempotent (approving twice returns same refund_txn_id)

**Implementation Notes:**
- Refund validation: refund_amount must be ≤ original order total
- Call Cashfree with idempotency key to prevent duplicate refunds
- 15+ tests (approve, deny, partial refund, Cashfree API, idempotency)

---

### Task 13.5.12: Set up Socket.IO admin room

**Endpoint:** Socket.IO event handlers

**Description:** Broadcast order updates and stuck alerts to admin room.

**Implementation Notes:**
- See Sprint 13.7 for detailed event handlers
- 12+ tests

---

### Sprint 13.5 Testing Checklist

```
Unit Tests:
  ✅ GET /admin/kyc/queue (20+ tests)
  ✅ PATCH /admin/kyc/:id/approve (15+ tests)
  ✅ PATCH /admin/kyc/:id/reject (15+ tests)
  ✅ GET /admin/shops (20+ tests)
  ✅ PATCH /admin/shops/:id/suspend (12+ tests)
  ✅ PATCH /admin/shops/:id/reinstate (10+ tests)
  ✅ GET /admin/orders/live (15+ tests)
  ✅ POST /admin/orders/:id/escalate (10+ tests)
  ✅ GET /admin/disputes (15+ tests)
  ✅ GET /admin/disputes/:id (10+ tests)
  ✅ PATCH /admin/disputes/:id/resolve (15+ tests)
  ✅ Socket.IO setup (12+ tests)

Total: 140+ tests
Target coverage: 80%+
```

---

## Sprint 13.6: Analytics, Moderation, Delivery Partners

### Task 13.6.1: GET /admin/analytics (summary metrics)

**Endpoint:** `GET /api/v1/admin/analytics`

**Response:**
```javascript
{
  success: true,
  data: {
    gmv_total: 1234567,  // in paise (total platform GMV)
    gmv_today: 456789,   // today's GMV
    orders_total: 1234,  // cumulative orders
    orders_today: 45,    // today
    customers_total: 567, // unique customers
    shops_active: 89,    // shops with is_open=true
    currency: 'INR'
  }
}
```

**Acceptance Criteria:**
- ✅ Returns platform-wide metrics
- ✅ Includes today's snapshot
- ✅ Requires admin role
- ✅ Daily aggregation (calculated nightly via BullMQ job)

**Implementation Notes:**
- GMV = sum of order totals (delivered orders only)
- Metrics aggregated nightly at 2 AM IST
- Cache results in Redis (15-min TTL)
- 12+ tests

---

### Task 13.6.2: GET /admin/analytics/daily (by date)

**Endpoint:** `GET /api/v1/admin/analytics/daily?range=7d`

**Response:**
```javascript
{
  success: true,
  data: {
    daily: [
      {
        date: '2026-04-20',
        revenue: 456789,  // in paise
        orders_count: 45,
        customers_count: 32,
        by_city: [
          { city: 'Hyderabad', revenue: 345000, orders: 34 },
          { city: 'Secunderabad', revenue: 111789, orders: 11 }
        ]
      },
      // ... 6 more days
    ]
  }
}
```

**Request Params:**
```
range=7d   // '7d' | '30d' | '90d'
```

**Acceptance Criteria:**
- ✅ Returns daily revenue + orders + customer count
- ✅ Breaks down by city
- ✅ Supports multiple date ranges (7d, 30d, 90d)
- ✅ Recharts-compatible (for frontend charts)
- ✅ Requires admin role

**Implementation Notes:**
- 15+ tests

---

### Task 13.6.3: GET /admin/analytics/top-shops

**Endpoint:** `GET /api/v1/admin/analytics/top-shops?limit=10`

**Response:**
```javascript
{
  success: true,
  data: {
    top_shops: [
      {
        shop_id: 'uuid',
        shop_name: 'Kirana Store',
        revenue: 234567,  // in paise (last 30 days)
        orders_count: 78,
        avg_rating: 4.7,
        commission_paid: 3519  // in paise (1.5% of revenue)
      },
      // ... top 10
    ]
  }
}
```

**Acceptance Criteria:**
- ✅ Returns top shops by revenue
- ✅ Includes orders count and rating
- ✅ Requires admin role

**Implementation Notes:**
- 10+ tests

---

### Task 13.6.4–13.6.7: Delivery Partner Management

**Endpoints:**
- `GET /api/v1/admin/delivery-partners` (list)
- `PATCH /api/v1/admin/delivery-partners/:id/suspend`
- `PATCH /api//admin/delivery-partners/:id/reinstate`
- `GET /api/v1/admin/delivery-partners/:id/earnings`

**Implementation Notes:**
- Same structure as shop management (list, suspend, reinstate)
- Earnings endpoint returns per-delivery breakdown
- 40+ tests total

---

### Task 13.6.8–13.6.10: Content Moderation

**Endpoints:**
- `GET /api/v1/admin/moderation/queue?type=reviews`
- `POST /api/v1/admin/moderation/:id/approve`
- `POST /api/v1/admin/moderation/:id/remove`

**Implementation Notes:**
- Flags come from user reports (customer flagged a review)
- Soft-delete on remove (review.deleted_at = now())
- Notify creator on removal
- 30+ tests total

---

## Sprint 13.7: Broadcast, Socket.IO, Integration Tests

### Task 13.7.1: POST /admin/broadcast

**Endpoint:** `POST /api/v1/admin/broadcast`

**Request:**
```javascript
{
  title: 'Flash Sale Alert',  // max 50 chars
  body: 'Get 20% off on vegetables today!',  // max 240 chars
  deep_link: 'nearby://home/search?category=vegetables',  // optional
  target: 'customers',  // 'customers' | 'shops' | 'delivery'
  scheduled_at: null  // null = now, or ISO timestamp for future
}
```

**Response:**
```javascript
{
  success: true,
  data: {
    broadcast_id: 'uuid',
    target: 'customers',
    scheduled_at: '2026-04-20T15:00:00Z',
    estimated_recipients: 5234,
    status: 'queued'  // 'queued' | 'sent' | 'failed'
  }
}
```

**Side Effects:**
- Rate limiting: max 1 broadcast per hour per admin (Redis)
- Creates BullMQ broadcast job (see 13.7.5)
- Stores broadcast record in broadcasts table

**Acceptance Criteria:**
- ✅ Creates broadcast campaign
- ✅ Enforces rate limiting (1/hour)
- ✅ Validates field lengths (title, body, link)
- ✅ Schedules for future if scheduled_at provided
- ✅ Requires admin role
- ✅ Returns estimated recipient count

**Implementation Notes:**
- Rate limit check: Redis INCR with 1-hour expiry
- 15+ tests (happy path, rate limit, validation, scheduling)

---

### Task 13.7.2: GET /admin/broadcast/history

**Endpoint:** `GET /api/v1/admin/broadcast/history?page=1&limit=20`

**Response:**
```javascript
{
  success: true,
  data: {
    broadcasts: [
      {
        id: 'uuid',
        title: 'Flash Sale',
        target: 'customers',
        sent_count: 5234,
        failed_count: 45,
        created_at: '2026-04-20T15:00:00Z',
        scheduled_at: '2026-04-20T15:00:00Z',
        status: 'sent'  // 'queued' | 'sent' | 'failed'
      }
    ],
    meta: { page: 1, total: 23, pages: 2 }
  }
}
```

**Acceptance Criteria:**
- ✅ Returns paginated broadcast history
- ✅ Includes delivery metrics
- ✅ Requires admin role

**Implementation Notes:**
- 10+ tests

---

### Task 13.7.3: Socket.IO order:updated event

**Endpoint:** Socket.IO event handler

**Event:** `order:updated`

**Emission:** Triggered on any order status change

**Payload:**
```javascript
{
  type: 'order:updated',
  data: {
    order_id: 'uuid',
    status: 'packing',  // new status
    updated_at: '2026-04-20T12:30:00Z',
    eta: '12:45',  // estimated time (if assigned)
    eta_seconds: 900  // in seconds from now
  }
}
```

**Room:** `order:{orderId}` (customer, shop, delivery partner all in this room)  
**Admin Room:** `admin` (all admins in this room)

**Acceptance Criteria:**
- ✅ Broadcasts on status change
- ✅ Includes ETA if applicable
- ✅ Broadcasts to order room + admin room
- ✅ Payload includes updated_at

**Implementation Notes:**
- Hook into PATCH /orders endpoints to emit event
- 12+ tests (status change triggers event, multiple listeners receive)

---

### Task 13.7.4: Socket.IO order:stuck-alert event

**Endpoint:** Socket.IO event handler

**Emission:** Triggered by BullMQ stuck-detection job

**Payload:**
```javascript
{
  type: 'order:stuck-alert',
  data: {
    order_id: 'uuid',
    shop_id: 'uuid',
    customer_id: 'uuid',
    status: 'pending',  // current status
    stuck_minutes: 3,  // pending for 3 mins
    customer_phone: '+919876543210'
  }
}
```

**Room:** `admin` (all admins)

**Acceptance Criteria:**
- ✅ Broadcasts to admin room
- ✅ Triggered when pending >3min or accepted >10min
- ✅ Includes order details

**Implementation Notes:**
- See BullMQ stuck-detection job (task 13.7.5)
- 10+ tests

---

### Task 13.7.5: BullMQ broadcast job

**Job Name:** `broadcast-campaign`

**Trigger:** POST /admin/broadcast

**Processing:**
1. Fetch target audience (customers | shops | delivery partners)
2. Get FCM tokens for each person
3. Send FCM via Firebase
4. Send SMS via MSG91 (fallback or parallel)
5. Track delivery (sent_count, failed_count)

**Acceptance Criteria:**
- ✅ Sends FCM to all targets
- ✅ Falls back to SMS if FCM fails
- ✅ Tracks delivery metrics
- ✅ Retries failed sends (3 attempts)
- ✅ Honors rate limiting

**Implementation Notes:**
- 15+ tests (FCM send, SMS fallback, retries, tracking)

---

### Task 13.7.6–13.7.8: Integration Tests

**Test Cases:**
1. KYC flow: Shop registers → admin approves → shop active
2. Order stuck: Customer orders → pending >3min → admin sees alert → can escalate
3. Dispute + refund: Customer disputes → admin approves → Cashfree refund → customer balance updated

**Acceptance Criteria:**
- ✅ Each is 1 multi-step test
- ✅ Tests real workflows
- ✅ Uses actual backend APIs (no mocks)

**Implementation Notes:**
- 3 tests total (large, complex)

---

### Task 13.7.9–13.7.11: Final Verification

**Checklist:**
- ✅ 400+ tests passing: `npm test`
- ✅ Coverage ≥80%: `npm test -- --coverage`
- ✅ TypeScript strict: `npm run type-check` (0 errors)
- ✅ API docs: Postman collection + OpenAPI spec
- ✅ No console.log statements
- ✅ No hardcoded secrets
- ✅ All endpoints return proper response format

---

## Daily Breakdown (60 hours over 3 weeks)

### Sprint 13.5 Timeline (8 hours/day, 5 days = 40 hours)

**Day 1 (Mon):** Tasks 13.5.1–13.5.2
- Setup: mkdir backend/src/routes/admin.js
- GET /admin/kyc/queue (2h coding + 1h tests)
- PATCH /admin/kyc/:id/approve (2h coding + 1h tests)
- Tests: 25+ passing

**Day 2 (Tue):** Tasks 13.5.3–13.5.4
- PATCH /admin/kyc/:id/reject (2h + 1h tests)
- GET /admin/shops (2h + 1h tests)
- Tests: 35+ passing

**Day 3 (Wed):** Tasks 13.5.5–13.5.6
- PATCH /admin/shops/suspend (1.5h + 0.5h tests)
- PATCH /admin/shops/reinstate (1h + 0.5h tests)
- GET /admin/orders/live (2h + 1h tests)
- Tests: 27+ passing

**Day 4 (Thu):** Tasks 13.5.7–13.5.11
- POST /admin/orders/:id/escalate (1h + 0.5h tests)
- GET/POST /admin/disputes (2h + 1h tests)
- PATCH /admin/disputes/:id/resolve (2h + 1h tests)
- Tests: 40+ passing

**Day 5 (Fri):** Task 13.5.12 + Sprint 13.5 Closing
- Socket.IO admin room setup (1h + 1h tests)
- Review + fix failing tests
- Fix TypeScript errors
- Target: 140+ tests passing (80%+ coverage)

---

### Sprint 13.6 Timeline (8 hours/day, 5 days = 40 hours)

**Day 1 (Mon):** Tasks 13.6.1–13.6.3
- GET /admin/analytics (2h + 1h tests)
- GET /admin/analytics/daily (2h + 1h tests)
- GET /admin/analytics/top-shops (1h + 0.5h tests)

**Day 2 (Tue):** Tasks 13.6.4–13.6.7 (Delivery Partners)
- GET /admin/delivery-partners (2h + 1h tests)
- PATCH suspend/reinstate (2h + 1h tests)
- GET earnings (1h + 0.5h tests)

**Day 3 (Wed):** Tasks 13.6.8–13.6.11 (Moderation + Typesense)
- GET /admin/moderation/queue (1.5h + 1h tests)
- POST approve/remove (2h + 1h tests)
- Typesense schema (1h + 0.5h tests)

**Day 4 (Thu):** Review + Test Coverage
- Ensure all 130+ tests passing
- Fix TypeScript errors
- Validate response formats

**Day 5 (Fri):** Sprint 13.6 Closing
- Target: 130+ tests passing

---

### Sprint 13.7 Timeline (8 hours/day, 5 days = 40 hours)

**Day 1 (Mon):** Tasks 13.7.1–13.7.2
- POST /admin/broadcast (2h + 1h tests)
- GET /admin/broadcast/history (1h + 0.5h tests)
- BullMQ broadcast job setup (1.5h + 1h tests)

**Day 2 (Tue):** Tasks 13.7.3–13.7.4
- Socket.IO order:updated event (1.5h + 1h tests)
- Socket.IO order:stuck-alert event (1.5h + 1h tests)
- Stuck-detection BullMQ job (1.5h + 1h tests)

**Day 3 (Wed):** Tasks 13.7.6–13.7.8 (Integration Tests)
- KYC flow test (1.5h)
- Order stuck → escalate test (1.5h)
- Dispute → refund test (1.5h)
- Tests: 3 large integration tests

**Day 4 (Thu):** Final Verification
- Run full test suite: `npm test` (target: 400+ passing)
- Coverage: `npm test -- --coverage` (target: ≥80%)
- TypeScript: `npm run type-check` (target: 0 errors)
- Fix any remaining issues

**Day 5 (Fri):** Sprint 13.7 Closing
- API documentation (Postman collection, OpenAPI spec)
- Review all code (no console.log, no secrets, proper error handling)
- Prepare for Sprint 14 frontend integration
- Merge admin APIs to main branch

---

## Testing Strategy (140 + 130 + 100 = 370 tests)

### Unit Tests (300 tests)
- Endpoint routing: each endpoint has happy path + error cases
- Input validation: required fields, field lengths, types
- Auth: JWT validation, role checks
- Rate limiting: check Redis increment logic
- Notifications: mock SMS/FCM, verify calls

### Integration Tests (50 tests)
- Database transactions: insert shop → insert KYC → approve → shop active
- External APIs: Cashfree refund, MSG91 SMS, Firebase FCM
- Socket.IO: emit event → listener receives
- BullMQ jobs: triggered → processed → notified

### E2E Tests (20 tests)
- Full KYC flow
- Full order + dispute flow
- Broadcast campaign

---

## Blockers & Unknowns

**None identified.** All 34 tasks are independent, well-scoped, and have all information needed.

---

## Success Criteria

✅ **Sprint 13.5:**
- 12 endpoints implemented
- 140+ tests passing
- All KYC, shop, order, dispute flows tested

✅ **Sprint 13.6:**
- 11 endpoints implemented
- 130+ tests passing
- Analytics, moderation, partner mgmt fully tested

✅ **Sprint 13.7:**
- 11 endpoints + broadcast job implemented
- 100+ tests passing
- Socket.IO events + BullMQ jobs fully tested
- 400+ total tests across all 34 tasks
- ≥80% code coverage
- 0 TypeScript errors
- Zero security vulnerabilities (OWASP audit)
- Admin APIs merge to main, ready for Sprint 14 frontend

---

**Status:** 🟢 **READY FOR IMPLEMENTATION**  
**Next:** Dispatch to nearby-builder agent for code implementation  
**Frontend (Sprint 14):** Can start immediately on Day 1, integrate with real APIs by Day 3

