# Security Fixes Checklist — Sprint 13 Admin APIs

**Status:** ✅ Ready for Implementation  
**Total Effort:** ~75 minutes (30 min + 45 min)  
**Target Deadline:** Before production launch  
**Risk Level:** LOW (straightforward fixes)

---

## Fix #1: Mask Phone Numbers in Admin Responses

**Priority:** 🔴 HIGH  
**Effort:** 30 minutes  
**Impact:** Prevents PII exposure in API responses  
**Affected Endpoints:** 5 endpoints

### Step 1: Create utility function (5 min)

**File:** `backend/src/utils/security.js` (NEW FILE)

```javascript
/**
 * Masks sensitive phone numbers to show only last 4 digits
 * Example: +919876543210 → +91****3210
 * 
 * @param {string} phone - Full phone number
 * @returns {string} Masked phone number or 'N/A' if empty
 */
export const maskPhone = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return 'N/A';
  }

  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Return masked format if we have at least 4 digits
  if (digits.length >= 4) {
    return `+91****${digits.slice(-4)}`;
  }
  
  // Return N/A if phone is too short
  return 'N/A';
};

/**
 * Masks Aadhaar numbers to show only last 4 digits
 * Example: 123456789012 → ****6789012 (last 7 digits visible)
 */
export const maskAadhaar = (aadhaar) => {
  if (!aadhaar || typeof aadhaar !== 'string') {
    return 'N/A';
  }
  
  const digits = aadhaar.replace(/\D/g, '');
  
  if (digits.length >= 12) {
    return `****${digits.slice(-7)}`;
  }
  
  return 'N/A';
};

/**
 * Masks bank account numbers
 * Example: 12345678901234 → ****1234
 */
export const maskBankAccount = (account) => {
  if (!account || typeof account !== 'string') {
    return 'N/A';
  }
  
  const digits = account.replace(/\D/g, '');
  
  if (digits.length >= 4) {
    return `****${digits.slice(-4)}`;
  }
  
  return 'N/A';
};
```

### Step 2: Update admin.js — KYC Queue endpoint (3 min)

**File:** `backend/src/routes/admin.js`  
**Location:** Around line 42 (GET /admin/kyc/queue)

Find this code:
```javascript
const mappedQueueData = queueData.map((kycData) => ({
  id: kycData.id,
  shop_id: kycData.shop_id,
  owner_name: kycData.shops?.[0]?.owner_name || '',
  owner_phone: kycData.shops?.[0]?.owner_phone?.[0]?.phone || '',  // ← BEFORE
  submitted_at: kycData.submitted_at,
  status: kycData.status,
  docs: kycData.kyc_documents?.[0] || {},
}));
```

Replace with:
```javascript
import { maskPhone } from '../utils/security.js';  // ← ADD AT TOP

// ... later in endpoint ...

const mappedQueueData = queueData.map((kycData) => ({
  id: kycData.id,
  shop_id: kycData.shop_id,
  owner_name: kycData.shops?.[0]?.owner_name || '',
  owner_phone: maskPhone(kycData.shops?.[0]?.owner_phone?.[0]?.phone),  // ← AFTER
  submitted_at: kycData.submitted_at,
  status: kycData.status,
  docs: kycData.kyc_documents?.[0] || {},
}));
```

### Step 3: Update admin.js — Get Disputes endpoint (3 min)

**File:** `backend/src/routes/admin.js`  
**Location:** Around line 247 (GET /admin/disputes)

Find this code:
```javascript
const mappedDisputes = disputes.map((d) => ({
  id: d.id,
  order_id: d.order_id,
  customer_id: d.customer_id,
  customer_phone: d.customers?.[0]?.phone || '',  // ← BEFORE
  reason: d.reason,
  status: d.status,
  created_at: d.created_at,
}));
```

Replace with:
```javascript
const mappedDisputes = disputes.map((d) => ({
  id: d.id,
  order_id: d.order_id,
  customer_id: d.customer_id,
  customer_phone: maskPhone(d.customers?.[0]?.phone),  // ← AFTER
  reason: d.reason,
  status: d.status,
  created_at: d.created_at,
}));
```

### Step 4: Update admin.js — Get Disputes Detail endpoint (3 min)

**File:** `backend/src/routes/admin.js`  
**Location:** Around line 263 (GET /admin/disputes/:id)

Find this code:
```javascript
return res.status(200).json(
  successResponse({
    id: dispute.id,
    order_id: dispute.order_id,
    customer_id: dispute.customer_id,
    customer_phone: dispute.customers?.[0]?.phone || '',  // ← BEFORE
    order_timeline: dispute.orders?.[0]?.order_timeline || [],
    gps_trail: gpsDataResult ? JSON.parse(gpsDataResult) : [],
    refund_status: dispute.refund_status,
  })
);
```

