# Architecture Decision Records (ADR)

> Every significant technical decision is recorded here with its context, options considered,
> decision made, and consequences. This prevents the same debates from happening twice and
> gives future team members (and AI assistants) the full reasoning.

**Format:** Each ADR has a number, status, context, decision, and consequences.
**Status options:** Proposed | Accepted | Deprecated | Superseded by ADR-XXX

---

## ADR-001: Cashfree over Razorpay for payments

**Status:** Accepted
**Date:** March 2026

### Context
We need a payment gateway for UPI, card payments, and merchant settlements. Two primary options in India: Razorpay and Cashfree.

### Options Considered

| Factor | Razorpay | Cashfree |
|--------|----------|----------|
| Transaction fee | 2% | 1.75% |
| Settlement T+ | T+2 | T+1 |
| Split payment API | Available (Route) | Better marketplace API |
| React Native SDK | Good | Good |
| India UPI support | Excellent | Excellent |
| Developer docs | Excellent | Good |
| Brand recognition | Higher | Lower |

### Decision
**Cashfree.** At 500 orders/day × ₹400 avg order, the 0.25% difference = ₹500/day saved = ₹15,000/month. Over a year, that's ₹1.8 lakh. T+1 settlement is better for shop owner cash flow vs T+2. Cashfree's marketplace/split API is better suited for our model where we need to split payments between NearBy commission and shop earnings.

### Consequences
- Positive: Lower commission, better settlement speed, better split payments
- Negative: Razorpay has stronger developer community and more tutorials
- Risk: Cashfree's React Native SDK is slightly less mature — mitigated by wrapping in a service layer
- Decision cannot be changed mid-V1 without significant migration effort

---

## ADR-002: Typesense over Elasticsearch for search

**Status:** Accepted
**Date:** March 2026

### Context
We need geo-search (shops within Xkm), full-text product search, category filtering, and ranking by trust score. Options: Elasticsearch, Typesense, Meilisearch, Algolia, or PostgreSQL full-text search.

### Options Considered

| Factor | Elasticsearch | Typesense | Meilisearch | PG full-text |
|--------|--------------|-----------|-------------|-------------|
| Geo search | Excellent | Good | Basic | Limited |
| Setup complexity | High (2+ nodes) | Single binary | Single binary | None |
| RAM requirement | 4GB+ | 500MB | 500MB | None |
| Typo tolerance | Good | Excellent | Excellent | None |
| Self-host cost | Extra server | Same server | Same server | None |
| India latency | Depends | Localhost | Localhost | Localhost |

### Decision
**Typesense.** Runs as a single Docker container alongside our API on the same DigitalOcean droplet (no extra server cost). 500MB RAM usage leaves plenty on our 4GB droplet. Excellent typo tolerance out of the box (critical for product name search in India where spelling varies). Geo search good enough for our 3km radius use case. Will switch to Elasticsearch only if we need more than 1M product records (V3 problem).

### Consequences
- Positive: No extra server cost, simple ops, fast local queries
- Negative: Less powerful geo queries than Elasticsearch
- Risk: If we need complex aggregations or analytics queries, Typesense won't support them — use Supabase for that
- Upgrade path: Typesense → Elasticsearch is straightforward (similar API concepts)

---

## ADR-003: DigitalOcean Bangalore over AWS for hosting

**Status:** Accepted
**Date:** March 2026

### Context
We need a cloud server for our Node.js API, Redis, Typesense, and admin dashboard. Options: AWS Mumbai, DigitalOcean Bangalore, Hetzner (no India DC), Render, Railway.

### Decision
**DigitalOcean Bangalore.** India datacenter = 10ms latency for Hyderabad users vs 160ms from European servers. $24/mo for 2vCPU/4GB vs ₹8,000+ for equivalent AWS EC2 + RDS + ElastiCache. Coolify makes container management as simple as Heroku without the cost. DigitalOcean includes 2TB bandwidth free — we'd never exceed this in V1.

