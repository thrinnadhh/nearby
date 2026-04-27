# NearBy Frontend-Backend Integration Map

## 📱 Frontend Apps Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    NearBy Platform                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │  Customer App    │  │   Shop Owner App │                 │
│  │  (React Native)  │  │  (React Native)  │                 │
│  │  - Browse shops  │  │  - Manage orders │                 │
│  │  - Order & pay   │  │  - Update stock  │                 │
│  │  - Track order   │  │  - View earnings │                 │
│  │  - Review shop   │  │                  │                 │
│  └──────────────────┘  └──────────────────┘                 │
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ Delivery App     │  │ Admin Dashboard  │                 │
│  │ (React Native)   │  │ (React + Vite)   │                 │
│  │ - Accept orders  │  │ - KYC review     │                 │
│  │ - Track GPS      │  │ - Disputes       │                 │
│  │ - Rate customer  │  │ - Analytics      │                 │
│  └──────────────────┘  └──────────────────┘                 │
│                                                               │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP + Socket.IO
                         ↓
        ┌────────────────────────────────┐
        │    Backend (Node + Express)    │
        │   :3000 (DigitalOcean)         │
        ├────────────────────────────────┤
        │ Routes (src/routes/):           │
        │  • auth.js                      │
        │  • shops.js                     │
        │  • products.js                  │
        │  • orders.js                    │
        │  • payments.js                  │
        │  • delivery.js                  │
        │  • reviews.js                   │
        │  • admin.js                     │
        │  • chats.js                     │
        └────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ↓                ↓                ↓
   ┌─────────┐    ┌──────────┐    ┌──────────┐
   │Supabase │    │  Redis   │    │Typesense │
   │(Postgre)│    │ (Geo,    │    │(Search)  │
   │ - Data  │    │  Queue)  │    │ - Index  │
   │ - Auth  │    │          │    │ - Geo    │
   └─────────┘    └──────────┘    └──────────┘
        │
   Cloudflare R2
   (Images, KYC)
```

---

## 🔄 Customer App User Journey

### **Flow 1: Authentication**

```
Customer App                  Backend              Supabase
     │                           │                    │
     │─ POST /auth/request-otp──>│                    │
     │   phone: 9876543210       │                    │
     │                           ├─ Send OTP via MSG91─>
     │<─ { success: true }───────│                    │
     │                           │                    │
     │ [User enters OTP]         │                    │
     │                           │                    │
     │─ POST /auth/verify-otp───>│                    │
     │   phone, otp: 123456      │                    │
     │                           ├─ Check in Redis    │
     │                           │                    │
     │<─ { token: jwt, ... }─────│                    │
     │                           │                    │
     └─ Store JWT in expo-secure-store
```

### **Flow 2: Browse Nearby Shops**

```
Customer App           Backend            Typesense       Supabase
     │                    │                    │              │
     │─ GET /shops?───────>│                    │              │
     │   lat, lng, radius  │                    │              │
     │                     ├─ Query Typesense───>               │
     │                     │  (geo-search)      │              │
     │                     |<─ [ shops, ... ]───┤              │
     │                     │                    │              │
     │                     ├─ Hydrate metadata──────────────>  │
     │                     │   (ratings, etc)   │              │
     │<─ { data: shops }───│                    │              │
     │                     │                    │              │
     └─ Display shop grid with distance + trust badge
```

### **Flow 3: Create Order**

```
Customer App              Backend                Supabase
     │                       │                      │
     │─ POST /orders────────>│                      │
     │ {shop_id,             │                      │
     │  items,               │ ├─ Validate items───>│
     │  address,             │ │                     │
     │  idempotency_key}     │ |<─ Prices (locked)──┤
     │                       │                      │
     │                       ├─ Calculate total    │
     │                       │  (server-side only)  │
     │                       │                      │
     │                       ├─ Lock stock in Redis│
     │                       │                      │
     │                       ├─ Create order───────>│
     │<─ {order_id, status}──│                      │
     │   "pending"           │                      │
     │                       ├─ Queue notif. job──>
     │                       │  (BullMQ notify-shop)
     │                       │                      │
     └─ Show order confirmation screen
