# Sprint 15.6: Edge Case Testing Plan

**Date:** May 4, 2026  
**Task:** 15.6 - Comprehensive Edge Case Testing  
**Status:** ⏳ READY FOR EXECUTION  
**Duration:** 3-4 hours manual testing

---

## Overview

Edge case testing validates error handling and recovery across 15 critical failure scenarios. These tests ensure the system gracefully handles unexpected conditions without data loss or user confusion.

---

## Edge Case Categories

| Category | Scenarios | Total |
|----------|-----------|-------|
| **Order Management** | 5 scenarios | 5 |
| **Payment Processing** | 4 scenarios | 4 |
| **Delivery & GPS** | 3 scenarios | 3 |
| **Network Failures** | 2 scenarios | 2 |
| **Authentication** | 1 scenario | 1 |
| **Total** | | **15** |

---

# 🛒 ORDER MANAGEMENT (5 Scenarios)

## EC-1: Duplicate Order Prevention (Idempotency)

**Scenario:** Customer creates order, network issue causes retry with same idempotency key

**Setup:**
1. Customer has ₹100 in products ready
2. Network delay simulated (use browser DevTools → Network → throttle)

**Steps:**
1. Click "Place Order" button
2. **Immediately** (while loading) → Duplicate the request:
   - Open DevTools → Network tab
   - Wait for initial request in flight
   - Manually trigger same API call with same `idempotency-key`
3. Wait for both responses

**Expected Result:**
- ✅ Only ONE order created in database
- ✅ Both requests return same order ID
- ✅ Stock decremented only once
- ✅ User doesn't see duplicate confirmations

**Validation:**
```bash
# Check database
SELECT COUNT(*) FROM orders WHERE customer_id = '<customer-id>' 
  AND created_at > NOW() - INTERVAL 1 minute;
# Should return: 1 (not 2)
```

---

## EC-2: Out-of-Stock During Checkout

**Scenario:** Product becomes unavailable between cart view and order creation

**Setup:**
1. Product has 1 unit in stock
2. Two browser windows: Customer A and Customer B

**Steps:**
1. **Window A:** Add product to cart (1 unit), start checkout
2. **Window B:** Same product, add to cart (1 unit), place order ✅ SUCCESS
3. **Window A:** Continue checkout, try to place order
4. Observe error handling

**Expected Result:**
- ✅ Window B order succeeds (gets the 1 unit)
- ✅ Window A order fails with clear error: "Out of Stock"
- ✅ Stock is reserved correctly (not oversold)
- ✅ Stock becomes available again if Window A cancels

**Validation:**
```bash
# Check stock was not oversold
SELECT SUM(qty) as total_ordered FROM order_items 
WHERE product_id = '<product-id>' 
AND order_id IN (SELECT id FROM orders WHERE status != 'cancelled');
# Should be ≤ original stock
```

---

## EC-3: Partial Item Unavailability

**Scenario:** Customer orders 3 items, one becomes unavailable mid-checkout

**Setup:**
1. Cart has:
   - Product A: 2 units (stock 10)
   - Product B: 1 unit (stock 1)
   - Product C: 3 units (stock 2) ← INSUFFICIENT
2. Submit order

**Steps:**
1. Fill checkout form
2. Click "Place Order"
3. Backend validates stock
4. Observe error response

**Expected Result:**
- ✅ Order REJECTED (atomic transaction)
- ✅ Error message specifies which items failed: "Product C: requested 3, only 2 available"
- ✅ NO stock decremented
- ✅ Cart remains intact for user to adjust

**Validation:**
```bash
# Verify no partial order was created
SELECT COUNT(*) FROM orders WHERE customer_id = '<id>' 
  AND total_amount = 0;  # Should be 0
```

---

## EC-4: Shop Goes Offline During Order

**Scenario:** Shop closes/goes offline while customer is placing order

**Setup:**
1. Customer creating order from "Open" shop
2. Shop owner closes shop (PATCH /shops/:id/toggle to `is_open: false`)

**Steps:**
1. Customer starts checkout from open shop
2. **Simultaneously,** shop owner toggles shop closed
3. Customer clicks "Place Order"

**Expected Result:**
- ✅ Order creation fails with: "Shop is currently closed"
- ✅ Payment is NOT charged
- ✅ Stock is NOT decremented
- ✅ User gets actionable message: "Try again when shop reopens"

**Validation:**
```bash
# Verify no order created
SELECT COUNT(*) FROM orders WHERE shop_id = '<shop-id>' 
  AND created_at > NOW() - INTERVAL 1 minute;
# Should be 0
```

---

## EC-5: Order State Machine Violation

**Scenario:** Delivery partner tries to deliver order before shop marks it "ready"

