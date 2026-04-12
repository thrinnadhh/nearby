# NearBy — Hyperlocal Trust Commerce Platform

NearBy is a hyperlocal delivery platform connecting customers with verified local shops for on-demand delivery. Built with trust, transparency, and community at its core.

**Core thesis:** Dark stores (Blinkit, Zepto) win on speed. NearBy wins on **trust, authenticity, and community.** Every order placed keeps money in the local neighbourhood economy.

---

## 🎯 Quick Links

- **Documentation**: [docs/](docs/) — PRD, Architecture, ADRs, API Reference
- **Status**: [docs/SPRINT_PLAN.md](docs/SPRINT_PLAN.md) — Current sprint progress
- **Tech Stack**: [CLAUDE.md](CLAUDE.md) — Complete tech stack details
- **Coding Standards**: [docs/CODING_CONVENTIONS.md](docs/CODING_CONVENTIONS.md)

---

## 🚀 Getting Started (30 Minutes)

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Git
- Expo Go app (for mobile testing)

### Step 1: Clone & Configure

```bash
git clone https://github.com/nearby-app/nearby.git
cd nearby
cp .env.example .env
```

Edit `.env` with your service credentials:
```bash
# Minimal setup for local development
# Get credentials from: docs/SERVICE_ACCOUNTS.md

SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

REDIS_URL=redis://localhost:6379
TYPESENSE_API_KEY=nearby_dev_key

# Optional (for full feature testing)
CLOUDFLARE_R2_ACCESS_KEY_ID=YOUR_KEY
CLOUDFLARE_R2_SECRET_ACCESS_KEY=YOUR_SECRET
CASHFREE_APP_ID=test_app_id
MSG91_AUTH_KEY=YOUR_KEY
FIREBASE_PROJECT_ID=test_project
OLA_MAPS_API_KEY=YOUR_KEY
```

### Step 2: Start Backend Services

```bash
# Start Redis + Typesense (Docker)
docker-compose up -d redis typesense

# Verify they're running
docker-compose ps

# Check Redis health
docker exec nearby_redis redis-cli PING
# Expected: PONG

# Check Typesense health
curl http://localhost:8108/health
# Expected: {"ok":true}
```

### Step 3: Setup Database

```bash
# Install Supabase CLI
npm install -g supabase

# Start Supabase locally or link to cloud project
supabase link --project-ref YOUR_PROJECT_REF

# Run all migrations
supabase db push

# Verify tables created
supabase db list
```

See [supabase/README.md](supabase/README.md) for detailed database setup.

### Step 4: Start Backend API

```bash
cd backend
npm install
npm run dev

# Expected output:
# ✅ Connected to Supabase
# ✅ Connected to Redis
# ✅ Connected to Typesense
# ✅ Express server running on port 3000
# ✅ Socket.IO server running on port 3001
# ✅ BullMQ workers started
```

Test the API:
```bash
curl http://localhost:3000/health
# Expected: {"status":"ok","version":"1.0.0"}
```

### Step 5: Run Tests

```bash
cd backend
npm test -- --coverage

# Expected: 80%+ coverage on all metrics
```

### Step 6: Start Mobile Apps (Optional)

```bash
# Customer app
cd apps/customer
npm install
npx expo start
# Scan QR code with Expo Go app on your phone

# Shop owner app
cd apps/shop
npm install
npx expo start

# Delivery partner app
cd apps/delivery
npm install
npx expo start

# Admin dashboard
cd apps/admin
npm install
npm run dev
# Open http://localhost:5173
```

---

## 📁 Repository Structure

