# NearBy Architecture Documentation

> **Last Updated:** April 6, 2026  
> **Status:** Backend scaffold complete, implementation in progress (Sprint 1)  
> **Current Focus:** Foundation & Auth (Sprint 1)

---

## Table of Contents

1. [System Overview](#system-overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Backend Architecture](#backend-architecture)
4. [Data Flow Diagrams](#data-flow-diagrams)
5. [Technology Stack](#technology-stack)
6. [Service Integrations](#service-integrations)
7. [Real-time Architecture](#real-time-architecture)
8. [Database Schema](#database-schema)
9. [Scalability & Performance](#scalability--performance)
10. [Security Architecture](#security-architecture)

---

## System Overview

NearBy is a **hyperlocal trust commerce platform** with four interconnected applications serving different user roles:

```
┌─────────────────────────────────────────────────────────────┐
│                    NearBy Ecosystem                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  MOBILE APPS (React Native + Expo)                           │
│  ├─ Customer App       → Browse & order from local shops     │
│  ├─ Shop Owner App     → Manage inventory & fulfill orders   │
│  └─ Delivery App       → Accept assignments & track GPS      │
│                                                               │
│  ADMIN DASHBOARD (React + Vite)                              │
│  └─ NearBy Ops        → KYC review, disputes, monitoring     │
│                                                               │
│         ↓ (All via HTTPS + Socket.IO)                        │
│                                                               │
│  BACKEND API (Node.js + Express)                             │
│  ├─ REST API (9 service domains)                             │
│  ├─ Socket.IO (real-time events)                             │
│  └─ Worker Queues (BullMQ)                                   │
│                                                               │
│         ↓ (Connections to external services)                 │
│                                                               │
│  EXTERNAL INTEGRATIONS                                       │
│  ├─ Supabase PostgreSQL (database)                           │
│  ├─ Redis (cache, geo-tracking, sessions)                    │
│  ├─ Typesense (search engine)                                │
│  ├─ Cloudflare R2 (file storage)                             │
│  ├─ Cashfree (payments)                                      │
│  ├─ MSG91 (SMS/OTP)                                          │
│  ├─ Firebase FCM (push notifications)                        │
│  └─ Ola Maps (geocoding, routing, ETA)                       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Core Principle

**Trust over Speed:** Unlike dark stores (Blinkit, Zepto) that compete on 10-minute delivery, NearBy competes on:
- **Trust:** Verified local shops, transparent shop ratings
- **Authenticity:** Real kirana stores, pharmacies, restaurants, not anonymous warehouses
- **Community:** Every order keeps money in the local neighborhood economy

---

## High-Level Architecture

### System Components

```
┌──────────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                                │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Customers      Shop Owners      Delivery Partners    Admin Team  │
│  (React Native) (React Native)    (React Native)       (React)     │
│                                                                    │
└────────────────────────────────┬─────────────────────────────────┘
                                 │ HTTPS + WSS
┌────────────────────────────────▼─────────────────────────────────┐
│                    API GATEWAY LAYER                              │
├──────────────────────────────────────────────────────────────────┤
│  • Helmet (security headers)                                      │
│  • CORS (controlled origins)                                      │
│  • Rate limiting (Redis-backed)                                   │
│  • Request logging (Winston)                                      │
└────────────────────────────────┬─────────────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
┌───────▼──────┐        ┌─────────▼────────┐     ┌───────▼──────┐
│  REST API    │        │   Socket.IO      │     │  BullMQ      │
│  (9 routes)  │        │  (Real-time)     │     │  (Jobs)      │
├──────────────┤        ├──────────────────┤     ├──────────────┤
│ • Auth       │        │ • Order updates  │     │ • Async jobs │
│ • Shops      │        │ • GPS tracking   │     │ • Scheduling │
│ • Products   │        │ • Chat           │     │ • Retries    │
│ • Orders     │        │ • Admin monitor  │     │              │
│ • Delivery   │        │                  │     │              │
│ • Payments   │        │                  │     │              │
│ • Reviews    │        │                  │     │              │
│ • Search     │        │                  │     │              │
│ • Admin      │        │                  │     │              │
└───────┬──────┘        └────────┬─────────┘     └───────┬──────┘
        │                        │                      │
        └────────────────────────┼──────────────────────┘
                                 │
        ┌────────────────────────┼──────────────────────┐
        │                        │                      │
┌───────▼──────────┐   ┌────────▼─────────┐  ┌────────▼──────┐
│   DATA LAYER     │   │  CACHE/QUEUE    │  │  SEARCH       │
├──────────────────┤   ├─────────────────┤  ├───────────────┤
│ Supabase         │   │ Redis           │  │ Typesense     │
│ (PostgreSQL)     │   │ • Geo-tracking  │  │ • Shops       │
│ • Profiles       │   │ • OTP storage   │  │ • Products    │
│ • Shops          │   │ • Session cache │  │ • Filtering   │
│ • Products       │   │ • Rate limit    │  │ • Typo-tol.   │
│ • Orders         │   │   counters      │  │               │
│ • Payments       │   │ • Pub/sub       │  │               │
│ • RLS enabled    │   │                 │  │               │
└──────────────────┘   └─────────────────┘  └───────────────┘
```

---

## Backend Architecture

### Service Domains (9 Route Modules)

Each domain is isolated in its own route file with a single responsibility:

| Domain | File | Purpose | Key Endpoints |
|--------|------|---------|---|
| **Auth** | `routes/auth.js` | OTP login, JWT issue | POST /send-otp, POST /verify-otp |
| **Shops** | `routes/shops.js` | Shop CRUD & KYC | POST /shops, GET /shops/:id, POST /kyc |
| **Products** | `routes/products.js` | Product CRUD | POST /products, PATCH /products/:id |
| **Orders** | `routes/orders.js` | Order lifecycle | POST /orders, PATCH /orders/:id/accept |
| **Delivery** | `routes/delivery.js` | Assignment & tracking | GET /assignments, PATCH /location |
| **Payments** | `routes/payments.js` | Payment webhooks | POST /webhook, GET /status |
| **Reviews** | `routes/reviews.js` | Ratings & feedback | POST /reviews, GET /shop/:id/reviews |
| **Search** | `routes/search.js` | Typesense queries | GET /shops, GET /products |
| **Admin** | `routes/admin.js` | Ops dashboard API | GET /kyc-pending, PATCH /approve-kyc |

### Middleware Stack

Processed in order for every request:

```
Request
  ↓
1. helmet()              — Security headers
  ↓
2. cors()                — Origin validation
  ↓
3. express.json()        — Parse JSON body
  ↓
4. express.urlencoded()  — Parse form data
  ↓
5. Route-specific middleware (if any)
  ├─ validate()          — Joi schema validation
  ├─ rateLimit()         — Redis-backed rate limiting
  ├─ auth()              — JWT verification + user context
  └─ roleGuard()         — Role-based access control
  ↓
6. Route handler
  ↓
7. errorHandler()        — Centralized error handling
  ↓
Response
```

### Service Integration Layer

Third-party integrations live in `services/` to keep routes clean:

```javascript
// Supabase (database)
import { supabase } from './services/supabase.js'
const order = await supabase.from('orders').select('*').eq('id', orderId)

// Redis (cache + pub/sub + geo)
import { redis } from './services/redis.js'
await redis.setex(`otp:${phone}`, 300, otp)  // 5-min TTL

// Typesense (search)
import { typesense } from './services/typesense.js'
await typesense.collections('shops').documents().create(shopData)

// Cloudflare R2 (file storage)
import { r2 } from './services/r2.js'
await r2.putObject({ Bucket: 'nearby-kyc', Key: docId })

// Cashfree (payments)
import { cashfree } from './services/cashfree.js'
const payment = await cashfree.createPayment(orderData)

// MSG91 (SMS/OTP)
import { msg91 } from './services/msg91.js'
await msg91.sendOTP(phone, otp)

// Firebase FCM (push)
import { fcm } from './services/fcm.js'
await fcm.send({ tokens: [token], notification })

// Ola Maps (geo)
import { olaMaps } from './services/olaMaps.js'
const eta = await olaMaps.distanceMatrix(origin, destination)
```

### Worker Queue Architecture (BullMQ)

Asynchronous tasks run via Redis-backed BullMQ, not synchronously in request handlers:

| Queue | Trigger | Responsibility |
|-------|---------|---|
| **notify-shop** | Order placed | FCM + SMS to shop (in 500ms) |
| **assign-delivery** | Shop accepts | Find nearest delivery partner via Redis GEO |
| **auto-cancel** | Order placed | Scheduled 3min delay, cancel if not accepted |
| **notify-customer** | Order status changes | FCM + SMS to customer |
| **trust-score** | Nightly 2 AM IST | Recompute all shop trust scores |
| **analytics-aggregate** | Nightly 3 AM IST | Aggregate daily shop metrics |
| **earnings-summary** | Weekly Mon 9 AM IST | Weekly earnings report to shop |

---

## Data Flow Diagrams

### 1. Customer Placing an Order (Happy Path)

```
CUSTOMER APP                BACKEND                  EXTERNAL SERVICES
    │                          │                              │
    ├─ Browse shops ─────────→ GET /search/shops (Typesense) │
    │                          │ ←─────────────── search results
    │                                                          │
    ├─ View shop details ────→ GET /shops/:id (Supabase)     │
    │                          │ ←─────── shop + products
    │                                                          │
    ├─ Place order ──────────→ POST /orders                   │
    │                          │ [ATOMIC TRANSACTION]          │
    │                          ├─ Lock stock (Supabase)       │
    │                          ├─ Create order record         │
    │                          ├─ Validate price (server-side)│
    │                          ├─ Store idempotency key       │
    │                          └─ Respond to client           │
    │                          │                              │
    │                          ├─ Queue notify-shop job ─────→ MSG91, FCM
    │                          ├─ Queue auto-cancel (3min) ──→ BullMQ
    │ ←─────────── { orderId }│                              │
    │                          │                              │
    ├─ Socket.io join ───────→ io.emit('order:created') ────→ Customer room
    │  order:{orderId} room    │                              │
    │                          │                              │
    │ [3 minutes pass]         │                              │
    │                          ├─ auto-cancel job fires       │
    │                          │ if shop NOT accepted         │
    │                          └─ FCM: "Order timed out" ────→ FCM
    │                          │                              │
    │ ←─ Socket event ◄────────┤ (Status: auto_cancelled)    │
    │   if timed out           │                              │
    │                          │                              │
    │ [Shop accepts within 3m] │                              │
    │                          ├─ Queue assign-delivery ─────→ Redis GEO
    │                          ├─ Queue notify-customer ─────→ FCM/SMS
    │ ←─ Socket event ◄────────┤                              │
    │   order:accepted         │                              │
    │                          │                              │
    │ [Customer proceeds to    │                              │
    │  payment]                │                              │
    │                          │                              │
    ├─ Initiate payment ─────→ POST /payments/initiate       │
    │                          ├─ Validate order (Supabase)   │
    │                          ├─ Call Cashfree API ─────────→ Cashfree
    │ ←─ Payment link ◄────────┤                              │
    │                          │                              │
    └─ Redirect to Cashfree ───────────────────────────────→ Cashfree
       (payment gateway)                                      │
                                                              │
                               ←─ Webhook callback ─────────┘
                               POST /payments/webhook
                               ├─ Verify HMAC (Cashfree)
                               ├─ Update payment status
                               ├─ Unlock stock if failed
                               └─ Queue notify-customer
```

### 2. Real-time Order Status Updates

```
SHOP OWNER APP          BACKEND              CUSTOMER APP
      │                    │                      │
      │                    │                      │
      ├─ Accept order ────→ PATCH /orders/:id/accept
      │                    │ ├─ Update status
      │                    │ ├─ Create delivery assignment
      │                    │ ├─ Broadcast via Socket.IO
      │                    │ └─ Queue notify-customer
      │                    │                      │
      │                    ├─ io.to('order:{id}').emit('order:accepted')
      │                    │─────────────────────→ Socket event received
      │                    │                      │ (UI updates → "In Progress")
      │                    │                      │
      ├─ Start packing ───→ PATCH /orders/:id/status
      │                    │ (packing)
      │                    │
      │                    ├─ io.emit('order:packing')
      │                    │─────────────────────→ Notification shown
      │                    │
      ├─ Ready for pickup ─→ PATCH /orders/:id/status
      │                    │ (ready)
      │                    │
      │                    ├─ Queue assign-delivery job
      │                    │ ├─ Find nearest partner via Redis GEO
      │                    │ ├─ Assign to partner
      │                    │ ├─ Queue notify-delivery (FCM)
      │                    │
      │     DELIVERY APP    │
      │           │         │
      │           ├─ Accept assignment
      │           │         │
      │           ├─ Start tracking GPS (every 5s)
      │           │         │
      │           │        [Socket emit: delivery:gps_update]
      │           │        ├─ Geoadd to Redis: delivery:{orderId}
      │           │        ├─ Calculate ETA via Ola Maps
      │           │        ├─ Broadcast to order room
      │           │         │─────────────────────→ Customer sees live location
      │           │         │ & ETA on map
      │           │         │
      │           ├─ Mark as picked up ─→ PATCH /orders/:id/pickup
      │           │        ├─ Status: picked_up
      │           │        ├─ GPS trail begins stored
      │           │
      │           ├─ Delivering ──────→ PATCH /orders/:id/delivering
      │           │        │
      │           ├─ Complete delivery ─→ PATCH /orders/:id/delivered
      │           │        ├─ Status: delivered
      │           │        ├─ Timestamp recorded
      │           │        ├─ Queue earnings summary
      │           │         │
      │           │        ├─ io.emit('order:delivered')
      │           │         │─────────────────────→ "Order arrived!"
      │           │         │
      │           │        ├─ Email receipt + invoice
      │           │
```

### 3. Search & Discovery Flow

```
CUSTOMER APP              BACKEND                 EXTERNAL
    │                         │                        │
    ├─ User opens app ───────→ GET /search/shops       │
    │  (lat: 17.360, lon: 78.474)  [Default: 3km radius]
    │                         │                        │
    │                         ├─ Query Typesense ─────→ Typesense
    │                         │ {                       │
    │                         │   filter: "is_open=1"  │
    │                         │   geo_filter: 3000m    │
    │                         │   sort: "trust_score"  │
    │                         │ }                       │
    │                         │                        │
    │                         │ ←─ [Top 20 shops]      │
    │                         │                        │
    │ ←─ Shop list ◄──────────┤                        │
    │                         │                        │
    ├─ Expand radius ────────→ GET /search/shops       │
    │  (if <5 results)        │ [Retry: 5km radius]    │
    │                         │                        │
    │                         ├─ Query Typesense ─────→ Typesense
    │ ←─ More shops ◄─────────┤                        │
    │                         │                        │
    ├─ Search "milk" ────────→ GET /search/products    │
    │                         │ {                      │
    │                         │   query: "milk"        │
    │                         │   shops: [shopIds]     │
    │                         │ }                      │
    │                         │                        │
    │                         ├─ Query Typesense ─────→ Typesense
    │                         │ (typo-tolerant)        │
    │                         │                        │
    │ ←─ Product results ◄────┤                        │
    │  (with shop info)       │                        │
    │                         │                        │
    └─ Tap shop ────────────→ GET /shops/:id           │
                             ├─ Fetch full details    │
                             ├─ Fetch all products    │
                             └─ Fetch reviews (Supabase)
```

---

## Technology Stack

### Core

| Layer | Technology | Why |
|-------|-----------|-----|
| **Runtime** | Node.js ≥20 | Modern async/await, ESM modules |
| **Framework** | Express 4.x | Minimal, battle-tested, easy to test |
| **Package Mgr** | npm | Stable, works with monorepo |
| **Language** | JavaScript (ES6+) | Fast development, great ecosystem |

### Database & Storage

| Technology | Use Case | Why |
|-----------|----------|-----|
| **Supabase (PostgreSQL)** | Main application database | Managed, RLS built-in, auto REST API, free tier sufficient for V1 |
| **Redis** | Cache, sessions, geo-tracking, pub/sub | In-memory speed, atomic operations, GEOADD for delivery tracking |
| **Cloudflare R2** | Product images (public), KYC docs (private) | Zero egress fees, free 10GB, CDN included |
| **Typesense** | Full-text search (shops & products) | Single Docker container, 500MB RAM, geo-search + typo-tolerance |

### Real-time

| Technology | Use Case | Why |
|-----------|----------|-----|
| **Socket.IO** | Real-time events (orders, GPS, chat) | Works with Redis adapter, auto-reconnect, fallback to polling |
| **BullMQ** | Asynchronous job queue | Built on Redis, scheduled jobs, retries, dead-letter queue |

### Third-Party APIs

| Service | Use Case | Cost/Limits | Key Config |
|---------|----------|-------------|-----------|
| **Cashfree** | Payments | 1.75% commission | CASHFREE_WEBHOOK_SECRET |
| **MSG91** | OTP & SMS | ₹0.18/SMS | MSG91_AUTH_KEY, DLT template required |
| **Firebase FCM** | Push notifications | Free | google-services.json |
| **Ola Maps** | Geocoding, routing, ETA | 1M free calls/month | OLA_MAPS_API_KEY |

### Development

| Tool | Purpose |
|------|---------|
| **Jest** | Unit & integration testing |
| **Supertest** | API endpoint testing |
| **ESLint** | Code linting |
| **Nodemon** | Hot reload during development |
| **Docker + docker-compose** | Local environment setup |

---

## Service Integrations

### 1. Supabase (Database)

```javascript
import { supabase } from './services/supabase.js'

// CRUD operations
const shops = await supabase
  .from('shops')
  .select('*')
  .eq('is_open', true)
  .range(0, 19)

// RLS: Shop owner sees only their shop
const shop = await supabase
  .from('shops')
  .select('*')
  .eq('id', shopId)
  .single()
  // RLS policy: (auth.uid = profiles.user_id AND profiles.shop_id = shops.id)

// Admin bypasses RLS
const { data } = await supabase.admin.auth.admin.listUsers()
```

**Key Tables:**
- `profiles` — Users (customers, shop_owners, delivery_partners, admins)
- `shops` — Shop details, KYC status, trust_score
- `products` — Product catalog per shop
- `orders` — Order lifecycle & history
- `order_items` — Line items in orders
- `reviews` — Shop & delivery ratings
- `disputes` — Order disputes & resolutions
- `analytics` — Hourly shop metrics

### 2. Redis

```javascript
import { redis } from './services/redis.js'

// OTP storage (5-min TTL)
await redis.setex(`otp:${phone}`, 300, otp)
const storedOtp = await redis.get(`otp:${phone}`)

// Rate limiting (sliding window)
const key = `rate:${ip}:POST:/api/v1/orders`
const count = await redis.incr(key)
await redis.expire(key, 60) // 1-minute window

// Session cache
await redis.setex(`session:${userId}`, 86400, JSON.stringify(userData))

// Geospatial tracking (delivery partner location)
await redis.geoadd('delivery:active', longitude, latitude, deliveryPartnerId)
const nearbyPartners = await redis.georadius('delivery:active', lon, lat, 2, 'km')

// Pub/Sub for real-time updates
redis.subscribe('order:status:updated')
redis.on('message', (channel, message) => {
  // Trigger Socket.IO broadcast
})
```

### 3. Typesense (Search)

```javascript
import { typesense } from './services/typesense.js'

// Create/update shop document (on KYC approval or toggle)
await typesense.collections('shops').documents().create({
  id: shop.id,
  name: shop.name,
  category: shop.category,
  is_open: shop.is_open,
  trust_score: shop.trust_score,
  geo_location: {
    lat: shop.latitude,
    lon: shop.longitude
  },
  description: shop.description
})

// Search shops near user with geo-filter
const results = await typesense
  .collections('shops')
  .documents()
  .search({
    q: '*',
    filter_by: 'is_open:=true && geo_location:(17.360, 78.474, 3km)',
    sort_by: 'trust_score:desc'
  })

// Search products with typo tolerance
const products = await typesense
  .collections('products')
  .documents()
  .search({
    q: 'mlik', // Typo for "milk"
    typo_tokens_threshold: 1,
    prefix: true
  })
```

### 4. Cloudflare R2 (Storage)

```javascript
import { r2 } from './services/r2.js'
import sharp from 'sharp'

// Upload product image (public)
const imageBuffer = await sharp(file.buffer)
  .resize(600, 600, { fit: 'cover' })
  .webp()
  .toBuffer()

const r2Url = await r2.putObject({
  Bucket: 'nearby-products',
  Key: `${productId}/600x600.webp`,
  Body: imageBuffer,
  ContentType: 'image/webp'
})

// Upload KYC document (private)
const kycUrl = await r2.putObject({
  Bucket: 'nearby-kyc',
  Key: `${shopId}/${docType}/${timestamp}`,
  Body: buffer,
  ServerSideEncryption: 'AES256' // Encrypted at rest
})

// Generate signed URL (5-min TTL for admin)
const signedUrl = await r2.getSignedUrl(kycUrl, 300)
```

### 5. Cashfree (Payments)

```javascript
import { cashfree } from './services/cashfree.js'

// Create order for payment
const payment = await cashfree.orders.create({
  order_id: orderId,
  order_amount: totalInPaise / 100, // Convert to rupees
  order_currency: 'INR',
  customer_details: {
    customer_id: userId,
    customer_email: email,
    customer_phone: phone
  },
  order_note: `NearBy Order ${orderId}`
})

// Customer redirected to payment link
// Cashfree calls POST /payments/webhook (HMAC verified)

// On webhook (payment succeeded)
const signature = req.headers['x-cashfree-signature']
const computed = HMAC(payload, CASHFREE_WEBHOOK_SECRET)
if (signature !== computed) throw new Error('Invalid signature')

await updateOrderStatus(orderId, 'paid')

// Refund (if order cancelled)
await cashfree.refunds.create({
  order_id: orderId,
  refund_amount: totalInPaise / 100,
  refund_note: 'Order cancelled by customer'
})
```

### 6. MSG91 (SMS/OTP)

```javascript
import { msg91 } from './services/msg91.js'

// Send OTP
const otp = generateOTP() // 6-digit
await msg91.send({
  to: phone,
  message: `Your NearBy OTP is ${otp}. Valid for 5 minutes.`,
  route: 'otp' // Uses registered DLT template
})

// Send notification SMS
await msg91.send({
  to: phone,
  message: `Order ${orderId} confirmed! Shop is preparing.`,
  route: 'transactional'
})
```

### 7. Firebase FCM (Push)

```javascript
import { fcm } from './services/fcm.js'

// Send high-priority notification to shop (order placed)
await fcm.send({
  tokens: [shopOwnerToken],
  notification: {
    title: 'New Order!',
    body: `Order #${orderId} from ${customerName}`,
    priority: 'high',
    sound: 'default'
  },
  data: {
    orderId: orderId,
    action: 'ORDER_PLACED'
  }
})

// Broadcast to multiple partners (delivery assignment)
await fcm.sendMulticast({
  tokens: nearbyPartnerTokens,
  notification: {
    title: 'New Assignment',
    body: `₹${deliveryFee} for pickup in ${timeToReach}s`,
    priority: 'high'
  }
})
```

### 8. Ola Maps (Geo)

```javascript
import { olaMaps } from './services/olaMaps.js'

// Geocode address to coordinates
const { lat, lng } = await olaMaps.geocode(shopAddress)

// Get ETA from delivery partner to customer
const { duration, distance } = await olaMaps.distanceMatrix(
  { lat: deliveryLat, lng: deliveryLng },
  { lat: customerLat, lng: customerLng }
)
const etaMinutes = Math.ceil(duration / 60)

// Get route (for driver directions)
const route = await olaMaps.route(origin, destination)
```

---

## Real-time Architecture

### Socket.IO Rooms

Rooms organize subscribers for efficient broadcasting:

```
Connections:
├─ order:{orderId}
│  └─ Subscribers: customer, shop owner, delivery partner, admin
│     Events: order:created, order:accepted, order:packing, etc.
│
├─ shop:{shopId}
│  └─ Subscribers: shop owner, support team
│     Events: new:order, refund, kyc:status_changed
│
├─ shop:{shopId}:chat
│  └─ Subscribers: customer, shop owner
│     Events: message:sent, message:read
│
├─ delivery:{deliveryPartnerId}
│  └─ Subscribers: delivery partner, admin
│     Events: assignment:new, location:requested
│
└─ admin
   └─ Subscribers: admin team
      Events: kyc:pending, dispute:reported, shop:flagged
```

### Broadcasting Pattern

```javascript
// Notify all participants of order status change
io.to(`order:${orderId}`).emit('order:status_changed', {
  status: 'accepted',
  acceptedAt: new Date(),
  estimatedReadyTime: readyTime
})

// Customer receives update
socket.on('order:status_changed', (data) => {
  updateUI(data)  // Show "Order accepted" message
})

// Shop owner receives update
socket.on('order:status_changed', (data) => {
  startTimer(data.estimatedReadyTime)  // Show countdown
})

// Delivery partner receives update
socket.on('order:status_changed', (data) => {
  if (data.status === 'ready') {
    notifyPickup()  // "Ready for pickup"
  }
})
```

---

## Database Schema

### Core Tables (PostgreSQL)

```sql
-- User profiles (all roles)
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  phone VARCHAR(15) UNIQUE NOT NULL,
  role ENUM('customer', 'shop_owner', 'delivery', 'admin'),
  shop_id UUID REFERENCES shops(id),  -- Only if shop_owner
  fcm_token TEXT,                      -- For push notifications
  created_at TIMESTAMP DEFAULT NOW()
);

-- Shop details
CREATE TABLE shops (
  id UUID PRIMARY KEY,
  owner_id UUID REFERENCES profiles(id),
  name VARCHAR(255) NOT NULL,
  category ENUM('kirana', 'pharmacy', 'restaurant', ...),
  address TEXT NOT NULL,
  latitude FLOAT NOT NULL,
  longitude FLOAT NOT NULL,
  kyc_status ENUM('pending', 'approved', 'rejected'),
  kyc_docs JSONB,  -- URLs to R2
  is_open BOOLEAN DEFAULT FALSE,
  trust_score INT DEFAULT 50,  -- 0-100
  avg_rating FLOAT,
  completion_rate FLOAT,
  response_time_minutes INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Product catalog
CREATE TABLE products (
  id UUID PRIMARY KEY,
  shop_id UUID REFERENCES shops(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  price_paise INT NOT NULL,  -- Always in paise
  stock INT NOT NULL,
  image_url TEXT,  -- R2 public URL
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Order lifecycle
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  customer_id UUID REFERENCES profiles(id),
  shop_id UUID REFERENCES shops(id),
  delivery_partner_id UUID REFERENCES profiles(id),
  status ENUM('pending', 'accepted', 'packing', 'ready', 'assigned', 
              'picked_up', 'out_for_delivery', 'delivered', 'cancelled',
              'auto_cancelled', 'refunded'),
  total_paise INT NOT NULL,  -- Server-calculated from items
  payment_method ENUM('card', 'upi', 'cod'),
  payment_status ENUM('pending', 'completed', 'failed'),
  cashfree_order_id VARCHAR(255),
  idempotency_key UUID UNIQUE,  -- Prevent duplicate orders
  created_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP,
  delivered_at TIMESTAMP
);

-- Order line items
CREATE TABLE order_items (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  product_id UUID REFERENCES products(id),
  quantity INT NOT NULL,
  unit_price_paise INT NOT NULL,  -- Price at time of order
  total_paise INT NOT NULL
);

-- Reviews & ratings
CREATE TABLE reviews (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  reviewer_id UUID REFERENCES profiles(id),  -- Customer or delivery
  reviewee_id UUID REFERENCES profiles(id),  -- Shop owner or delivery
  rating INT (1-5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Disputes
CREATE TABLE disputes (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  complaint_by UUID REFERENCES profiles(id),
  type ENUM('missing_items', 'damaged', 'late', 'wrong_items'),
  description TEXT,
  status ENUM('open', 'in_review', 'resolved', 'rejected'),
  resolution TEXT,
  refund_amount_paise INT,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

-- Daily analytics (for trust score & reports)
CREATE TABLE analytics (
  id UUID PRIMARY KEY,
  shop_id UUID REFERENCES shops(id),
  date DATE,
  orders_count INT,
  completed_orders INT,
  total_revenue_paise INT,
  avg_acceptance_time_minutes FLOAT,
  reviews_count INT,
  avg_rating FLOAT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(shop_id, date)
);
```

### Indexes & RLS Policies

```sql
-- Performance indexes
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_shop ON orders(shop_id);
CREATE INDEX idx_products_shop ON products(shop_id);
CREATE INDEX idx_shops_location ON shops USING GIST(
  ll_to_earth(latitude, longitude)
);

-- Row-level security (Supabase)
-- Customers see only their own orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers_see_own_orders" ON orders
  FOR SELECT USING (auth.uid = customer_id);

-- Shop owners see only their shop's orders
CREATE POLICY "owners_see_shop_orders" ON orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid
      AND p.role = 'shop_owner'
      AND p.shop_id = orders.shop_id
    )
  );

-- Admin bypasses all RLS (use service_role key on backend only)
```

---

## Scalability & Performance

### Caching Strategy

```
API Request
  ↓
1. Check Redis cache (50ms)
   ├─ Hit: Return cached response ✓
   └─ Miss: Continue to database
     ↓
2. Query Supabase (200-500ms)
   ↓
3. Cache result in Redis (TTL varies)
   ├─ Shop details: 1 hour
   ├─ Product catalog: 30 minutes (shorter because price/stock changes)
   ├─ Search results: 5 minutes
   └─ User profile: 24 hours
```

### Geospatial Optimization

```
Redis GEO commands (O(log N)):
├─ GEOADD delivery:active lon lat partnerId  — Add delivery partner
├─ GEORADIUS delivery:active lon lat 2 km    — Find nearby partners
└─ TTL 30s — Auto-expire when delivery completes
```

### Database Query Optimization

```javascript
// ❌ WRONG: N+1 query problem
const orders = await supabase.from('orders').select('*')
for (const order of orders) {
  const shop = await supabase.from('shops')
    .select('*')
    .eq('id', order.shop_id)  // N additional queries!
}

// ✅ CORRECT: Single query with join
const orders = await supabase
  .from('orders')
  .select('*, shops(*)')
  .range(0, 19)
```

### Load Testing Targets (V1)

| Metric | Target | Current |
|--------|--------|---------|
| **Concurrent Users** | 1,000 | TBD (Stress test after Sprint 4) |
| **API Response Time (p95)** | <500ms | Baseline: <300ms (local) |
| **Database Connections** | <50 active | Monitor via Supabase metrics |
| **Redis Memory** | <500MB | Daily cleanup of expired keys |
| **Typesense Index Size** | <100MB | Depends on product count |

---

## Security Architecture

### Authentication & Authorization

```
┌─────────────────────────────────────────────┐
│ Client                                       │
├─────────────────────────────────────────────┤
│                                              │
│ POST /auth/send-otp { phone }               │
│ └─ Server generates 6-digit OTP              │
│    └─ Stores in Redis (5-min TTL)            │
│       └─ Sends via MSG91 (DLT template)      │
│                                              │
│ POST /auth/verify-otp { phone, otp }        │
│ └─ Verify OTP from Redis                     │
│    └─ Check attempts (max 3)                 │
│       └─ Issue JWT (1-week expiry)           │
│          └─ JWT payload:                     │
│             {                                │
│               sub: userId,                   │
│               phone: "+919876543210",        │
│               role: "customer|shop_owner|...",
│               shopId: (if shop_owner),       │
│               iat: now,                      │
│               exp: now + 7 days              │
│             }                                │
│                                              │
│ Future requests:                             │
│ Authorization: Bearer {jwt}                  │
│ └─ Middleware verifies signature             │
│    └─ Sets req.user from JWT payload         │
│       └─ Middleware: roleGuard(['customer']) │
│          └─ Allows only customer role        │
│                                              │
└─────────────────────────────────────────────┘
```

### Password-less Design

- **No passwords** — OTP-only authentication
- **Phone = Identity** — Phone number is unique identifier
- **DLT Compliance** — MSG91 uses approved templates (Indian regulation)
- **Rate Limiting** — 3 OTP attempts, 10-minute lockout

### Data Security

```
API Layer
  ├─ HTTPS only (TLS 1.3)
  ├─ CORS: Restricted to app origins
  ├─ Helmet: Security headers
  └─ Rate limiting: 100 req/min per IP

Application Layer
  ├─ Input validation (Joi schemas)
  ├─ JWT verification
  ├─ Role-based access control
  └─ Idempotency keys (prevent duplicate writes)

Database Layer (Supabase)
  ├─ Encryption at rest (AES-256)
  ├─ RLS policies (row-level access control)
  ├─ Backups (automatic, 7-day retention)
  └─ No direct database access (API-only)

File Storage (R2)
  ├─ Public bucket: CDN-served product images
  └─ Private bucket: KYC docs (signed URLs only, 5-min TTL)

Sensitive Data
  ├─ Prices: Server-calculated only
  ├─ Payments: HMAC-verified webhooks
  ├─ Secrets: Environment variables (never in code)
  └─ GPS: Geo-stored in Redis (TTL 30s), not in DB
```

### Payment Security

- **Cashfree webhook verification:** HMAC signature checked before processing
- **Idempotent webhook handler:** Same webhook ID processed once (prevents duplicate charging)
- **Server-side price calculation:** Client cannot manipulate order total
- **PCI compliance:** No card data touches NearBy servers (Cashfree handles)

---

## Deployment Architecture

### Local Development

```bash
docker-compose up
# Spins up:
# - Node.js API on localhost:3000
# - Redis on localhost:6379
# - Typesense on localhost:8108
# - Supabase (remote, via .env)
```

### Production (DigitalOcean + Coolify)

```
┌─────────────────────────────────────────────┐
│ Cloudflare (DNS + DDoS + CDN)               │
│ ├─ api.nearby.app → DO droplet              │
│ └─ cdn.nearby.app → R2 (image CDN)          │
└────────────────┬────────────────────────────┘
                 │ HTTPS (TLS 1.3)
┌────────────────▼────────────────────────────┐
│ DigitalOcean Droplet (Bangalore, 2vCPU/4GB) │
├─────────────────────────────────────────────┤
│ Coolify (Container orchestration)            │
│ ├─ Docker container: Node.js API (port 3000)│
│ ├─ Docker container: Redis (port 6379)      │
│ ├─ Docker container: Typesense (port 8108)  │
│ ├─ Docker container: Grafana (monitoring)   │
│ └─ Docker container: Admin Dashboard        │
│    (React build served via nginx)            │
│                                              │
│ Environment:                                 │
│ ├─ NODE_ENV=production                      │
│ ├─ SUPABASE_SERVICE_ROLE_KEY=***            │
│ ├─ CASHFREE_WEBHOOK_SECRET=***              │
│ └─ ... (all sensitive vars)                 │
└─────────────────────────────────────────────┘
         │                    │
         ├──────────────────┬─┴────────────────┐
         │                  │                  │
    [Supabase]         [Cashfree]         [Other APIs]
    (Managed)          (Third-party)       (Third-party)
```

### Monitoring & Observability

```
Grafana Dashboard (self-hosted on DO)
├─ API response time (p50, p95, p99)
├─ Database query performance
├─ Redis memory usage
├─ Worker queue depth (BullMQ)
├─ Error rate by endpoint
├─ Active Socket.IO connections
└─ CPU/Memory on DO droplet

Alerts triggered on:
├─ API latency > 2s (p95)
├─ Error rate > 1%
├─ Redis memory > 70%
├─ Queue depth > 1000 (backlog)
└─ Droplet CPU > 80%
```

---

## Future Enhancements

### Post-V1 (If Scaling Required)

1. **Microservices split** — Extract payment, search, delivery domains
2. **Multi-region deployment** — Indian cities beyond Hyderabad
3. **GraphQL API** — Alongside REST for mobile optimization
4. **Advanced analytics** — ML-powered surge pricing, demand forecasting
5. **A/B testing framework** — Feature flags, canary deployments

---

*Last Updated: April 6, 2026 | Author: Architecture Team*