**Setup:**
1. Order status: `pending` (shop hasn't accepted yet)
2. Delivery partner receives assignment
3. Delivery partner tries to mark as `picked_up`

**Steps:**
1. Create order (status: `pending`)
2. Use delivery app to attempt: PATCH /delivery/:id/pickup
3. Observe error handling

**Expected Result:**
- ✅ Request REJECTED with: "Invalid transition: pending → picked_up"
- ✅ Order status remains `pending`
- ✅ No GPS location recorded
- ✅ User doesn't see premature status update

**Validation:**
```bash
# Verify status unchanged
SELECT status FROM orders WHERE id = '<order-id>';
# Should still be: pending
```

---

# 💳 PAYMENT PROCESSING (4 Scenarios)

## EC-6: Cashfree Webhook Signature Mismatch

**Scenario:** Malicious actor attempts payment webhook with invalid HMAC signature

**Setup:**
1. Intercept Cashfree webhook (or simulate with curl)
2. Modify webhook payload
3. Keep original signature (now invalid)

**Steps:**
1. Simulate webhook:
```bash
curl -X POST http://localhost:3000/api/v1/payments/webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: WRONG_SIGNATURE_HERE" \
  -d '{
    "payment_id": "pay_123",
    "order_id": "<order-id>",
    "payment_status": "SUCCESS"
  }'
```

**Expected Result:**
- ✅ Request REJECTED with 401/403 (signature verification failed)
- ✅ No payment status updated
- ✅ No orders created/confirmed
- ✅ Error logged for security investigation

**Validation:**
```bash
# Check no spurious orders created
SELECT COUNT(*) FROM orders WHERE id = '<order-id>' 
AND status IN ('payment_confirmed', 'accepted');
# Should be 0
```

---

## EC-7: Duplicate Webhook Delivery

**Scenario:** Cashfree delivers payment webhook twice (network retry)

**Setup:**
1. Valid Cashfree webhook for successful payment
2. Deliver same webhook twice with same `X-Webhook-ID`

**Steps:**
1. Send webhook first time → Order confirmed
2. Send identical webhook again
3. Observe duplicate-prevention

**Expected Result:**
- ✅ First webhook: Order confirmed, payment recorded ✓
- ✅ Second webhook: Returns 200 but NO duplicate processing
- ✅ Only ONE payment record exists
- ✅ User sees one confirmation (no spam notifications)

**Validation:**
```bash
# Verify single payment record
SELECT COUNT(*) FROM payments WHERE order_id = '<order-id>';
# Should be 1 (not 2)
```

---

## EC-8: Payment Success But Shop Offline

**Scenario:** Payment succeeds via Cashfree, but shop goes offline before accepting order

**Setup:**
1. Customer pays for order (Cashfree webhook succeeds)
2. Order status: `payment_confirmed`
3. Shop owner toggles offline

**Steps:**
1. Payment webhook received → order status: `payment_confirmed`
2. Shop owner closes shop while order is pending acceptance
3. Shop owner reopens 1 hour later
4. Check order is still valid and assignable

**Expected Result:**
- ✅ Order remains with payment confirmed
- ✅ Shop can reopen and accept order
- ✅ Customer refund is NOT triggered automatically
- ✅ Order doesn't auto-cancel while shop is offline

**Validation:**
```bash
# Verify order status unchanged
SELECT status FROM orders WHERE id = '<order-id>';
# Should be: payment_confirmed (not cancelled)
```

---

## EC-9: Partial Refund for Unavailable Items

**Scenario:** Order placed for 3 items, 1 becomes unavailable after payment, shop requests partial refund

**Setup:**
1. Order: 3 items for ₹150 total
2. Payment successful, order accepted by shop
3. Shop marks 1 item (₹50) as unavailable

**Steps:**
1. Shop initiates partial cancel: remove 1 item
2. API: PATCH /orders/:id/items with removed item IDs
3. Backend calculates refund: ₹150 - (₹100) = ₹50 refund
4. Check Cashfree refund API called

**Expected Result:**
- ✅ Order items updated (3 → 2 items)
- ✅ Order total reduced (₹150 → ₹100)
- ✅ Refund initiated via Cashfree: ₹50
- ✅ Customer notification: "₹50 refunded for unavailable items"
- ✅ Refund appears in customer wallet within 24 hours

**Validation:**
```bash
# Verify order items
SELECT COUNT(*) FROM order_items WHERE order_id = '<order-id>';
# Should be 2 (was 3)

# Verify refund record
SELECT amount FROM payments WHERE order_id = '<order-id>' 
  AND payment_type = 'refund';
# Should be 5000 (₹50 in paise)
```

---

# 🚚 DELIVERY & GPS (3 Scenarios)

## EC-10: No Delivery Partner Available

**Scenario:** Shop accepts order, but no delivery partners within 5km range

**Setup:**
1. Order created and accepted by shop
2. No delivery partners active within 5km
3. trigger auto-assignment job

**Steps:**
1. Create order in area with no delivery partners
2. Shop accepts order
3. BullMQ `assign-delivery` job runs
4. Observe behavior

**Expected Result:**
- ✅ No delivery partner assigned
- ✅ Job queued for retry (exponential backoff)
- ✅ Admin gets alert: "No delivery available for order <id>"
- ✅ Customer gets notification: "Finding delivery partner..."
- ✅ After 3 retries, order auto-cancels or escalates

**Validation:**
```bash
# Check no delivery was assigned
SELECT delivery_partner_id FROM orders WHERE id = '<order-id>';
# Should be NULL

# Check retry attempts
SELECT COUNT(*) FROM job_logs WHERE job_type = 'assign-delivery' 
  AND order_id = '<order-id>';
# Should be 3 (max retries)
```

---

## EC-11: GPS Spoofing Detection

**Scenario:** Delivery partner reports false GPS location (e.g., 10km away from real location)

**Setup:**
1. Order assigned to delivery partner (real location: Hyderabad)
2. Partner app sends GPS update from different city (Bangalore)
3. Monitor distance validation

**Steps:**
1. Partner sends GPS: (13.19°N, 77.58°E) [Hyderabad real]
2. **Malicious update:** Send GPS: (12.97°N, 77.59°E) [Bangalore - 220km away]
3. Check if system detects anomaly

**Expected Result:**
- ✅ Anomalous GPS rejected (validates distance change per time)
- ✅ Alert logged for fraud investigation
- ✅ If repeated: delivery partner disabled for review
- ✅ Order ETA not updated with spoofed location
- ✅ No false "partner nearby" notifications to customer

**Validation:**
```bash
# Check GPS record rejected
SELECT COUNT(*) FROM gps_logs WHERE order_id = '<order-id>' 
  AND location = ST_Point(12.97, 77.59);  # Spoofed location
# Should be 0 (rejected)

# Check anomaly flag
SELECT fraud_score FROM delivery_partners WHERE id = '<partner-id>';
# Should increase
```

---

## EC-12: Network Disconnect During Delivery

**Scenario:** Delivery partner loses internet connection mid-delivery, then reconnects

**Setup:**
1. Order in `out_for_delivery` status
2. GPS updating every 5 seconds
3. Simulate network offline/online cycle

**Steps:**
1. Order: `out_for_delivery`
2. GPS updates flowing (customer seeing live tracking)
3. **Kill network** on partner phone (disable WiFi + cellular)
4. Partner continues to delivery location
5. **Restore network** 5 minutes later
6. Partner marks delivered

**Expected Result:**
- ✅ GPS stops updating (customer sees "last location" with timestamp)
- ✅ No fake locations uploaded during offline period
- ✅ When network restores: GPS batch-uploaded (not single point)
- ✅ Order still completes normally
- ✅ Customer sees: "Delivery partner out of signal, attempting to reconnect..."

**Validation:**
```bash
# Check GPS trail during offline period
SELECT COUNT(*) FROM gps_logs WHERE order_id = '<order-id>' 
  AND timestamp BETWEEN '<offline-start>' AND '<offline-end>';
# Should be 0 (offline, no updates)

# Verify GPS resumed after reconnect
SELECT COUNT(*) FROM gps_logs WHERE order_id = '<order-id>' 
  AND timestamp > '<offline-end>';
# Should be > 0
```

---

# 🌐 NETWORK FAILURES (2 Scenarios)

## EC-13: API Request Timeout

**Scenario:** Customer tries to place order but API takes >10 seconds to respond

**Setup:**
1. Simulate slow database query (add 11-second delay)
2. Or manually throttle network to 2G speed
3. Customer clicks "Place Order"

**Steps:**
1. Open DevTools → Network tab
2. Set throttling to "Slow 3G"
3. Click "Place Order" button
4. Wait and observe behavior

**Expected Result:**
- ✅ Request times out after 10 seconds
- ✅ Clear error shown: "Request timeout. Please try again."
- ✅ NO duplicate order created (idempotency protected)
- ✅ User can retry with same idempotency key
- ✅ Loading spinner disappears (not stuck forever)

**Validation:**
```bash
# Verify no "ghost" order created
SELECT COUNT(*) FROM orders WHERE customer_id = '<id>' 
  AND status = 'pending' AND created_at > NOW() - INTERVAL 1 minute;
# Should be 0 (or 1 if user clicked "Place Order" once)
```

---

## EC-14: Database Connection Pool Exhaustion

**Scenario:** Too many concurrent requests exhaust PostgreSQL connection pool

**Setup:**
1. Load test sends 100 concurrent requests
2. Database pool size: 20 connections
3. Observe graceful degradation

**Steps:**
1. Run: `npm run loadtest:orders` (100 requests, 20 concurrency)
2. Monitor database connections
3. Expect some requests to queue or fail gracefully

**Expected Result:**
- ✅ First 20 requests: Process normally
- ✅ Requests 21-100: Queue or get 503 "Service Unavailable"
- ✅ NO database crashes or corruption
- ✅ NO silent failures (errors are explicit)
- ✅ After initial burst: Pool stabilizes, requests process

**Validation:**
```bash
# Check database error logs
SELECT * FROM pg_stat_statements WHERE query LIKE '%pool%' ORDER BY calls DESC;

# Verify no transactions left open
SELECT * FROM pg_stat_activity WHERE state = 'active';
# Should be 0 (all transactions committed/rolled back)
```

---

# 🔐 AUTHENTICATION (1 Scenario)

## EC-15: Expired JWT Token

**Scenario:** Customer's JWT expires mid-checkout, try to place order

**Setup:**
1. Customer logs in (JWT expires in 24 hours for demo)
2. Use DevTools to set JWT expiry to 5 seconds (for testing)
3. Wait for token to expire
4. Try to place order

**Steps:**
1. Manually edit localStorage JWT: change `exp` claim to past timestamp
2. Click "Place Order"
3. Observe authentication handling

**Expected Result:**
- ✅ Request rejected with 401 "Unauthorized"
- ✅ Clear message: "Your session has expired. Please log in again."
3. ✅ No order created
- ✅ User redirected to login screen
- ✅ Cart is preserved (user doesn't lose items)

**Validation:**
```bash
# Verify no order created
SELECT COUNT(*) FROM orders WHERE customer_id = '<id>' 
  AND created_at > NOW() - INTERVAL 1 minute;
# Should be 0

# Check auth logs
SELECT * FROM auth_logs WHERE user_id = '<id>' 
  AND event = 'token_expired' 
  AND timestamp > NOW() - INTERVAL 1 minute;
```

---

# 📋 Testing Checklist

## Pre-Test Validation
- [ ] Backend API running: `npm start`
- [ ] Database migrations applied (all 16 files)
- [ ] Real test data created: customer, shop, product
- [ ] Supabase tables visible in dashboard
- [ ] Browser DevTools ready for network throttling

## Test Execution
- [ ] EC-1: Idempotency (duplicate prevention)
- [ ] EC-2: Out-of-stock during checkout
- [ ] EC-3: Partial item unavailability
- [ ] EC-4: Shop goes offline during order
- [ ] EC-5: Order state machine violation
- [ ] EC-6: Webhook signature mismatch
- [ ] EC-7: Duplicate webhook delivery
- [ ] EC-8: Payment success but shop offline
- [ ] EC-9: Partial refund for unavailable items
- [ ] EC-10: No delivery partner available
- [ ] EC-11: GPS spoofing detection
- [ ] EC-12: Network disconnect during delivery
- [ ] EC-13: API request timeout
- [ ] EC-14: Database connection pool exhaustion
- [ ] EC-15: Expired JWT token

## Post-Test Validation
- [ ] Document all failures found
- [ ] Verify error messages are user-friendly
- [ ] Check logs for any silent errors
- [ ] Confirm no data corruption
- [ ] Confirm no duplicate records

---

# 🎯 Success Criteria

**EC Testing Passes When:**

1. ✅ All 15 scenarios tested
2. ✅ All expected behaviors observed
3. ✅ No data corruption occurred
4. ✅ All error messages are clear and actionable
5. ✅ Users can recover from all failures
6. ✅ No silent errors (all failures logged)
7. ✅ No duplicate records created
8. ✅ System remains stable under stress

---

# 📝 Documentation Requirements

For each scenario tested, document:

```markdown
## EC-X: [Scenario Name]
**Status:** ✅ PASS / ❌ FAIL / ⚠️ PARTIAL

**Observed Behavior:**
- What actually happened

**Expected vs Actual:**
- Did it match expectations?

**Issues Found (if any):**
- Any bugs or unexpected behavior

**User Impact:**
- How would user experience this issue?

**Severity:**
- CRITICAL / HIGH / MEDIUM / LOW

**Reproduction Steps:**
- Exact steps to reproduce if failed
```

---

# 🔗 Related Documentation

- [CLAUDE.md](../CLAUDE.md) — Domain rules for orders, payments, delivery
- [EDGE_CASES.md](./EDGE_CASES.md) — Backup edge case reference
- [FLOWS.md](./FLOWS.md) — User journey flows (context for edge cases)
- [API.md](./API.md) — API endpoint reference for manual testing

---

**Ready to test? Let's find and fix edge case bugs! 🐛🔍**
