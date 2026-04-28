# Sprint 15 Execution

Sprint 15 is launch-readiness work. Some parts are now implemented as repo assets, while others still require manual execution on real devices, real stores, and live infrastructure.

## Completed In Repo

### 15.4 Load Test: 100 Concurrent Orders

Backend script:
- [loadTestOrders.js](/Users/trinadh/projects/nearby/backend/src/scripts/loadTestOrders.js)

Run it:

```bash
cd /Users/trinadh/projects/nearby/backend
LOAD_TEST_BASE_URL=http://localhost:3000 \
LOAD_TEST_TOKEN=customer_jwt_here \
LOAD_TEST_SHOP_ID=shop_uuid_here \
LOAD_TEST_PRODUCT_ID=product_uuid_here \
LOAD_TEST_REQUESTS=100 \
LOAD_TEST_CONCURRENCY=20 \
npm run loadtest:orders
```

Use `LOAD_TEST_TOKENS=token1,token2,...` when you want to spread requests across multiple customer accounts.

### Automated E2E Smoke Flow

Critical flow runner:
- [e2eCriticalFlow.js](/Users/trinadh/projects/nearby/backend/src/scripts/e2eCriticalFlow.js)

Run it against a live local or staging backend:

```bash
cd /Users/trinadh/projects/nearby/backend
E2E_BASE_URL=http://localhost:3000 \
E2E_CUSTOMER_TOKEN=customer_jwt_here \
E2E_SHOP_TOKEN=shop_owner_jwt_here \
E2E_ADMIN_TOKEN=admin_jwt_here \
npm run test:e2e:critical
```

What it verifies:
- `/health`, `/readiness`, `/metrics`
- shop discovery through `/search/shops`
- product discovery through `/search/products`
- customer order creation and detail fetch
- payment initiation for prepaid orders
- optional shop accept/ready flow
- optional admin live-order visibility

### 15.8 Grafana Dashboards + Alerts

Monitoring stack and provisioning:
- [docker-compose.yml](/Users/trinadh/projects/nearby/docker-compose.yml)
- [prometheus.yml](/Users/trinadh/projects/nearby/ops/monitoring/prometheus.yml)
- [alert.rules.yml](/Users/trinadh/projects/nearby/ops/monitoring/alert.rules.yml)
- [prometheus.yml](/Users/trinadh/projects/nearby/ops/monitoring/grafana/provisioning/datasources/prometheus.yml)
- [dashboards.yml](/Users/trinadh/projects/nearby/ops/monitoring/grafana/provisioning/dashboards/dashboards.yml)
- [nearby-overview.json](/Users/trinadh/projects/nearby/ops/monitoring/grafana/dashboards/nearby-overview.json)

Start it:

```bash
docker compose up -d prometheus grafana node-exporter cadvisor
```

Available endpoints:
- Grafana: `http://localhost:3004`
- Prometheus: `http://localhost:9090`
- API metrics: `http://localhost:3000/metrics`

### 15.9 Weekly Snapshot Backup

Backup automation assets:
- [create_droplet_snapshot.sh](/Users/trinadh/projects/nearby/ops/backup/create_droplet_snapshot.sh)
- [verify_backup_readiness.sh](/Users/trinadh/projects/nearby/ops/backup/verify_backup_readiness.sh)
- [weekly_snapshot.cron](/Users/trinadh/projects/nearby/ops/backup/weekly_snapshot.cron)

Before enabling the cron job:
- install `doctl`
- authenticate `doctl auth init`
- set `DO_DROPLET_ID` or `DO_DROPLET_NAME`

### 15.11 Expo OTA Update Configuration

OTA/release config added for all three apps:
- [apps/customer/app.json](/Users/trinadh/projects/nearby/apps/customer/app.json)
- [apps/customer/eas.json](/Users/trinadh/projects/nearby/apps/customer/eas.json)
- [apps/shop/app.json](/Users/trinadh/projects/nearby/apps/shop/app.json)
- [apps/shop/eas.json](/Users/trinadh/projects/nearby/apps/shop/eas.json)
- [apps/delivery/app.json](/Users/trinadh/projects/nearby/apps/delivery/app.json)
- [apps/delivery/eas.json](/Users/trinadh/projects/nearby/apps/delivery/eas.json)

Next commands after Expo project IDs are finalized:

```bash
cd /Users/trinadh/projects/nearby/apps/customer && eas build --platform android --profile production
cd /Users/trinadh/projects/nearby/apps/customer && eas update --branch production --message "Launch hotfix"
```

Repeat for `apps/shop` and `apps/delivery`.

## Manual Sprint 15 Signoff Checklist

### 15.1 Real Device End-to-End
- Place one COD order on a physical Android phone.
- Place one prepaid order on a physical Android phone.
- Complete the order through shop accept, ready, assignment, OTP delivery, and review submission.

### 15.2 Low-End Android
- Test on a low-memory Android device.
- Confirm app cold start, list scrolling, cart updates, checkout, and tracking remain usable.

### 15.3 2G/3G Conditions
- Use Android Studio or Chrome network throttling.
- Validate auth, search, checkout, GPS tracking, and retry UX.

### 15.5 OWASP Top 10 Audit
- Review auth bypass, IDOR, input validation, rate limiting, token expiry, and upload validation.
- Re-run backend security-sensitive integration tests.
- Run dependency audit in an environment with registry access.

### 15.6 Edge Cases
- Use [EDGE_CASES.md](/Users/trinadh/projects/nearby/docs/EDGE_CASES.md) as the execution source of truth.
- Record pass/fail per app and backend flow.

### 15.7 Fix P0 and P1 Bugs
- Log each launch blocker in GitHub or your tracker.
- Re-test after each fix using the same manual matrix.

### 15.10 Store Submission
- Build release artifacts.
- Upload Play Store listings for customer, shop, and delivery apps.
- Verify privacy policy, support email, screenshots, and testers.

## Recommended Verification Order

1. Bring up API + monitoring.
2. Confirm `/health`, `/readiness`, and `/metrics`.
3. Run the order load test on staging data.
4. Run real-device manual matrix.
5. Fix launch blockers.
6. Cut release builds and submit stores.