```
nearby/
├── CLAUDE.md                         ← Domain rules (READ FIRST)
├── README.md                         ← You are here
├── CONTRIBUTING.md                   ← Code review & contribution process
├── .env.example                      ← All required environment variables
├── .gitignore                        ← Excludes .env, node_modules, etc.
├── docker-compose.yml                ← Local dev services (Redis, Typesense)
│
├── backend/                          ← Node.js Express API
│   ├── src/
│   │   ├── index.js                  ← App bootstrap + Socket.IO setup
│   │   ├── routes/                   ← API endpoints by domain
│   │   │   ├── auth.js               ← OTP + JWT
│   │   │   ├── shops.js              ← Shop CRUD + KYC
│   │   │   ├── products.js           ← Product CRUD + bulk upload
│   │   │   ├── orders.js             ← Order creation + state transitions
│   │   │   ├── delivery.js           ← Delivery assignment + tracking
│   │   │   ├── payments.js           ← Cashfree integration + webhooks
│   │   │   ├── reviews.js            ← Ratings + disputes
│   │   │   ├── search.js             ← Typesense shop/product search
│   │   │   └── admin.js              ← Admin dashboard API
│   │   ├── middleware/               ← Express middleware
│   │   │   ├── auth.js               ← JWT verification
│   │   │   ├── roleGuard.js          ← Role-based access control
│   │   │   ├── rateLimit.js          ← Redis-backed rate limiting
│   │   │   └── validate.js           ← Joi schema validation
│   │   ├── services/                 ← Third-party integrations
│   │   │   ├── supabase.js           ← PostgreSQL client
│   │   │   ├── redis.js              ← Cache + pub/sub
│   │   │   ├── typesense.js          ← Search engine
│   │   │   ├── r2.js                 ← Cloudflare R2 file uploads
│   │   │   ├── cashfree.js           ← Payment processing
│   │   │   ├── msg91.js              ← OTP + SMS
│   │   │   ├── fcm.js                ← Push notifications
│   │   │   └── olaMaps.js            ← Geocoding + routing
│   │   ├── jobs/                     ← BullMQ async jobs
│   │   │   ├── notifyShop.js         ← Order notification
│   │   │   ├── assignDelivery.js     ← Find nearest delivery partner
│   │   │   ├── autoCancel.js         ← Cancel if shop doesn't respond
│   │   │   ├── trustScore.js         ← Nightly trust score recompute
│   │   │   ├── analytics.js          ← Shop analytics aggregation
│   │   │   ├── settlements.js        ← Weekly earnings summary
│   │   │   └── typesenseSync.js      ← Async search index sync
│   │   ├── socket/                   ← Socket.IO event handlers
│   │   │   ├── orderRoom.js          ← Order status updates
│   │   │   ├── gpsTracker.js         ← Delivery GPS tracking
│   │   │   └── chat.js               ← Pre-order chat
│   │   ├── utils/
│   │   │   ├── errors.js             ← Standard error codes
│   │   │   ├── idempotency.js        ← Duplicate request prevention
│   │   │   ├── logger.js             ← Winston logging
│   │   │   └── validators.js         ← Joi schemas
│   │   └── __tests__/                ← Comprehensive test suite
│   │       ├── unit/                 ← Individual function tests
│   │       └── integration/          ← API endpoint tests
│   ├── Dockerfile
│   ├── package.json
│   └── package-lock.json
│
├── apps/
│   ├── customer/                     ← Customer mobile app (React Native)
│   │   ├── src/
│   │   │   ├── screens/
│   │   │   ├── components/
│   │   │   ├── services/             ← API calls, Socket.IO
│   │   │   ├── store/                ← Zustand state management
│   │   │   └── navigation/
│   │   ├── app.json
│   │   └── package.json
│   ├── shop/                         ← Shop owner app (React Native)
│   ├── delivery/                     ← Delivery partner app (React Native)
│   └── admin/                        ← Admin dashboard (React + Vite)
│       ├── src/
│       │   ├── pages/
│       │   ├── components/
│       │   └── api/
│       └── package.json
│
├── supabase/
│   ├── README.md                     ← Database migration guide
│   └── migrations/                   ← SQL migrations (001–008)
│       ├── 001_profiles.sql          ← User profiles
│       ├── 002_shops.sql             ← Shop listings
│       ├── 003_products.sql          ← Product catalog
│       ├── 004_orders.sql            ← Order + items
│       ├── 005_reviews.sql           ← Ratings + disputes
│       ├── 006_disputes.sql          ← Conflict resolution
│       ├── 007_analytics.sql         ← Aggregated metrics
│       └── 008_rls_policies.sql      ← Row-level security
│
├── docs/
│   ├── README.md
│   ├── PRD.html                      ← Full product requirements
│   ├── API.md                        ← API endpoint reference
│   ├── ARCHITECTURE.md               ← System design overview
│   ├── FLOWS.md                      ← 20 user journey flows
│   ├── EDGE_CASES.md                 ← 15 edge case handling
│   ├── SPRINT_PLAN.md                ← 16-week build plan
│   ├── CODING_CONVENTIONS.md         ← Naming, patterns, errors
│   ├── INFRASTRUCTURE_SETUP.md       ← DigitalOcean + Coolify setup
│   ├── SERVICE_ACCOUNTS.md           ← Third-party integrations
│   ├── CI_CD_RUNBOOK.md              ← Deploy & troubleshooting
│   ├── ADR/                          ← Architecture decisions
│   │   ├── ADR-001-cashfree.md       ← Why Cashfree (not Razorpay)
│   │   ├── ADR-002-typesense.md      ← Why Typesense (not Elasticsearch)
│   │   └── ADR-003-digitalocean.md   ← Why DigitalOcean Bangalore
│   └── architecture/                 ← Detailed service architecture
│       └── 01-service-architecture.md
│
└── .github/
    └── workflows/
        ├── test.yml                  ← Run tests on PR/push
        └── deploy.yml                ← Deploy to production on merge
```

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Mobile Apps (React Native)               │
│  Customer │ Shop Owner │ Delivery Partner   Admin (Web)    │
└────────────────────────────────────────────────────────────┘
                         ↓
                    Cloudflare (DNS, SSL, CDN)
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              DigitalOcean Droplet (Bangalore)               │
│                   $24/mo (2vCPU, 4GB RAM)                  │
│                                                              │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ Node.js Express API (port 3000)                     │   │
│ │ + Socket.IO (port 3001)                             │   │
│ │ + BullMQ workers (async jobs)                       │   │
│ └──────────────┬──────────────────────────────────────┘   │
│                │                                            │
│  ┌─────────────┼─────────────┬──────────────┐             │
│  ↓             ↓             ↓              ↓              │
│ Redis     Typesense   PostgreSQL      Cloudflare R2        │
│ (Cache)   (Search)    (Supabase)      (Files)              │
│ (Queue)                                                     │
└─────────────────────────────────────────────────────────────┘
                         ↓
    ┌──────────────────┬──────────────────┬───────────────┐
    ↓                  ↓                  ↓               ↓
 Cashfree         MSG91              Firebase          Ola Maps
 (Payments)       (OTP/SMS)           (Push Notifs)    (Geo/ETA)
