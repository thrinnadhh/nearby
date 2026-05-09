# Sprint 15.6: Edge Case Testing - Execution Tracker

**Date:** May 4, 2026  
**Status:** Ready for manual testing  
**Total Scenarios:** 15  
**Estimated Duration:** 3-4 hours

---

## Quick Reference: All 15 Edge Cases

| # | Category | Scenario | Pass | Notes |
|---|----------|----------|------|-------|
| 1 | Order Mgmt | Duplicate order prevention (idempotency) | ⬜ | |
| 2 | Order Mgmt | Out-of-stock during checkout | ⬜ | |
| 3 | Order Mgmt | Partial item unavailability | ⬜ | |
| 4 | Order Mgmt | Shop goes offline during order | ⬜ | |
| 5 | Order Mgmt | Order state machine violation | ⬜ | |
| 6 | Payment | Webhook signature mismatch | ⬜ | |
| 7 | Payment | Duplicate webhook delivery | ⬜ | |
| 8 | Payment | Payment success but shop offline | ⬜ | |
| 9 | Payment | Partial refund for unavailable items | ⬜ | |
| 10 | Delivery | No delivery partner available | ⬜ | |
| 11 | Delivery | GPS spoofing detection | ⬜ | |
| 12 | Delivery | Network disconnect during delivery | ⬜ | |
| 13 | Network | API request timeout | ⬜ | |
| 14 | Network | Database connection pool exhaustion | ⬜ | |
| 15 | Auth | Expired JWT token | ⬜ | |

**Legend:** ⬜ = Not tested, ✅ = Passed, ❌ = Failed, ⚠️ = Partial pass

---

## Test Execution Log

### EC-1: Duplicate Order Prevention
**Status:** ⬜  
**Tested By:**  
**Date:**  
**Result:**  
**Issues Found:**  
**Notes:**  

---

### EC-2: Out-of-Stock During Checkout
**Status:** ⬜  
**Tested By:**  
**Date:**  
**Result:**  
**Issues Found:**  
**Notes:**  

---

### EC-3: Partial Item Unavailability
**Status:** ⬜  
**Tested By:**  
**Date:**  
**Result:**  
**Issues Found:**  
**Notes:**  

---

### EC-4: Shop Goes Offline During Order
**Status:** ⬜  
**Tested By:**  
**Date:**  
**Result:**  
**Issues Found:**  
**Notes:**  

---

### EC-5: Order State Machine Violation
**Status:** ⬜  
**Tested By:**  
**Date:**  
**Result:**  
**Issues Found:**  
**Notes:**  

---

### EC-6: Webhook Signature Mismatch
**Status:** ⬜  
**Tested By:**  
**Date:**  
**Result:**  
**Issues Found:**  
**Notes:**  

---

### EC-7: Duplicate Webhook Delivery
**Status:** ⬜  
**Tested By:**  
**Date:**  
**Result:**  
**Issues Found:**  
**Notes:**  

---

### EC-8: Payment Success But Shop Offline
**Status:** ⬜  
**Tested By:**  
**Date:**  
**Result:**  
**Issues Found:**  
**Notes:**  

---

### EC-9: Partial Refund for Unavailable Items
**Status:** ⬜  
**Tested By:**  
**Date:**  
**Result:**  
**Issues Found:**  
**Notes:**  

---

### EC-10: No Delivery Partner Available
**Status:** ⬜  
**Tested By:**  
**Date:**  
**Result:**  
**Issues Found:**  
**Notes:**  

---

### EC-11: GPS Spoofing Detection
**Status:** ⬜  
**Tested By:**  
**Date:**  
**Result:**  
**Issues Found:**  
**Notes:**  

---

### EC-12: Network Disconnect During Delivery
**Status:** ⬜  
**Tested By:**  
**Date:**  
**Result:**  
**Issues Found:**  
**Notes:**  

---

### EC-13: API Request Timeout
**Status:** ⬜  
**Tested By:**  
**Date:**  
**Result:**  
**Issues Found:**  
**Notes:**  

---

### EC-14: Database Connection Pool Exhaustion
**Status:** ⬜  
**Tested By:**  
**Date:**  
**Result:**  
**Issues Found:**  
**Notes:**  

---

### EC-15: Expired JWT Token
**Status:** ⬜  
**Tested By:**  
**Date:**  
**Result:**  
**Issues Found:**  
**Notes:**  

---

## Summary Statistics

**Total Scenarios:** 15  
**Passed:** 0  
**Failed:** 0  
**Partial:** 0  
**Not Started:** 15  

**Pass Rate:** 0%  
**Last Updated:** Not started

---

## Critical Issues Found

| Issue ID | Scenario | Severity | Description | Fix Status |
|----------|----------|----------|-------------|------------|
| (none yet) | | | | |

---

## Notes

- Use Firefox/Chrome DevTools for network throttling and JWT manipulation
- Have Supabase dashboard open to verify database state after each test
- Take screenshots of error messages for documentation
- If a test fails, try to reproduce it 2-3 times to confirm
- Document any unexpected behaviors even if they don't break functionality

