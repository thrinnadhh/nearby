# NearBy — GitHub Repository Structure & Git Workflow

## Repository Layout on GitHub

```
GitHub Org: nearby-app
├── nearby/                  ← Main monorepo (this document)
├── nearby-design/           ← Figma exports, brand assets (separate repo)
└── nearby-infra/            ← Terraform/IaC for DO setup (if needed)
```

---

## Full File Tree (Create These Before Writing Code)

Run this to scaffold the entire structure:

```bash
#!/bin/bash
# run: bash scaffold.sh

mkdir -p nearby/{apps/{customer,shop,delivery,admin}/src,backend/src/{routes,middleware,services,jobs,socket,utils},supabase/migrations,docs/ADR,.github/workflows}

# Root files
touch nearby/{CLAUDE.md,README.md,docker-compose.yml,.env.example,.gitignore,.eslintrc.js}

# GitHub files
touch nearby/.github/{PULL_REQUEST_TEMPLATE.md,workflows/ci.yml}

# Docs
touch nearby/docs/{ARCHITECTURE.md,API.md,FLOWS.md,EDGE_CASES.md,SPRINT_PLAN.md,SETUP.md,CODING_CONVENTIONS.md}
touch nearby/docs/ADR/{ADR-001-cashfree.md,ADR-002-typesense.md,ADR-003-digitalocean.md,ADR-004-r2.md,ADR-005-supabase.md,ADR-006-socketio.md,ADR-007-msg91.md,ADR-008-ola-maps.md,ADR-009-bullmq.md,ADR-010-monorepo.md}

# Backend
touch nearby/backend/src/{index.js,package.json,Dockerfile}
touch nearby/backend/src/routes/{auth.js,shops.js,products.js,orders.js,delivery.js,payments.js,reviews.js,search.js,admin.js}
touch nearby/backend/src/middleware/{auth.js,roleGuard.js,rateLimit.js,validate.js,errorHandler.js}
touch nearby/backend/src/services/{supabase.js,redis.js,typesense.js,r2.js,cashfree.js,msg91.js,fcm.js,olaMaps.js}
touch nearby/backend/src/jobs/{notifyShop.js,assignDelivery.js,autoCancel.js,notifyCustomer.js,trustScore.js,analyticsAggregate.js,earningsSummary.js,worker.js}
touch nearby/backend/src/socket/{orderRoom.js,gpsTracker.js,chat.js,index.js}
touch nearby/backend/src/utils/{errors.js,response.js,idempotency.js,logger.js,validators.js}

# Supabase migrations
touch nearby/supabase/migrations/{001_profiles.sql,002_shops.sql,003_products.sql,004_orders.sql,005_order_items.sql,006_reviews.sql,007_disputes.sql,008_analytics.sql,009_rls_policies.sql}

echo "✅ Structure scaffolded. Now git init and push."
```

---

## Branch Protection Rules (Set in GitHub Settings)

### `main` branch
- Require 2 approving reviews
- Require status checks to pass (CI tests)
- Require branches to be up to date before merging
- Restrict who can push: only project leads
- No force pushes

### `staging` branch
- Require 1 approving review
- Require status checks to pass
- Auto-deploy to staging DO droplet on merge

### `develop` branch
- Require 1 approving review
- Require status checks to pass
- All feature branches merge here

---

## Branch Naming Convention

```
feature/CA-07-cart-management          ← CA = Customer App, task number from sprint
feature/SA-03-order-inbox              ← SA = Shop App
feature/DA-04-navigation               ← DA = Delivery App
feature/BE-order-auto-cancel           ← BE = Backend
feature/AD-kyc-review-queue            ← AD = Admin Dashboard

fix/otp-lockout-not-clearing           ← Bug fixes
fix/cashfree-webhook-duplicate

hotfix/payment-webhook-hmac            ← Production emergencies only

chore/update-dependencies
chore/add-eslint-rules

docs/add-adr-011                       ← Documentation
```

---

## GitHub Actions CI Pipeline