```

---

## 🔐 Authentication & Authorization

**OTP-based authentication (no passwords):**

1. User enters phone number
2. Backend sends 6-digit OTP via MSG91 SMS
3. User enters OTP (5-minute TTL, 3 attempts)
4. Backend issues JWT token containing:
   - `userId`, `phone`, `role` (customer|shop_owner|delivery|admin), `shopId`
5. Mobile apps store JWT in secure storage
6. Every API request includes `Authorization: Bearer {jwt}`
7. Middleware validates JWT and enforces role-based access control

**Roles:**
- `customer` — Browse shops, order, track, review
- `shop_owner` — Manage shop, accept/reject orders, inventory
- `delivery` — Accept assignments, track GPS, mark delivery
- `admin` — KYC review, disputes, monitoring, analytics

**RLS (Row-Level Security):**
- Database enforces data isolation at row level
- Customers see only their orders
- Shop owners see only their shop's orders + data
- Admins use service role key (backend only) for unrestricted access

---

## 📊 Real-Time Features

**Socket.IO Rooms:**
- `order:{orderId}` — Customer + Shop + Delivery for live order updates
- `shop:{shopId}` — New order notifications to shop owner
- `delivery:{partnerId}` — Assignment notifications to delivery partner
- `admin` — Admin monitoring dashboard

**Real-Time GPS Tracking:**
- Delivery partner sends GPS every 5 seconds
- Stored in Redis with 30-second TTL
- Broadcast to customer via Socket.IO
- ETA calculated via Ola Maps Distance Matrix API

---

## 💳 Payment Processing

**Cashfree Integration (1.75% commission):**

1. Order created with `payment_mode: upi|card|cod`
2. For online payments, backend initiates Cashfree order
3. Mobile app redirects to payment gateway
4. Webhook callback received + HMAC signature verified
5. Payment status updated in database
6. Customer notified via FCM + SMS
7. Shop notified to prepare order

**Supported Payment Methods:**
- UPI (most popular in India)
- Debit/Credit Card
- Net Banking
- Wallet (Amazon Pay, etc.)
- Cash on Delivery (COD)

---

## 📦 Search & Discovery

**Typesense (Search Engine):**

Handles full-text search + geo filtering for:
- `shops` — Searchable by name, category, rating, trust score
- `products` — Searchable by name, price range, category

**Search Queries:**
```bash
# Find shops near customer (within 3km)
GET /api/v1/search/shops?lat=17.3&lng=78.5&radius=3&query=kirana

