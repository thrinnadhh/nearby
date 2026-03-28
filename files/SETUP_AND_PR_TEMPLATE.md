# NearBy — Developer Setup Guide

> Get the full stack running locally in under 30 minutes.
> Prerequisites: Node.js 20+, Docker Desktop, Git, Expo Go app on your phone.

---

## Step 1: Clone & Configure

```bash
git clone https://github.com/nearby-app/nearby.git
cd nearby
cp .env.example .env
```

Open `.env` and fill in values. For local dev, you need:
- Supabase URL + keys (create free project at supabase.com)
- Cloudflare R2 keys (create free account, create 2 buckets)
- MSG91 key (create account, get sandbox key for dev)
- Firebase project credentials (create project, download google-services.json)
- Ola Maps API key (register at maps.olacabs.com/devportal)
- Cashfree sandbox credentials (create account, use TEST mode)

```bash
# Verify your .env is complete
node -e "require('dotenv').config(); const required = ['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','REDIS_URL','TYPESENSE_API_KEY','CASHFREE_APP_ID','MSG91_AUTH_KEY','OLA_MAPS_API_KEY']; required.forEach(k => { if (!process.env[k]) console.error('MISSING:', k); });"
```

---

## Step 2: Start Backend Services

```bash
# Start Redis + Typesense (Docker)
docker-compose up -d redis typesense

# Verify they're running
docker-compose ps

# Check Redis
docker exec -it nearby_redis redis-cli PING
# Expected: PONG

# Check Typesense
curl http://localhost:8108/health
# Expected: {"ok":true}
```

---

## Step 3: Set Up Supabase

```bash
# Install Supabase CLI
npm install -g supabase

# Log in
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run all migrations
supabase db push

# Verify tables created
supabase db diff  # Should show no differences
```

Alternatively, paste migration files manually in Supabase SQL editor (Dashboard → SQL Editor).

---

## Step 4: Start the Backend API

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

Test it:
```bash
curl http://localhost:3000/health
# Expected: {"status":"ok","version":"1.0.0"}
```

---

## Step 5: Seed Test Data

```bash
cd backend
npm run seed

# This creates:
# - 1 admin user (phone: +91-9999999999, OTP: 123456 hardcoded in dev)
# - 3 test shops (all verified, with products)
# - 5 test delivery partners (all approved)
# - 10 test customers
```

---

## Step 6: Start the Apps

### Customer App
```bash
cd apps/customer
npm install
npx expo start

# Scan QR code with Expo Go app on your phone
# OR press 'a' for Android emulator, 'i' for iOS simulator
```

### Shop Owner App
```bash
cd apps/shop
npm install
npx expo start --port 8082
```

### Delivery App
```bash
cd apps/delivery
npm install
npx expo start --port 8083
```

### Admin Dashboard
```bash
cd apps/admin
npm install
npm run dev
# Open http://localhost:5173
```

---

## Step 7: Verify Everything Works

Run through this quick test:
1. Open customer app → Login with test phone `+91-9000000001` → OTP `111111` (dev mode)
2. Search for "tomatoes" → Should see test shop results
3. Open admin dashboard → `localhost:5173` → Login as admin
4. Open shop app → Login as shop owner `+91-9000000002` → OTP `222222`

---

## Common Issues

### "Cannot connect to Redis"
```bash
docker-compose restart redis
# Check if port 6379 is occupied
lsof -i :6379
```

### "Typesense collection not found"
```bash
# Recreate indexes
cd backend && npm run seed:typesense
```

### "Supabase RLS blocking queries"
In dev, you can temporarily disable RLS in Supabase dashboard → Table Editor → your table → RLS toggle. Remember to re-enable before testing auth flows.

### "FCM push not working in dev"
This is expected — FCM doesn't work in Expo Go without a development build. Use the Expo simulator or create a development build:
```bash
npx expo run:android  # or run:ios
```

### "OTP not arriving"
In development mode (`NODE_ENV=development`), OTP is always `123456` and SMS is not actually sent. Check console logs for "DEV MODE OTP: 123456".

