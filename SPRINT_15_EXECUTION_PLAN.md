# Sprint 15: Integration Testing & Launch Readiness

**Status:** 🟡 STARTING  
**Date:** May 4, 2026  
**Objective:** Complete end-to-end testing, security audits, and launch preparation

---

## Sprint 15 Overview

Sprint 15 is **launch-readiness work** combining:
- ✅ Automated testing (load tests, E2E flows) — **scripts ready**
- ✅ Infrastructure monitoring (Grafana dashboards) — **docker-compose ready**
- ✅ Backup automation — **scripts ready**
- ✅ OTA updates (Expo EAS) — **config ready**
- ⏳ Manual testing (real devices, edge cases, security audit) — **needs execution**

---

## Task Breakdown & Dependencies

### Phase 1: Security & Load Testing (Can Run in Parallel)

#### **15.5 Security Audit (OWASP Top 10)** ⏳
- **Status:** ⬜ Not started
- **Effort:** 2-3 hours
- **Responsibility:** Security reviewer agent
- **What to check:**
  - SQL injection prevention (parameterized queries)
  - Authentication bypass (token expiry, role checks)
  - Authorization (IDOR, ownership checks)
  - Input validation (rate limiting, size limits)
  - File upload security (MIME types, path traversal)
  - Secrets management (no hardcoded keys)
  - Error handling (no stack traces to client)
  - Password/token exposure
  - API endpoint protection
  - CSRF/XSS prevention

**Execution:**
```bash
cd backend
npm run test:security
npm audit
```

---

#### **15.4 Load Test: 100 Concurrent Orders** ⏳
- **Status:** ⬜ Not started
- **Effort:** 1 hour
- **What it tests:**
  - Order creation concurrency
  - Database lock handling
  - Redis connection pooling
  - WebSocket broadcast performance
  - Payment gateway throttling

**Execution:**
```bash
cd backend
LOAD_TEST_BASE_URL=http://localhost:3000 \
LOAD_TEST_TOKEN=<customer_jwt> \
LOAD_TEST_SHOP_ID=<shop_uuid> \
LOAD_TEST_PRODUCT_ID=<product_uuid> \
LOAD_TEST_REQUESTS=100 \
LOAD_TEST_CONCURRENCY=20 \
npm run loadtest:orders
```

---

### Phase 2: Edge Cases & E2E Flows

#### **15.6 Edge Case Testing** ⏳
- **Status:** ⬜ Not started
- **Effort:** 3-4 hours
- **Source:** `/docs/EDGE_CASES.md` (15 edge cases)
- **Test Matrix:**
  - Backend flow tests
  - Frontend manual tests
  - Integration across all 4 apps
- **Examples:**
  - Order placed, product goes out of stock before payment
  - Shop goes offline mid-order
  - Network disconnection during GPS tracking
  - Partial refund on item unavailable
  - Partner accepts then rejects assignment

**Execution:** See [EDGE_CASES.md](/docs/EDGE_CASES.md) for full checklist

---

#### **Automated E2E Smoke Flow** ✅
- **Status:** SCRIPT READY
- **Effort:** 10 minutes
- **What it tests:** Critical path end-to-end

**Run it:**
```bash
cd backend
E2E_BASE_URL=http://localhost:3000 \
E2E_CUSTOMER_TOKEN=<customer_jwt> \
E2E_SHOP_TOKEN=<shop_owner_jwt> \
E2E_ADMIN_TOKEN=<admin_jwt> \
npm run test:e2e:critical
```

---

### Phase 3: Real Device Testing

#### **15.1 Real Device E2E (Android/iOS)** ⏳
- **Status:** ⬜ Not started
- **Effort:** 4-5 hours
- **Devices:** Any physical phone with real SIM
- **Test Flows:**
  - COD order end-to-end
  - Prepaid (UPI) order end-to-end
  - GPS tracking with real location
  - Delivery OTP verification
  - Review submission

**Acceptance Criteria:**
- Customer app: Browse → Order → Pay → Track → Review ✅
- Shop app: Receive → Accept → Pack → Ready ✅
- Delivery app: Assignment → Accept → Pickup → Deliver ✅
- All notifications delivered (FCM + SMS) ✅

---

#### **15.2 Low-End Android Device** ⏳
- **Status:** ⬜ Not started
- **Effort:** 2-3 hours
- **Device:** Low-memory Android (₹5,000-8,000 range)
- **Test Focus:**
  - App cold start time
  - FlatList scrolling performance
  - Image loading (thumbnails first)
  - Memory leaks (long session)

---

#### **15.3 Network Throttling (2G/3G)** ⏳
- **Status:** ⬜ Not started
- **Effort:** 2-3 hours
- **Tools:** Chrome DevTools, Android Studio network throttling
- **Test Flows:**
  - Auth (OTP send/verify) on 2G
  - Product search on 3G
  - Order placement with retry
  - GPS tracking with data loss recovery

---

### Phase 4: Bug Fixes & Polish

#### **15.7 Fix P0 and P1 Bugs** ⏳
- **Status:** ⬜ Not started (depends on findings from 15.1-15.6)
- **Effort:** 4-6 hours
- **Process:**
  1. Log all issues found during testing
  2. Triage as P0 (launch blocker) or P1 (post-launch OK)
  3. Use nearby-builder to fix each P0
  4. Use nearby-tester + nearby-security to verify
  5. Update this doc with closure

---

### Phase 5: Store Submission