### Consequences
- Positive: Low latency, predictable pricing, included bandwidth, simple ops
- Negative: Less managed services than AWS (no Aurora, no EKS, etc.)
- Risk: Single-server architecture — mitigated by Coolify snapshots + DO Spaces backups
- Upgrade path: Scale vertically (resize droplet) before scaling horizontally (multiple droplets)

---

## ADR-004: Cloudflare R2 over AWS S3 for file storage

**Status:** Accepted
**Date:** March 2026

### Context
We need to store product images (public), KYC documents (private), and serve images via CDN. Options: AWS S3 + CloudFront, Cloudflare R2, Supabase Storage, Backblaze B2.

### Decision
**Cloudflare R2.** Zero egress fees — AWS S3 charges ~$0.09/GB for downloads. At 1,000 customers viewing 20 products each with 2 images = 40,000 image downloads/day. AWS charges: 40,000 × 200KB = 8GB/day × 30 = 240GB/month × $0.09 = $21.60/month just in egress. R2 charges: $0. Free tier: 10GB storage + 1M reads/month. S3-compatible API means we can use the AWS SDK with just an endpoint change.

### Consequences
- Positive: Zero egress, free CDN via Cloudflare, S3-compatible API
- Negative: Cloudflare R2 is newer than S3 — fewer community resources
- Private bucket signed URLs: 5-minute TTL for KYC docs (security requirement)
- Upgrade path: R2 → S3 migration requires only endpoint + auth key change

---

## ADR-005: Supabase over self-hosted PostgreSQL

**Status:** Accepted
**Date:** March 2026

### Context
We need PostgreSQL with PostGIS (for geo queries), daily backups, connection pooling, and ideally Row Level Security. Options: Self-hosted PG on droplet, Supabase managed, PlanetScale, Neon.

### Decision
**Supabase.** Free tier covers V1 (500MB, 50k MAUs). Pro is $25/mo for V2. Built-in RLS means even if our API has a bug, cross-user data access is impossible at DB level — critical for a platform handling financial data. Auto-generated REST API useful for admin dashboard. Daily automated backups with no configuration. PostGIS supported out of the box for geo radius queries.

### Consequences
- Positive: Managed backups, RLS, PostGIS, free tier, connection pooling (PgBouncer built-in)
- Negative: Vendor dependency — hard to self-host Supabase
- Risk: If Supabase pricing changes dramatically, migration to self-hosted PG is possible but painful
- Critical: Never use Supabase anon key on the server. Use service_role key only. Anon key is client-only.

---

## ADR-006: Socket.IO for real-time over native WebSocket

**Status:** Accepted
**Date:** March 2026

### Context
We need real-time for three things: GPS delivery tracking (every 5s), order status updates, and pre-order chat. Options: Native WebSocket, Socket.IO, Supabase Realtime, Ably, Pusher.

### Decision
**Socket.IO.** Built-in rooms — `order:{orderId}` means only the relevant customer + shop + delivery partner receive updates for that order. Fallback to long-polling if WebSocket blocked (corporate networks, some mobile networks in India). React Native SDK available. Runs on same Node.js process as API (same port, different path). Supabase Realtime considered but adds complexity for GPS (very frequent updates would hit Supabase row change events — inefficient).

### Consequences
- Positive: Room abstraction, fallback support, same server as API
- Negative: Stateful — harder to scale horizontally (need Redis adapter for multi-server)
- Risk: When scaling to multiple servers (V3), add Socket.IO Redis adapter (`@socket.io/redis-adapter`)
- GPS stored in Redis (not Supabase) — lightweight, auto-expires, fast

---

## ADR-007: MSG91 over Twilio for SMS

**Status:** Accepted
**Date:** March 2026

### Context
We need SMS for OTP delivery and critical order alerts to shop owners. Both MSG91 and Twilio are reliable.