---

## Environment Variables Reference

```bash
# ===== SERVER =====
NODE_ENV=development
PORT=3000
SOCKET_PORT=3001

# ===== SUPABASE =====
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...          # Client-safe key
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # SERVER ONLY - never expose to client

# ===== REDIS =====
REDIS_URL=redis://localhost:6379

# ===== TYPESENSE =====
TYPESENSE_HOST=localhost
TYPESENSE_PORT=8108
TYPESENSE_PROTOCOL=http
TYPESENSE_API_KEY=xyz123           # Any string for local dev

# ===== CLOUDFLARE R2 =====
R2_ACCOUNT_ID=abc123
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_PUBLIC=nearby-products
R2_BUCKET_PRIVATE=nearby-kyc
R2_PUBLIC_URL=https://pub-xxx.r2.dev

# ===== CASHFREE =====
CASHFREE_APP_ID=xxx
CASHFREE_SECRET_KEY=xxx
CASHFREE_ENV=TEST                  # TEST or PROD
CASHFREE_WEBHOOK_SECRET=xxx

# ===== MSG91 =====
MSG91_AUTH_KEY=xxx
MSG91_TEMPLATE_OTP=xxx             # DLT approved template ID
MSG91_SENDER_ID=NEARBY

# ===== FIREBASE =====
FIREBASE_PROJECT_ID=nearby-app-xxx
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@nearby-app.iam.gserviceaccount.com

# ===== OLA MAPS =====
OLA_MAPS_API_KEY=xxx

# ===== JWT =====
JWT_SECRET=your-256-bit-random-string-here
JWT_REFRESH_SECRET=another-256-bit-random-string
JWT_EXPIRY=30d
JWT_REFRESH_EXPIRY=90d

# ===== APP CONFIG =====
OTP_TTL_SECONDS=300
OTP_MAX_ATTEMPTS=3
ORDER_ACCEPT_WINDOW_SECONDS=180
DELIVERY_ASSIGNMENT_RADIUS_KM=3
COMMISSION_RATE=0.06

# ===== REACT NATIVE (apps/.env) =====
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:3000/api/v1
EXPO_PUBLIC_SOCKET_URL=http://YOUR_LOCAL_IP:3001
# Note: Use your machine's local IP (not localhost) for phone testing
# Find it: ipconfig (Windows) / ifconfig (Mac/Linux)
```

---
---

# Pull Request Template

*Save as `.github/PULL_REQUEST_TEMPLATE.md` in the repo*

```markdown
## What does this PR do?

<!-- One paragraph description of the change and WHY it was needed -->

## Type of change

- [ ] New feature
- [ ] Bug fix
- [ ] Security fix
- [ ] Documentation update
- [ ] Refactor (no behaviour change)
- [ ] Performance improvement

## Sprint / Task reference

Sprint: __  Task: __  (from SPRINT_PLAN.md)

## How was this tested?

- [ ] Unit tests written and passing
- [ ] Manual test on device / Postman
- [ ] Edge case from EDGE_CASES.md tested: ___________

## Security checklist (required for backend PRs)

- [ ] No secrets or API keys in code
- [ ] Order total calculated server-side (not from client)
- [ ] Cashfree webhook verifies HMAC
- [ ] JWT + roleGuard applied to new endpoints
- [ ] Input validated with Joi
- [ ] Rate limiting applied if needed
- [ ] Supabase RLS not bypassed

## Screenshots / screen recordings

<!-- For UI changes: before/after screenshots or a 30-second screen recording -->

## Database changes

- [ ] No DB changes
- [ ] New migration file added (`supabase/migrations/XXX_name.sql`)
- [ ] RLS policies updated if needed
- [ ] Indexes added for new query patterns

## Breaking changes

- [ ] No breaking changes
- [ ] Breaking change — describe impact and migration: ___________

## Reviewer focus areas

<!-- Tell the reviewer where to pay most attention -->
```

---

*Last updated: March 2026*