# Find products at a shop
GET /api/v1/search/products?shop_id=123&query=milk&sort=popularity
```

**Typesense indexing:**
- Auto-synced when shop/product created or updated
- Async job ensures eventual consistency
- Handles typos + fuzzy matching automatically

---

## 🔔 Notifications

**Primary: Firebase Cloud Messaging (FCM)**
- Push notifications to mobile apps
- Works even if app is closed
- Includes title, body, and custom data

**Fallback: MSG91 SMS**
- When FCM fails or user has no device token
- OTP delivery for authentication
- Order status updates (pending, delivered, cancelled)

**Notification Types:**
- Order accepted → Customer
- Order ready for pickup → Delivery partner
- Delivery nearby → Customer
- Order delivered → Customer + Shop
- Payment received → Shop
- Dispute raised → Shop + Admin
- Trust score updated → Shop owner

---

## 🚀 Deployment

### Local Development

```bash
docker-compose up -d redis typesense
cd backend && npm run dev
```

### Production (DigitalOcean)

1. Follow [docs/INFRASTRUCTURE_SETUP.md](docs/INFRASTRUCTURE_SETUP.md) (2-3 hours)
2. Configure all services (Supabase, Cloudflare, Cashfree, MSG91, Firebase, Ola Maps)
3. Store credentials in GitHub Secrets
4. Push to `main` branch → GitHub Actions auto-deploys
5. Coolify manages Docker containers

**Zero-downtime deployments via rolling updates in Coolify.**

---

## 🧪 Testing

```bash
# All tests (unit + integration)
cd backend
npm test -- --coverage

# Run specific test file
npm test -- src/__tests__/integration/auth.test.js

# Run with watch mode
npm test -- --watch