```

### **Flow 4: Real-Time Order Tracking**

```
Customer App        Backend (Socket.IO)       Delivery App
     │                      │                       │
     │─ Connect socket──────┤                       │
     │ room: order:{id}     │                       │
     │<─ Connected──────────│                       │
     │                      │                       │
     │                      │<─ status: accepted───┤ [Shop accepts]
     │<─ Event: order.       │                       │
     │   accepted────────────│                       │
     │                      │                       │
     │                      │<─ gps: {lat, lng}───┤ [Partner GPS]
     │<─ Event: delivery.    │                       │
     │   location────────────│                       │
     │   (updates every 5s)  │                       │
     │                      │                       │
     │<─ Event: order.       │                       │
     │   delivered──────────│<─ status: delivered─┤ [Delivered]
     │                      │                       │
     └─ Show delivery completed + review prompt
```

### **Flow 5: Payment (Cashfree)**

```
Customer App          Backend            Cashfree Gateway
     │                   │                      │
     │─ POST /payments/──>│                      │
     │  initiate          │                      │
     │  {order_id}        ├─ Create session─────>│
     │                    │                      │
     │<─ { session_url }──│<─ {session_id}───────┤
     │                    │                      │
     │ [User opens URL    │                      │
     │  in WebView,       │                      │
     │  completes payment]│                      │
     │                    │                      │
     │                    │<─ Webhook: SUCCESS──┤
     │                    │  {payment_id, ...}  │
     │                    │                      │
     │                    ├─ HMAC verification  │
     │                    │  ├─ Update order    │
     │                    │  └─ Notify customer │
     │                    │                      │
     │<─ Payment status───┤
     │  (via callback)    │
     │                    │
     └─ Show payment success
```

---

## 🏪 Shop Owner App User Journey

### **Flow 1: Registration**

```
Shop App                  Backend              Supabase    Cloudflare R2
   │                         │                    │              │
   │─ POST /shops────────────>│                    │              │
   │ {name, phone, location}  │                    │              │
   │                          ├─ Create shop──────>│              │
   │<─ { shop_id }────────────│                    │              │
   │                          │                    │              │
   │─ POST /shops/:id/kyc────>│                    │              │
   │ [aadhaar, pan, etc]      │                    │              │
   │ (FormData multipart)     ├─ Upload to R2─────────────────>  │
   │                          │                    │              │
   │                          ├─ Store KYC status─>│              │
   │<─ { status: pending }────│                    │              │
   │                          │                    │              │
   │ [Admin reviews KYC]      │                    │              │
   │ [Admin approves]         ├─ Update status────>│              │
   │                          │                    │              │
   │ [App polls status]       │                    │              │
   │─ GET /shops/:id─────────>│                    │              │
   │<─ { kyc_status: verified}│                    │              │
   │                          │                    │              │
   └─ Show "Shop approved" + ready to accept orders
```

### **Flow 2: Manage Orders**

```
Shop App            Backend          Supabase      Socket.IO
   │                   │                 │              │
   │─ GET /shops/──────>│                 │              │
   │  :id/orders        │                 │              │
   │                    ├─ Fetch orders──>│              │
   │<─ { orders }───────│                 │              │
   │                    │                 │              │
   │ [Shows order list  │                 │              │
   │  with pending]     │                 │              │
   │                    │                 │              │
   │─ PATCH /orders/───>│                 │              │
   │  :id/accept        ├─ Update status─>│              │
   │                    │                 │              │
   │                    ├─ Broadcast──────────────────>│
   │                    │  to order:{id}  │ (customer app)
   │<─ { status: ──────>│                 │              │
   │   accepted }       │                 │              │
   │                    │                 │              │
   │ [Shop packs order] │                 │              │
   │                    │                 │              │
   │─ PATCH /orders/───>│                 │              │
   │  :id/mark-ready    ├─ Update status─>│              │
   │                    │                 │              │
   │<─ { status: ready }│                 │              │
   │                    │                 │              │
   └─ Notify "Order ready for pickup"