### Decision
**MSG91.** ₹0.18 per SMS vs ₹2.50 per SMS for Twilio India. At 10,000 OTPs/month: MSG91 = ₹1,800, Twilio = ₹25,000. MSG91 is DLT-compliant (mandatory for India — all commercial SMS must be DLT registered). Indian company, faster support, better India routing. Twilio is better for global reach — irrelevant for V1 (Hyderabad only).

### Consequences
- Positive: 93% cost reduction vs Twilio, DLT compliant, faster India delivery
- Negative: Less developer-friendly API than Twilio, fewer code examples online
- Risk: If MSG91 has outage, add Gupshup as backup (V2)
- Action: DLT registration takes 2–3 business days — start immediately, not week of launch

---

## ADR-008: Ola Maps over Google Maps

**Status:** Accepted
**Date:** March 2026

### Context
We need geocoding (address → lat/lng for shop registration), routing (ETA for delivery tracking), and map tiles for the customer tracking screen. Google Maps Platform is the default but expensive.

### Decision
**Ola Maps API.** 1 million free API calls per month. Google Maps charges ₹800 per 1,000 geocoding calls — at 500 orders/day that's 500 geocode calls/day = 15,000/month = ₹12,000/month just for geocoding. Ola Maps free tier covers 1M calls — we'd need 33,000 orders/day before paying. Better India-specific address data than OpenStreetMap (Nominatim). Map tiles via Leaflet.js + OpenStreetMap (free).

### Consequences
- Positive: Free for V1 and V2, better India address data
- Negative: Less documentation than Google Maps, newer product
- Map rendering: Leaflet.js + OpenStreetMap tiles (free) — not Ola Maps tiles
- Upgrade path: Ola Maps → Google Maps requires only API key and endpoint change in `olaMaps.js` service

---

## ADR-009: BullMQ over direct async processing

**Status:** Accepted
**Date:** March 2026

### Context
Several operations need to happen asynchronously: notify shop when order placed, auto-cancel if shop doesn't respond, recompute trust score nightly. Options: Direct async in request handler, BullMQ, Agenda, simple cron.

### Decision
**BullMQ.** Critical requirement: the auto-cancel job must fire exactly 3 minutes after order creation, even if the server restarts. BullMQ with Redis persistence guarantees this. Direct async would lose the job on restart. Delayed jobs (BullMQ) are exactly right for the 3-minute timer. Scheduled jobs (cron-like) for nightly trust score. Dead-letter queue for failed jobs with alerting.

### Consequences
- Positive: Persistent jobs (survive restart), delayed jobs, retry logic, dead-letter queue
- Negative: Redis dependency (but we already use Redis for sessions/cache)
- All critical flows (notify, cancel, assign delivery) go through BullMQ — never direct async in request
- Monitor dead-letter queue in Grafana — failed jobs there need attention

---

## ADR-010: Monorepo structure for all apps

**Status:** Accepted
**Date:** March 2026

### Context
We have 4 apps (customer RN, shop RN, delivery RN, admin web) + 1 backend. Options: One repo per app, monorepo with Turborepo/Nx, simple monorepo with folders.

### Decision
**Simple monorepo (single GitHub repo, folder-based).** Turborepo/Nx adds complexity we don't need at V1 (2-person mobile team). Shared components library possible as `packages/ui/`. Single repo means: one PR can update backend + frontend together, easier for AI assistants to understand the full system, simpler CI/CD with Coolify.

### Consequences
- Positive: Simple, easy for small team, AI assistants see full context
- Negative: All devs clone entire codebase including apps they don't work on
- CI: GitHub Actions matrix to run tests for changed apps only
- Upgrade path: Extract to separate repos if team grows beyond 8 people

---

*Add new ADRs at the bottom. Never delete or modify accepted ADRs — create a superseding ADR instead.*
*Last updated: March 2026*