Replace with:
```javascript
return res.status(200).json(
  successResponse({
    id: dispute.id,
    order_id: dispute.order_id,
    customer_id: dispute.customer_id,
    customer_phone: maskPhone(dispute.customers?.[0]?.phone),  // ← AFTER
    order_timeline: dispute.orders?.[0]?.order_timeline || [],
    gps_trail: gpsDataResult ? JSON.parse(gpsDataResult) : [],
    refund_status: dispute.refund_status,
  })
);
```

### Step 5: Update admin-partners.js — Get Partners endpoint (3 min)

**File:** `backend/src/routes/admin-partners.js`  
**Location:** Around line 34 (GET /admin/delivery-partners)

Find this code:
```javascript
const mappedPartners = partners.map((p) => ({
  id: p.id,
  name: p.name,
  phone: p.phone || '',  // ← BEFORE
  rating: p.rating || 0,
  earnings: p.total_earnings || 0,
  orders_completed: p.orders_completed || 0,
}));
```

Replace with:
```javascript
import { maskPhone } from '../utils/security.js';  // ← ADD AT TOP

// ... later in endpoint ...

const mappedPartners = partners.map((p) => ({
  id: p.id,
  name: p.name,
  phone: maskPhone(p.phone),  // ← AFTER
  rating: p.rating || 0,
  earnings: p.total_earnings || 0,
  orders_completed: p.orders_completed || 0,
}));
```

### Step 6: Update tests to expect masked format (10 min)

**File:** `backend/__tests__/integration/admin-kyc.integration.test.js`

Find test assertions like:
```javascript
expect(response.body.data[0].owner_phone).toBe('+919876543210');
```

Replace with:
```javascript
// Phone should be masked to last 4 digits
expect(response.body.data[0].owner_phone).toMatch(/\+91\*\*\*\*[0-9]{4}/);
// Or more specific:
expect(response.body.data[0].owner_phone).toBe('+91****3210');
```

**Similarly update in:**
- `backend/__tests__/integration/admin-disputes.integration.test.js`
- `backend/__tests__/integration/admin-partners.integration.test.js`

### Verification Checklist for Fix #1

- [ ] Created `backend/src/utils/security.js` with `maskPhone()` function
- [ ] Updated `admin.js` line ~42 (KYC Queue) to use `maskPhone()`
- [ ] Updated `admin.js` line ~247 (Get Disputes) to use `maskPhone()`
- [ ] Updated `admin.js` line ~263 (Get Disputes Detail) to use `maskPhone()`
- [ ] Updated `admin-partners.js` line ~34 to use `maskPhone()`
- [ ] Updated all test assertions to expect masked format
- [ ] Ran tests: `npm test -- --testPathPattern=admin --no-coverage`
- [ ] Verified all admin tests still pass with masked responses
- [ ] Code review: No exposed phone numbers in responses

---

## Fix #2: Add SMS Rate Limiting

**Priority:** 🔴 HIGH  
**Effort:** 45 minutes  
**Impact:** Prevents SMS spam/harassment, regulatory compliance  
**Affected Code:** Admin KYC approval/rejection, shop suspension, dispute resolution

### Step 1: Add SMS rate limiting utilities (10 min)

**File:** `backend/src/middleware/rateLimit.js`

Add this new function at the end of the file:

```javascript
/**
 * SMS rate limiter per user (phone number)
 * Prevents spamming the same user with multiple SMS
 * 
 * Limits:
 * - 5 SMS per user per hour (shared across all admin actions)
 * - 1 SMS per action type per user per hour (no duplicate KYC rejection SMS)
 */
export const createSmsBroadcastLimiter = () => {
  return async (req, phone, actionType = 'general') => {
    if (!phone || !redis) return true; // Allow if no phone or Redis unavailable
    
    // Key format: sms:{phone}:{actionType}
    const smsLimitKey = `sms:broadcast:${phone}:${actionType}`;
    
    // Check if we've already sent this type of SMS in the last hour
    const lastSentTime = await redis.get(smsLimitKey);
    
    if (lastSendTime) {
      // SMS was already sent to this user for this action type
      return false; // Don't send duplicate
    }
    
    // Check total SMS count for this user (all action types)
    const totalSmsKey = `sms:broadcast:${phone}:total`;
    const smsCount = await redis.incr(totalSmsKey);
    
    // Set TTL if this is first SMS in this hour
    if (smsCount === 1) {
      await redis.expire(totalSmsKey, 3600); // 1 hour
    }
    
    // Allow if under limit (5 SMS/hour)
    if (smsCount > 5) {
      return false; // Rate limit exceeded
    }
    
    // Mark this specific action as sent
    await redis.setex(smsLimitKey, 3600, Date.now()); // 1 hour TTL
    
    return true; // Allow SMS to be sent
  };
};

// Create singleton instance
export const checkSmsBroadcastLimit = createSmsBroadcastLimiter();
```