#### **15.10 App Store / Play Store Submissions** ⏳
- **Status:** ⬜ Not started
- **Effort:** 3-4 hours
- **Apps to submit:**
  - Customer app (Google Play + App Store)
  - Shop app (Google Play + App Store)
  - Delivery app (Google Play + internal testing)
- **Prerequisites:**
  - All bugs fixed
  - Privacy policy finalized
  - Screenshots ready
  - Support email configured

---

### Infrastructure & Automation (Already Ready ✅)

#### **15.8 Grafana Dashboards + Alerts** ✅
- **Status:** IMPLEMENTED
- **Features:**
  - API latency monitoring
  - Error rate alerts
  - Order stuck alerts
  - Database connection pool monitoring
  - Redis memory usage

**Start monitoring:**
```bash
docker compose up -d prometheus grafana node-exporter cadvisor
# Access: http://localhost:3004
```

---

#### **15.9 Weekly Snapshot Backup** ✅
- **Status:** SCRIPTS READY
- **Automation:** Cron job to create weekly DO droplet snapshots
- **Files:** `/ops/backup/`

---

#### **15.11 Expo OTA Updates** ✅
- **Status:** CONFIG READY
- **Pre-launch commands:**
```bash
cd apps/customer && eas build --platform android --profile production
cd apps/shop && eas build --platform android --profile production
cd apps/delivery && eas build --platform android --profile production
```

---

## Recommended Execution Order

```
Day 1 (Today):
├─ 15.5 Security Audit (2-3 hrs)
├─ 15.4 Load Test (1 hr)
└─ Automated E2E Smoke Flow (10 min)

Day 2:
├─ 15.6 Edge Case Testing (3-4 hrs)
└─ Document findings

Day 3:
├─ 15.1 Real Device E2E (4-5 hrs)
├─ 15.2 Low-End Android (2-3 hrs)
└─ 15.3 Network Throttling (2-3 hrs)

Days 4-5:
├─ 15.7 Fix P0/P1 bugs (4-6 hrs)
├─ Re-test fixed bugs
└─ Final verification

Day 6:
└─ 15.10 Store submissions (3-4 hrs)
```

---

## Test & Verification Checklist

### Security Audit Checklist
- [ ] No SQL injection vulnerabilities
- [ ] No hardcoded secrets (API keys, JWT_SECRET)
- [ ] Authentication required on protected routes
- [ ] Role-based access control enforced
- [ ] Rate limiting working (OTP, order creation, search)
- [ ] File uploads validated (MIME type, size)
- [ ] HMAC-SHA256 verification on Cashfree webhooks
- [ ] OWASP Top 10 items 1-10 verified

### Load Test Checklist
- [ ] 100 requests complete successfully
- [ ] Average response time < 200ms
- [ ] No database lock timeouts
- [ ] Redis connection pool stable
- [ ] No memory leaks in Node.js process

### Edge Cases Checklist
- [ ] Product out-of-stock mid-order
- [ ] Shop goes offline mid-order
- [ ] Payment fails → refund issued
- [ ] Delivery partner unavailable → 5km radius expand
- [ ] Network disconnect during GPS tracking
- [ ] (See EDGE_CASES.md for full 15-item list)

### Real Device Testing Checklist
**Customer App:**
- [ ] COD order start-to-finish
- [ ] UPI payment (real or test mode)
- [ ] Order tracking with live GPS
- [ ] Delivery OTP display and verification
- [ ] Review submission and ratings

**Shop App:**
- [ ] Receive notification for new order
- [ ] Accept order within 3 minutes
- [ ] Mark items as packed
- [ ] Transition to ready state

**Delivery App:**
- [ ] Receive assignment notification
- [ ] Accept delivery
- [ ] GPS tracking (5-second intervals)
- [ ] Generate delivery OTP
- [ ] Mark as delivered
- [ ] Rate order

**All Apps:**
- [ ] FCM push notifications working
- [ ] SMS notifications received (MSG91)
- [ ] App doesn't crash under any flow
- [ ] Session persists across app close/reopen

---

## Key Files Reference

| Purpose | File | Status |
|---------|------|--------|
| Load test script | `backend/src/scripts/loadTestOrders.js` | ✅ Ready |
| E2E smoke test | `backend/src/scripts/e2eCriticalFlow.js` | ✅ Ready |
| Edge cases | `docs/EDGE_CASES.md` | ✅ Ready |
| Monitoring | `docker-compose.yml` + `ops/monitoring/` | ✅ Ready |
| Backup scripts | `ops/backup/` | ✅ Ready |
| OTA config | `apps/*/eas.json` | ✅ Ready |

---

## Success Criteria for Sprint 15

✅ All security vulnerabilities identified and prioritized  
✅ Load test passes with 100 concurrent orders  
✅ All 15 edge cases tested and documented  
✅ Real device E2E flow works on Android + iOS  
✅ Low-end Android performance acceptable  
✅ Network throttling (2G/3G) doesn't block critical flows  
✅ All P0 bugs fixed  
✅ Apps submitted to stores  
✅ Monitoring dashboards running  
✅ Backup automation configured  

---

## Next Steps

**Choose Task to Start:**

1. **15.5 Security Audit** — Most critical, finds launch blockers
2. **15.4 Load Test** — Validates infrastructure, quick feedback
3. **15.6 Edge Cases** — Manual testing, document interactions
4. **15.1 Real Device E2E** — High confidence in user flows
5. **15.7 Bug Fixes** — Depends on findings from above

---

**Which task would you like to start with?**

Example: "Start with 15.5 Security Audit" or "Run 15.4 load test first"