# Coverage report
npm test -- --coverage
# Open: coverage/lcov-report/index.html
```

**Minimum coverage: 80%** for all metrics (statements, branches, functions, lines).

---

## 📖 Documentation Index

| Document | Purpose |
|----------|---------|
| [CLAUDE.md](CLAUDE.md) | Domain rules + tech stack (READ FIRST) |
| [docs/API.md](docs/API.md) | Complete API endpoint reference |
| [docs/CODING_CONVENTIONS.md](docs/CODING_CONVENTIONS.md) | Naming, patterns, errors |
| [docs/SPRINT_PLAN.md](docs/SPRINT_PLAN.md) | 16-week build roadmap |
| [docs/INFRASTRUCTURE_SETUP.md](docs/INFRASTRUCTURE_SETUP.md) | Setup DigitalOcean + Coolify |
| [docs/SERVICE_ACCOUNTS.md](docs/SERVICE_ACCOUNTS.md) | Create & manage third-party accounts |
| [docs/CI_CD_RUNBOOK.md](docs/CI_CD_RUNBOOK.md) | Deploy, monitor, rollback |
| [supabase/README.md](supabase/README.md) | Database migrations guide |
| [docs/FLOWS.md](docs/FLOWS.md) | 20 user journey flows |
| [docs/EDGE_CASES.md](docs/EDGE_CASES.md) | 15 edge case handling |

---

## 🎯 Current Status

**Sprint 5 Complete** — Delivery tracking module implemented

| Module | Status | Notes |
|--------|--------|-------|
| Backend API skeleton | ✅ | Express + Socket.IO + health checks |
| Authentication (OTP) | ✅ | Sprint 1 — Phone-only auth |
| Shop CRUD | ✅ | Sprint 2 — Create, read, update, toggle |
| Shop KYC | ✅ | Sprint 2 — Document upload to R2 |
| Products | ✅ | Sprint 2 — Create, bulk upload, update, delete |
| Search (Typesense) | ✅ | Sprint 2 — Geo search + typo tolerance |
| Orders | ✅ | Sprint 3 — Creation, state machine, auto-cancel |
| Delivery tracking | ✅ | Sprint 5 — GPS, assignment, ETA |
| Payments (Cashfree) | 🟨 | Sprint 4 — Coming next |
| Customer app | 🔲 | Sprint 7 — Pending |
| Shop app | 🔲 | Sprint 9 — Pending |
| Delivery app | 🔲 | Sprint 11 — Pending |
| Admin dashboard | 🔲 | Sprint 13 — Pending |
| KYC flow | 🔲 | Sprint 14 — Pending |
| Trust score engine | 🔲 | Sprint 15 — Pending |

See [docs/SPRINT_PLAN.md](docs/SPRINT_PLAN.md) for detailed Sprint breakdown.

---

## 🤝 Contributing

1. Read [CLAUDE.md](CLAUDE.md) (domain rules)
2. Read [CONTRIBUTING.md](CONTRIBUTING.md) (process)
3. Read [docs/CODING_CONVENTIONS.md](docs/CODING_CONVENTIONS.md)
4. Create feature branch: `git checkout -b feature/your-feature`
5. Write tests first (TDD)
6. Ensure 80%+ coverage
7. Create PR to `develop`
8. Merge to `main` after review

---

## 🆘 Support

| Issue | Reference |
|-------|-----------|
| Setup problems | [docs/SETUP.md](docs/SETUP.md) |
| API errors | [docs/API.md](docs/API.md) |
| Deployment issues | [docs/CI_CD_RUNBOOK.md](docs/CI_CD_RUNBOOK.md) |
| Database questions | [supabase/README.md](supabase/README.md) |
| Third-party integration | [docs/SERVICE_ACCOUNTS.md](docs/SERVICE_ACCOUNTS.md) |

---

## 📞 Team

- **CTO / Product**: @trinadh
- **Backend Lead**: @backend-lead
- **DevOps**: @devops-lead
- **Mobile Lead**: @mobile-lead

---

## 📄 License

NearBy is proprietary. All code © 2024 NearBy Inc.

---

## 🚀 Next Steps

1. **Setup:** Follow [Getting Started](#-getting-started-30-minutes)
2. **Read:** [CLAUDE.md](CLAUDE.md) for domain rules
3. **Contribute:** See [CONTRIBUTING.md](CONTRIBUTING.md)
4. **Deploy:** See [docs/INFRASTRUCTURE_SETUP.md](docs/INFRASTRUCTURE_SETUP.md)

---

*Last updated: April 12, 2026 — Sprint 5 delivery tracking complete*