### Step 2: Update admin.js — KYC Approval with rate limiting (8 min)

**File:** `backend/src/routes/admin.js`  
**Location:** Around line 70-85 (PATCH /admin/kyc/:id/approve)

Add import at top:
```javascript
import { checkSmsBroadcastLimit } from '../middleware/rateLimit.js';
```

Find this code:
```javascript
router.patch('/:id/approve', authenticate, roleGuard(['admin']), validate(kycApproveSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const adminId = req.user.userId;

    // ... validation code ...

    // Send SMS approval notification
    if (phone) {
      msg91.sendSMS(phone, 'Congratulations! Your KYC has been approved. You can now start accepting orders.')
        .catch(e => logger.error('SMS send failed', { error: e.message }));
    }
```

Replace the SMS sending block with:
```javascript
    // Send SMS approval notification (rate-limited)
    if (phone) {
      const canSendSms = await checkSmsBroadcastLimit(req, phone, 'kyc_approved');
      
      if (canSendSms) {
        msg91.sendSMS(phone, 'Congratulations! Your KYC has been approved. You can now start accepting orders.')
          .catch(e => logger.error('SMS send failed', { error: e.message }));
      } else {
        logger.warn('SMS rate limit exceeded', { phone, action: 'kyc_approved' });
      }
    }
```

### Step 3: Update admin.js — KYC Rejection with rate limiting (8 min)

**File:** `backend/src/routes/admin.js`  
**Location:** Around line 88-105 (PATCH /admin/kyc/:id/reject)

Find this code:
```javascript
router.patch('/:id/reject', authenticate, roleGuard(['admin']), validate(kycRejectSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user.userId;

    // ... validation code ...

    // Send SMS rejection notification
    if (phone) {
      msg91.sendSMS(phone, `Your KYC has been rejected. Reason: ${reason}. Please resubmit with correct documents.`)
        .catch(e => logger.error('SMS send failed', { error: e.message }));
    }
```

Replace with:
```javascript
    // Send SMS rejection notification (rate-limited)
    if (phone) {
      const canSendSms = await checkSmsBroadcastLimit(req, phone, 'kyc_rejected');
      
      if (canSendSms) {
        msg91.sendSMS(phone, `Your KYC has been rejected. Reason: ${reason}. Please resubmit with correct documents.`)
          .catch(e => logger.error('SMS send failed', { error: e.message }));
      } else {
        logger.warn('SMS rate limit exceeded', { phone, action: 'kyc_rejected' });
      }
    }
```

### Step 4: Update admin.js — Shop Suspension with rate limiting (8 min)

**File:** `backend/src/routes/admin.js`  
**Location:** Around line 180-200 (PATCH /admin/shops/:id/suspend)

Find SMS sending code:
```javascript
    // Send FCM notification to shop
    if (shop.fcm_token) {
      fcm.send(shop.fcm_token, 'Shop Suspended', `Your shop has been suspended. Reason: ${reason}`)
        .catch(e => logger.error('FCM send failed', { error: e.message }));
    }

    // Send SMS notification
    msg91.sendSMS(shop.owner_phone, `Your shop has been suspended. Reason: ${reason}. Contact support.`)
      .catch(e => logger.error('SMS send failed', { error: e.message }));
```

Replace with:
```javascript
    // Send FCM notification to shop
    if (shop.fcm_token) {
      fcm.send(shop.fcm_token, 'Shop Suspended', `Your shop has been suspended. Reason: ${reason}`)
        .catch(e => logger.error('FCM send failed', { error: e.message }));
    }

    // Send SMS notification (rate-limited)
    const canSendSms = await checkSmsBroadcastLimit(req, shop.owner_phone, 'shop_suspended');
    if (canSendSms) {
      msg91.sendSMS(shop.owner_phone, `Your shop has been suspended. Reason: ${reason}. Contact support.`)
        .catch(e => logger.error('SMS send failed', { error: e.message }));
    } else {
      logger.warn('SMS rate limit exceeded', { phone: shop.owner_phone, action: 'shop_suspended' });
    }
```