Save as `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [develop, staging, main]
  pull_request:
    branches: [develop, staging, main]

jobs:
  backend-test:
    runs-on: ubuntu-latest
    name: Backend Tests
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: backend/package-lock.json
      - name: Install
        run: cd backend && npm ci
      - name: Lint
        run: cd backend && npm run lint
      - name: Type check
        run: cd backend && npm run typecheck
      - name: Test
        run: cd backend && npm test
        env:
          NODE_ENV: test
          REDIS_URL: redis://localhost:6379
          SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.TEST_SUPABASE_KEY }}

    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

  customer-app-check:
    runs-on: ubuntu-latest
    name: Customer App TypeScript Check
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: cd apps/customer && npm ci
      - run: cd apps/customer && npm run typecheck

  admin-check:
    runs-on: ubuntu-latest
    name: Admin Dashboard Check
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: cd apps/admin && npm ci
      - run: cd apps/admin && npm run build

  deploy-staging:
    runs-on: ubuntu-latest
    needs: [backend-test, customer-app-check, admin-check]
    if: github.ref == 'refs/heads/staging'
    name: Deploy to Staging
    steps:
      - uses: actions/checkout@v4
      - name: Deploy via Coolify webhook
        run: |
          curl -X POST ${{ secrets.COOLIFY_STAGING_WEBHOOK }} \
            -H "Authorization: Bearer ${{ secrets.COOLIFY_TOKEN }}"
```

---

## Docker Compose (Local Dev)

Save as `docker-compose.yml` in repo root:

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: nearby_redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  typesense:
    image: typesense/typesense:0.25.2
    container_name: nearby_typesense
    ports:
      - "8108:8108"
    volumes:
      - typesense_data:/data
    command: --data-dir /data --api-key=xyz123 --enable-cors

  api:
    build: ./backend
    container_name: nearby_api
    ports:
      - "3000:3000"
      - "3001:3001"
    volumes:
      - ./backend:/app
      - /app/node_modules
    environment:
      NODE_ENV: development
      REDIS_URL: redis://redis:6379
      TYPESENSE_HOST: typesense
    env_file: .env
    depends_on:
      - redis
      - typesense
    command: npm run dev

volumes:
  redis_data:
  typesense_data:
```

---

## .gitignore

```gitignore
# Dependencies
node_modules/
.expo/
.expo-shared/

# Environment
.env
.env.local
.env.*.local
!.env.example

# Build outputs
dist/
build/
.next/
out/

# Supabase
.supabase/

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Android / iOS
android/
ios/
*.jks
*.keystore
*.p8
*.p12
*.mobileprovision
*.orig.*

# Editor
.vscode/settings.json
.idea/
*.swp

# Testing
coverage/
.nyc_output/

# Temp
tmp/
temp/
```

---

## GitHub Issues Labels

Set up these labels in your GitHub repo:

| Label | Color | Description |
|-------|-------|-------------|
| `sprint:1` through `sprint:16` | Blue shades | Which sprint this belongs to |
| `type:feature` | Green | New functionality |
| `type:bug` | Red | Something broken |
| `type:security` | Dark red | Security issue — treat as P0 |
| `type:docs` | Light blue | Documentation |
| `app:customer` | Purple | Customer app |
| `app:shop` | Orange | Shop owner app |
| `app:delivery` | Coral | Delivery app |
| `app:admin` | Teal | Admin dashboard |
| `app:backend` | Gray | Backend API |
| `priority:P0` | Red | Production fire — fix immediately |
| `priority:P1` | Orange | Fix this sprint |
| `priority:P2` | Yellow | Fix next sprint |
| `priority:P3` | Green | Nice to have |
| `blocked` | Black | Waiting on something else |
| `needs-review` | Yellow-green | Ready for code review |

---

## Issue Template

Save as `.github/ISSUE_TEMPLATE/bug_report.md`:

```markdown
---
name: Bug Report
about: Something isn't working correctly
labels: type:bug
---

## Describe the bug
A clear description of what the bug is.

## Which app / module
- [ ] Customer app
- [ ] Shop owner app
- [ ] Delivery app
- [ ] Admin dashboard
- [ ] Backend API

## Steps to Reproduce
1. Go to '...'
2. Tap on '...'
3. See error

## Expected behaviour
What should have happened.

## Actual behaviour
What actually happened.

## Screenshots / Logs
If applicable, add screenshots or copy the error from logs.

## Environment
- Device: (e.g., Samsung Galaxy A32)
- OS: (e.g., Android 12)
- App version:
- Network: (WiFi / 4G / 3G)

## Sprint context
Sprint: __  (from SPRINT_PLAN.md)
```

---

## Weekly Git Ritual (Friday EOD)

```bash
# 1. Make sure develop is up to date
git checkout develop
git pull origin develop

# 2. Update SPRINT_PLAN.md — mark completed tasks ✅
# 3. Update CLAUDE.md — update "Current Build Status" table
# 4. Commit the updates
git add docs/SPRINT_PLAN.md CLAUDE.md
git commit -m "chore(sprint): update sprint progress - Sprint X, Week Y"
git push origin develop

# 5. If Sprint N is complete, merge develop → staging for testing
git checkout staging
git merge develop
git push origin staging
```

---

*Last updated: March 2026*
