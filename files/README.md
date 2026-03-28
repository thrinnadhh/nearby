# NearBy — Hyperlocal Trust Commerce Platform

> Connecting customers with verified local shops. Supporting neighbourhood economies.

[![Status](https://img.shields.io/badge/status-pre--development-orange)]()
[![Stack](https://img.shields.io/badge/stack-Node.js%20%7C%20React%20Native%20%7C%20Supabase-blue)]()
[![Hosting](https://img.shields.io/badge/hosting-DigitalOcean%20Bangalore-0080ff)]()

---

## What is NearBy?

NearBy is a hyperlocal super app that empowers local shops — kirana stores, vegetable vendors,
pharmacies, restaurants, pet stores, mobile shops, and furniture stores — with digital ordering,
live tracking, and trust infrastructure. Unlike dark stores that replace local shops,
NearBy digitises and amplifies them.

**Every order placed = income for a real shopkeeper in your neighbourhood.**

---

## Quick Links

| Document | Location |
|----------|----------|
| 🧠 AI Context File | [`CLAUDE.md`](./CLAUDE.md) — Read this first |
| 📋 Full PRD | [`docs/PRD.html`](./docs/PRD.html) |
| 🏗️ Architecture | [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) |
| 🗺️ Sprint Plan | [`docs/SPRINT_PLAN.md`](./docs/SPRINT_PLAN.md) |
| 🔌 API Reference | [`docs/API.md`](./docs/API.md) |
| ⚠️ Edge Cases | [`docs/EDGE_CASES.md`](./docs/EDGE_CASES.md) |
| 🏛️ Decision Log | [`docs/ADR/`](./docs/ADR/) |
| 🔧 Setup Guide | [`docs/SETUP.md`](./docs/SETUP.md) |
| 📝 Coding Guide | [`docs/CODING_CONVENTIONS.md`](./docs/CODING_CONVENTIONS.md) |

---

## Repository Structure

```
nearby/
├── CLAUDE.md           ← AI assistant context — ALWAYS read first
├── README.md           ← This file
├── docker-compose.yml  ← Full local dev environment
├── .env.example        ← Required environment variables
├── apps/
│   ├── customer/       ← React Native customer app
│   ├── shop/           ← React Native shop owner app
│   ├── delivery/       ← React Native delivery partner app
│   └── admin/          ← React + Vite admin web dashboard
├── backend/            ← Node.js + Express API server
├── supabase/
│   └── migrations/     ← SQL migration files
└── docs/               ← All project documentation
```

---

## Four Apps, One Platform

| App | Users | Tech |
|-----|-------|------|
| **Customer** | End customers | React Native + Expo |
| **Shop Owner** | Kirana, pharmacy, etc. | React Native + Expo |
| **Delivery Partner** | Local gig workers | React Native + Expo |
| **Admin Dashboard** | NearBy ops team | React + Vite (web) |

---

## Tech Stack at a Glance

```
Backend:     Node.js + Express + Socket.IO
Database:    Supabase (PostgreSQL + PostGIS)
Cache/Queue: Redis + BullMQ (self-hosted)
Search:      Typesense (self-hosted)
Storage:     Cloudflare R2
Payments:    Cashfree
SMS:         MSG91
Push:        Firebase FCM
Maps:        Ola Maps
Hosting:     DigitalOcean Bangalore ($24/mo)
Deploy:      Coolify + Docker
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- Docker + Docker Compose
- Expo CLI (`npm install -g expo-cli`)
- Supabase CLI (`npm install -g supabase`)

### Local Development Setup

```bash
# 1. Clone the repo
git clone https://github.com/nearby-app/nearby.git
cd nearby

# 2. Copy env file and fill in values
cp .env.example .env
# Edit .env with your API keys (see docs/SETUP.md for full guide)

# 3. Start backend services (Redis, Typesense, Node API)
docker-compose up -d

# 4. Run Supabase migrations
cd supabase && supabase db push

# 5. Start the backend API
cd backend && npm install && npm run dev

# 6. Start the customer app (in a new terminal)
cd apps/customer && npm install && npx expo start

# 7. Open admin dashboard (in a new terminal)
cd apps/admin && npm install && npm run dev
```

See [`docs/SETUP.md`](./docs/SETUP.md) for the complete step-by-step guide.

---

## Branch Strategy

```
main          ← Production. Protected. Requires 2 reviews + CI pass.
staging       ← Pre-production testing. Deploy to staging DO droplet.
develop       ← Integration branch. All features merge here first.
feature/*     ← Feature branches (e.g., feature/order-flow)
fix/*         ← Bug fixes (e.g., fix/otp-lockout-redis)
hotfix/*      ← Production hotfixes (merge to main + develop)
chore/*       ← Non-code changes (e.g., chore/update-readme)
```

## Commit Convention

```
feat(orders): add 3-minute auto-cancel job
fix(auth): correct OTP retry count in Redis
docs(api): update order endpoint response schema
chore(deps): upgrade express to 4.19.2
refactor(jobs): extract notification logic to service
test(payments): add Cashfree webhook HMAC tests
```

---

## Current Sprint

**Sprint: Pre-development setup** — See [`docs/SPRINT_PLAN.md`](./docs/SPRINT_PLAN.md) for full 16-week plan.

---

## Contributing

1. Read `CLAUDE.md` — understanding the full context is mandatory before any PR
2. Check `docs/SPRINT_PLAN.md` — pick a task from the current sprint
3. Create branch: `feature/your-feature-name`
4. Follow conventions in `docs/CODING_CONVENTIONS.md`
5. Write tests for all business logic
6. Submit PR using the PR template (`.github/PULL_REQUEST_TEMPLATE.md`)
7. Requires 1 review minimum before merge to `develop`

---

## Monthly Cost (V1)

| Service | Cost |
|---------|------|
| DigitalOcean (2vCPU/4GB, Bangalore) | $24/mo |
| Supabase (free tier → Pro when needed) | $0 → $25/mo |
| Cloudflare R2 (files + CDN) | Free |
| MSG91 (OTP SMS) | ₹300/mo |
| Firebase FCM (push) | Free |
| Ola Maps (1M free calls) | Free |
| **Total V1** | **~₹2,400/mo** |

---

## License

Proprietary — NearBy Technologies Pvt. Ltd. © 2026