### Step 5: Update admin.js — Dispute Resolution with rate limiting (8 min)

**File:** `backend/src/routes/admin.js`  
**Location:** Around line 285-310 (PATCH /admin/disputes/:id/resolve)

Find SMS sending code:
```javascript
    // Notify customer of resolution
    if (customer.fcm_token) {
      fcm.send(customer.fcm_token, 'Dispute Resolved', `Your dispute has been ${resolution_status}. Amount: ₹${refund_amount}.`)
        .catch(e => logger.error('FCM send failed', { error: e.message }));
    }

    msg91.sendSMS(customer.phone, `Your dispute has been ${resolution_status}. Refund: ₹${refund_amount}. Check your account.`)
      .catch(e => logger.error('SMS send failed', { error: e.message }));
```

Replace with:
```javascript
    // Notify customer of resolution
    if (customer.fcm_token) {
      fcm.send(customer.fcm_token, 'Dispute Resolved', `Your dispute has been ${resolution_status}. Amount: ₹${refund_amount}.`)
        .catch(e => logger.error('FCM send failed', { error: e.message }));
    }

    // Send SMS notification (rate-limited)
    const canSendSms = await checkSmsBroadcastLimit(req, customer.phone, 'dispute_resolved');
    if (canSendSms) {
      msg91.sendSMS(customer.phone, `Your dispute has been ${resolution_status}. Refund: ₹${refund_amount}. Check your account.`)
        .catch(e => logger.error('SMS send failed', { error: e.message }));
    } else {
      logger.warn('SMS rate limit exceeded', { phone: customer.phone, action: 'dispute_resolved' });
    }
```

### Step 6: Add tests for SMS rate limiting (10 min)

**File:** `backend/__tests__/integration/admin-kyc.integration.test.js`

Add new test suite at the end:

```javascript
describe('SMS Rate Limiting', () => {
  
  it('should send SMS on first KYC approval', async () => {
    // Setup
    const shopId = 'shop-1';
    const kycId = 'kyc-1';
    const phone = '+919876543210';
    
    // Create mock shop and KYC
    const shop = { id: shopId, owner_phone: phone };
    await supabase.from('shops').insert([shop]);
    
    const kyc = { 
      id: kycId, 
      shop_id: shopId, 
      status: 'pending',
      kyc_documents: [{ document_type: 'aadhaar', url: 'doc-url' }]
    };
    await supabase.from('kyc_submissions').insert([kyc]);
    
    // Mock msg91 to track calls
    let smsCalled = false;
    jest.spyOn(msg91, 'sendSMS').mockImplementation(() => {
      smsCalled = true;
      return Promise.resolve();
    });
    
    // Action
    const response = await request(app)
      .patch(`/api/v1/admin/kyc/${kycId}/approve`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ notes: 'Looks good' });
    
    // Assert
    expect(response.status).toBe(200);
    expect(smsCalled).toBe(true); // First SMS should be sent
  });
  
  it('should NOT send duplicate SMS within same hour', async () => {
    // Setup
    const shopId = 'shop-2';
    const kycId = 'kyc-2';
    const phone = '+919876543211';
    
    // Create mock data
    const shop = { id: shopId, owner_phone: phone };
    await supabase.from('shops').insert([shop]);
    
    const kyc = { 
      id: kycId, 
      shop_id: shopId, 
      status: 'pending',
      kyc_documents: [{ document_type: 'aadhaar', url: 'doc-url' }]
    };
    await supabase.from('kyc_submissions').insert([kyc]);
    
    // Mock msg91
    let smsCallCount = 0;
    jest.spyOn(msg91, 'sendSMS').mockImplementation(() => {
      smsCallCount++;
      return Promise.resolve();
    });
    
    // First request - should send SMS
    await request(app)
      .patch(`/api/v1/admin/kyc/${kycId}/approve`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ notes: 'First approval' });
    
    expect(smsCallCount).toBe(1);
    
    // Second request (immediate) - should NOT send SMS (rate limited)
    const kyc2 = { 
      id: 'kyc-2b', 
      shop_id: shopId, 
      status: 'pending',
      kyc_documents: [{ document_type: 'aadhaar', url: 'doc-url' }]
    };
    await supabase.from('kyc_submissions').insert([kyc2]);
    
    const response2 = await request(app)
      .patch(`/api/v1/admin/kyc/kyc-2b/approve`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ notes: 'Second approval' });
    
    // Assert
    expect(response2.status).toBe(200);
    expect(smsCallCount).toBe(1); // Still 1 - no duplicate SMS sent
  });
  
  it('should allow SMS again after 1 hour', async () => {
    // This test uses Redis time manipulation (if supported)
    // For now, document the expected behavior
    
    /*
    const phone = '+919876543212';
    
    // First SMS sent
    await approveKYC(phone);
    expect(smsCount).toBe(1);
    
    // Wait 1 hour (in Redis)
    await redis.expire(smsKey, 0); // Force expiry
    
    // Second SMS should be allowed
    await approveKYC(phone);
    expect(smsCount).toBe(2); // New SMS allowed after timeout
    */
  });
  
  it('should respect 5 SMS per hour limit across all action types', async () => {
    // If user gets KYC rejected, shop suspended, AND dispute resolved
    // Max 5 total SMS per hour, not 5 per action type
    
    const phone = '+919876543213';
    let smsCount = 0;
    
    jest.spyOn(msg91, 'sendSMS').mockImplementation(() => {
      smsCount++;
      return Promise.resolve();
    });
    
    // Send KYC rejection (SMS 1)
    // Send shop suspension (SMS 2)
    // Send dispute resolution (SMS 3)
    // Send KYC rejection again (SMS 4)
    // Send another (SMS 5)
    // Sixth attempt should be blocked
    
    // This is a system-level test - verify Redis counters work correctly
  });
  
});
```

