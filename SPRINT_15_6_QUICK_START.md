# Sprint 15.6: Edge Case Testing - Quick Start Guide

**Status:** Ready to Execute  
**Total Scenarios:** 15  
**Est. Time:** 3-4 hours  
**Skill Level:** Manual tester (no coding required)

---

## 🚀 Quick Start (5 minutes)

### Before You Start
```bash
# 1. Verify backend is running
curl http://localhost:3000/health | jq .

# 2. Verify database has test data
NODE_ENV=development node --require dotenv/config -e "
import { supabase } from './src/services/supabase.js';
const { data } = await supabase.from('shops').select('count');
console.log('✅ Database ready' if data else '❌ Check migrations');
"

# 3. Open browser DevTools (F12)
# 4. Login to customer app
# 5. Add product to cart
```

---

## 📋 Scenario List (15 Total)

### 🛒 Order Management (5 Scenarios)

**[Quick Link]** [EC-1: Idempotency](SPRINT_15_6_EDGE_CASE_TESTING.md#ec-1-duplicate-order-prevention-idempotency)
- Test: Duplicate orders prevented
- Time: 10 min
- Tools: DevTools Network tab
- Difficulty: Easy

**[Quick Link]** [EC-2: Out-of-Stock](SPRINT_15_6_EDGE_CASE_TESTING.md#ec-2-out-of-stock-during-checkout)
- Test: Stock reservation works
- Time: 10 min
- Tools: Two browser windows
- Difficulty: Easy

**[Quick Link]** [EC-3: Partial Unavailable](SPRINT_15_6_EDGE_CASE_TESTING.md#ec-3-partial-item-unavailability)
- Test: Rejects orders with unavailable items
- Time: 10 min
- Tools: Supabase console
- Difficulty: Medium

**[Quick Link]** [EC-4: Shop Offline](SPRINT_15_6_EDGE_CASE_TESTING.md#ec-4-shop-goes-offline-during-order)
- Test: Rejects orders from closed shops
- Time: 10 min
- Tools: Two browser windows
- Difficulty: Easy

**[Quick Link]** [EC-5: State Machine](SPRINT_15_6_EDGE_CASE_TESTING.md#ec-5-order-state-machine-violation)
- Test: Order status transitions validated
- Time: 15 min
- Tools: API/DevTools
- Difficulty: Medium

### 💳 Payment Processing (4 Scenarios)

**[Quick Link]** [EC-6: Webhook Signature](SPRINT_15_6_EDGE_CASE_TESTING.md#ec-6-cashfree-webhook-signature-mismatch)
- Test: Rejects invalid webhook signatures
- Time: 10 min
- Tools: curl command
- Difficulty: Medium

**[Quick Link]** [EC-7: Duplicate Webhook](SPRINT_15_6_EDGE_CASE_TESTING.md#ec-7-duplicate-webhook-delivery)
- Test: Prevents duplicate payment processing
- Time: 15 min
- Tools: curl command + Supabase
- Difficulty: Medium

**[Quick Link]** [EC-8: Payment + Shop Offline](SPRINT_15_6_EDGE_CASE_TESTING.md#ec-8-payment-success-but-shop-offline)
- Test: Orders survive shop offline toggle
- Time: 15 min
- Tools: Two browser windows
- Difficulty: Medium

**[Quick Link]** [EC-9: Partial Refund](SPRINT_15_6_EDGE_CASE_TESTING.md#ec-9-partial-refund-for-unavailable-items)
- Test: Refund calculation works correctly
- Time: 20 min
- Tools: Supabase + API
- Difficulty: Hard

### 🚚 Delivery & GPS (3 Scenarios)

**[Quick Link]** [EC-10: No Partner Available](SPRINT_15_6_EDGE_CASE_TESTING.md#ec-10-no-delivery-partner-available)
- Test: Handles missing delivery partners
- Time: 20 min
- Tools: Job scheduler observation
- Difficulty: Hard

**[Quick Link]** [EC-11: GPS Spoofing](SPRINT_15_6_EDGE_CASE_TESTING.md#ec-11-gps-spoofing-detection)
- Test: Rejects impossible GPS changes
- Time: 20 min
- Tools: API + Supabase
- Difficulty: Hard

**[Quick Link]** [EC-12: Network Disconnect](SPRINT_15_6_EDGE_CASE_TESTING.md#ec-12-network-disconnect-during-delivery)
- Test: Resumes tracking after reconnect
- Time: 30 min
- Tools: DevTools network throttling
- Difficulty: Hard

### 🌐 Network Failures (2 Scenarios)

**[Quick Link]** [EC-13: Request Timeout](SPRINT_15_6_EDGE_CASE_TESTING.md#ec-13-api-request-timeout)
- Test: Timeouts handled gracefully
- Time: 15 min
- Tools: DevTools network throttling
- Difficulty: Easy

**[Quick Link]** [EC-14: Connection Pool](SPRINT_15_6_EDGE_CASE_TESTING.md#ec-14-database-connection-pool-exhaustion)
- Test: Graceful degradation under load
- Time: 20 min
- Tools: npm run loadtest:orders
- Difficulty: Medium

### 🔐 Authentication (1 Scenario)

**[Quick Link]** [EC-15: Expired JWT](SPRINT_15_6_EDGE_CASE_TESTING.md#ec-15-expired-jwt-token)
- Test: Expired tokens rejected
- Time: 10 min
- Tools: DevTools localStorage
- Difficulty: Easy

---

## ⏱️ Recommended Testing Order

### Phase 1: Easy Tests (40 minutes)
1. EC-13: Request Timeout
2. EC-15: Expired JWT
3. EC-1: Idempotency
4. EC-2: Out-of-Stock
5. EC-4: Shop Offline

**After Phase 1:**
- ✅ Basic error handling works
- ✅ Network resilience verified
- ✅ Authentication/timeout handling solid

### Phase 2: Medium Tests (70 minutes)
6. EC-3: Partial Unavailable
7. EC-5: State Machine
8. EC-6: Webhook Signature
9. EC-7: Duplicate Webhook
10. EC-14: Connection Pool

**After Phase 2:**
- ✅ Order processing robust
- ✅ Payment security verified
- ✅ Load handling validated

### Phase 3: Hard Tests (70 minutes)
11. EC-8: Payment + Shop Offline
12. EC-9: Partial Refund
13. EC-10: No Partner Available
14. EC-11: GPS Spoofing
15. EC-12: Network Disconnect

**After Phase 3:**
- ✅ Complex scenarios handled
- ✅ Delivery system robust
- ✅ All edge cases validated

---

## 📊 Success Metrics

**After All 15 Tests:**

- ✅ 15/15 tests executed
- ✅ Error messages are clear
- ✅ No data corruption observed
- ✅ System remains stable
- ✅ User experience is good

**Pass Rate Target:** ≥ 85% (≤3 failures acceptable)

---

## 🛠️ Tools You'll Need

| Tool | Purpose | How to Use |
|------|---------|-----------|
| **Browser DevTools** | Network throttling, JWT editing | F12 → Network tab |
| **curl** | Send manual API requests | `curl -X POST ...` |
| **Supabase Dashboard** | Verify database state | https://app.supabase.com |
| **Terminal** | Run npm commands | `npm run loadtest:orders` |
| **Two Browser Windows** | Concurrent customer actions | Open side-by-side |

---

## 💡 Pro Tips

### 1. Network Throttling (DevTools)
```
F12 → Network → Throttling dropdown → "Slow 3G"
```
This simulates real-world network conditions.

### 2. JWT Manipulation
```javascript
// In DevTools Console:
localStorage.getItem('auth_token')  // See current token
// Edit token's exp claim to past timestamp
localStorage.setItem('auth_token', 'new_expired_token')
```

### 3. Database State Check
```bash
# Quick verification script
curl -H "Authorization: Bearer <jwt>" \
  http://localhost:3000/api/v1/orders \
  | jq '.data | length'
```

### 4. Documentation as You Go
Keep the tracker open:
- [SPRINT_15_6_EDGE_CASE_TESTING_TRACKER.md](SPRINT_15_6_EDGE_CASE_TESTING_TRACKER.md)
- Mark ✅ or ❌ for each scenario
- Add notes for failures

---

## 🐛 If You Find a Bug

### Document It
```
Scenario: EC-X [Name]
Severity: CRITICAL / HIGH / MEDIUM / LOW
Steps to Reproduce:
  1. ...
  2. ...
  3. ...

Expected: ...
Actual: ...

Evidence: [screenshot/log]
```

### Report It
1. Take a screenshot (F12 console visible)
2. Save to `/nearby/bug-reports/`
3. Note severity and reproducibility
4. Mark as CRITICAL if it affects user safety/data

---

## ⏰ Time Estimate Breakdown

| Phase | Time | Scenarios |
|-------|------|-----------|
| Setup | 5 min | - |
| Phase 1 (Easy) | 40 min | 5 tests |
| Phase 2 (Medium) | 70 min | 5 tests |
| Phase 3 (Hard) | 70 min | 5 tests |
| Documentation | 15 min | - |
| **TOTAL** | **3.5 hrs** | **15 tests** |

---

## ✅ Final Checklist

Before submitting results:

- [ ] All 15 scenarios tested
- [ ] Tracker marked with pass/fail status
- [ ] Screenshots of failures saved
- [ ] No critical bugs found (or documented)
- [ ] Database state verified after each test
- [ ] Error messages are user-friendly
- [ ] Summary statistics calculated

---

## 🎯 Success Criteria

**Testing Complete When:**

1. ✅ 15/15 scenarios executed
2. ✅ Results documented in tracker
3. ✅ All edge cases behave as expected
4. ✅ No silent failures found
5. ✅ System remains stable

---

**Ready to start? Pick a scenario above and begin testing! 🚀**

*Questions? Check [SPRINT_15_6_EDGE_CASE_TESTING.md](SPRINT_15_6_EDGE_CASE_TESTING.md) for detailed instructions.*