```

### **Flow 3: Manage Products**

```
Shop App            Backend        Supabase    Typesense    R2
   │                   │               │            │         │
   │─ GET /shops/──────>│               │            │         │
   │  :id/products      │               │            │         │
   │<─ [ products ]─────│               │            │         │
   │                    │               │            │         │
   │ [Edit product]     │               │            │         │
   │                    │               │            │         │
   │─ PATCH /products───>│               │            │         │
   │  /:id              ├─ Update data──>│            │         │
   │                    │               ├─ Re-index──>│         │
   │<─ { success }──────│               │            │         │
   │                    │               │            │         │
   │ [Toggle stock]     │               │            │         │
   │                    │               │            │         │
   │─ PATCH /products───>│               │            │         │
   │  /:id/toggle       ├─ Update stock─>│            │         │
   │                    │               │            │         │
   │                    │               ├─ Hide/show─>│         │
   │<─ { success }──────│               │  in 15s     │         │
   │                    │               │            │         │
   └─ Product now available/hidden from customer search
```

### **Flow 4: View Earnings**

```
Shop App            Backend        Supabase
   │                   │               │
   │─ GET /shops/──────>│               │
   │  :id/earnings      │               │
   │                    ├─ Calculate earnings──>│
   │                    │   (today/week/month)  │
   │<─ { earnings }─────│                       │
   │                    │                       │
   │ [Shows metric      │                       │
   │  cards + chart]    │                       │
   │                    │                       │
   │─ GET /shops/──────>│                       │
   │  :id/analytics     ├─ Fetch analytics─────>│
   │<─ { metrics }──────│                       │
   │                    │                       │
   └─ Dashboard displays revenue trend & breakdown
```

---

## ⚙️ Key Backend Services

| Service | Module | Purpose |
|---------|--------|---------|
| **Auth** | `src/routes/auth.js` | JWT token generation, OTP verification |
| **Shops** | `src/routes/shops.js` | Shop CRUD, KYC, toggle, settings |
| **Products** | `src/routes/products.js` | Product CRUD, bulk upload, stock toggle |
| **Orders** | `src/routes/orders.js` | Order creation, cancellation, status |
| **Payments** | `src/routes/payments.js` | Cashfree integration, webhook handling, refunds |
| **Delivery** | `src/routes/delivery.js` | Partner assignment, GPS tracking, ratings |
| **Reviews** | `src/routes/reviews.js` | Customer reviews, trust score |
| **Search** | `src/routes/search.js` | Typesense shop/product search |
| **Admin** | `src/routes/admin.js` | KYC review, disputes, analytics |

---

## 🧪 Running the Test

To run the **e2e-test-example.ts** provided:

```bash
# 1. Install axios (if not already)
npm install axios

# 2. Make sure backend is running
npm run dev  # in backend/

# 3. Run the test
npx ts-node e2e-test-example.ts

# Expected output:
# 🧪 Starting NearBy E2E Test Suite
# ═══════════════════════════════════════════
# ✓ TEST 1: Authentication Flow
#   ✓ OTP requested: true
#   ✓ OTP verified, JWT token received
#   ✓ Customer ID: user-uuid
# ✓ TEST 2: Browse Nearby Shops
#   ✓ Shops fetched: 5
#   ✓ First shop: { id: ..., name: "...", trust_score: 75 }
# ... [more tests]
# ✅ ALL TESTS PASSED
```

---

## 📋 Key Endpoints Reference

### Authentication
```
POST /api/v1/auth/request-otp
POST /api/v1/auth/verify-otp
```

### Shops
```
POST /api/v1/shops
GET /api/v1/shops
GET /api/v1/shops/:id
PATCH /api/v1/shops/:id
PATCH /api/v1/shops/:id/toggle
POST /api/v1/shops/:id/kyc
```

### Products
```
POST /api/v1/products
GET /api/v1/shops/:id/products
PATCH /api/v1/products/:id
PATCH /api/v1/products/:id/toggle
POST /api/v1/products/bulk
GET /api/v1/shops/:id/products/low-stock
```

### Orders
```
POST /api/v1/orders
GET /api/v1/orders/:id
GET /api/v1/shops/:id/orders
PATCH /api/v1/orders/:id/accept
PATCH /api/v1/orders/:id/mark-ready
PATCH /api/v1/orders/:id/cancel
```

### Payments
```
POST /api/v1/payments/initiate
GET /api/v1/payments/:id
POST /api/v1/payments/webhook (Cashfree)
POST /api/v1/payments/refund
```

### Analytics/Earnings
```
GET /api/v1/shops/:id/earnings
GET /api/v1/shops/:id/analytics
```

---

Created: 2026-04-24 | Use this map to understand which frontend screens call which backend endpoints.