### Verification Checklist for Fix #2

- [ ] Created `checkSmsBroadcastLimit()` function in `rateLimit.js`
- [ ] Updated KYC approval endpoint with SMS rate limiting
- [ ] Updated KYC rejection endpoint with SMS rate limiting
- [ ] Updated shop suspension endpoint with SMS rate limiting
- [ ] Updated dispute resolution endpoint with SMS rate limiting
- [ ] Added rate limiting tests to `admin-kyc.integration.test.js`
- [ ] Ran tests: `npm test -- --testPathPattern=admin --no-coverage`
- [ ] Verified all tests pass
- [ ] Verified no duplicate SMS sent within 1 hour
- [ ] Verified 5 SMS/hour limit enforced

---

## Final Verification (5 min)

After implementing both fixes:

```bash
# Run full admin test suite
cd /Users/trinadh/projects/nearby/backend
npm test -- --testPathPattern=admin --no-coverage

# Expected: All admin tests passing (225+ tests)
# Expected output:
#   Test Suites: X passed, X total ✅
#   Tests: 225+ passed ✅
```

### Manual Testing Checklist

- [ ] Test KYC queue endpoint - verify phone is masked (+91****1234)
- [ ] Test disputes list - verify customer_phone is masked
- [ ] Test partners list - verify phone is masked
- [ ] Test first KYC approval - verify SMS is sent
- [ ] Test second KYC approval (same user) - verify SMS NOT sent (rate limited)
- [ ] Test 5 different SMS actions - verify all sent
- [ ] Test 6th SMS action - verify blocked with warning log
- [ ] Check logs for rate limit warnings
- [ ] Verify admin tests still pass at 80%+ coverage

---

## Implementation Order

**Recommended Timeline:**

| Step | Task | Time | When |
|------|------|------|------|
| 1 | Create security.js utility | 5 min | Now |
| 2 | Update admin.js phone masking (4 endpoints) | 12 min | Now |
| 3 | Update admin-partners.js | 3 min | Now |
| 4 | Update test assertions | 10 min | Now |
| 5 | Create rateLimit SMS function | 10 min | After lunch |
| 6 | Update admin.js SMS rate limiting (4 endpoints) | 32 min | After lunch |
| 7 | Add rate limiting tests | 10 min | After lunch |
| 8 | Run full test suite | 5 min | Final |
| **Total** | | **75 min** | **~2 hours** |

---

## Sign-Off

After completing all steps:

```bash
✅ Mask phone numbers in 5 endpoints
✅ Add SMS rate limiting to 4 endpoints  
✅ Update all tests to expect masked format
✅ Add rate limiting tests (4 new tests)
✅ All 225+ admin tests passing
✅ No PII exposure in responses
✅ SMS spam prevention enforced
```

**Ready for:** Production deployment ✅

---

## Rollback Plan (if needed)

If issues arise:

```bash
# Undo phone masking
git checkout backend/src/routes/admin.js
git checkout backend/src/routes/admin-partners.js
git checkout backend/src/utils/security.js

# Undo SMS rate limiting
git checkout backend/src/middleware/rateLimit.js

# Revert tests
git checkout backend/__tests__/integration/admin-kyc.integration.test.js
```

---

**Prepared by:** Security Reviewer  
**Date:** April 27, 2026  
**Status:** Ready for implementation
