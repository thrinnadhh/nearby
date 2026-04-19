# DETAILED FAILURE ANALYSIS & FIX GUIDE

**For:** nearby-builder  
**From:** nearby-tester  
**Date:** April 19, 2026

---

## FAILURE #1: products-low-stock Route Not Mounted

### Current State
```
File location: backend/src/routes/products-low-stock.snippet.js
Status: ✓ Code exists (62 lines)
Status: ❌ Not integrated into products.js
Status: ❌ Not imported in index.js
Result: All 28 tests receive 404 Not Found
```

### The Problem
Tests attempt to call: `GET /api/v1/shops/:shopId/products/low-stock`

Expected behavior:
- ✓ Shop owner auth verified
- ✓ Query products with stock < threshold
- ✓ Return paginated results with metadata

Actual behavior:
- ✗ Route returns 404 (endpoint not registered)
- ✗ Express cannot find the route handler

### Why It Happens
The route code was created as a `.snippet.js` file (template/placeholder) but was never merged into the actual `products.js` router.

### Test Failure Details

**All 28 failures follow identical pattern:**

```javascript
// Expected by test:
expect(res.status).toBe(200);

// What test receives:
res.status === 404

// Because: Route handler doesn't exist
```

**Examples of failing tests:**

| Test Name | Expected | Received | Line |
|-----------|----------|----------|------|
| Happy Path: "should return low stock products" | 200 | 404 | 128 |
| AC1: "should return only items with stock < threshold" | 200 | 404 | 237 |
| AC3: "pagination works correctly" | 200 | 404 | 325 |
| EC1: "threshold below 1 returns 400" | 400 | 404 | 499 |
| EC5: "empty result returns 200 with empty array" | 200 | 404 | 615 |
| Error case: "returns 403 FORBIDDEN" | 403 | 404 | 693 |
| Error case: "returns 500 on DB error" | 500 | 404 | 733 |

### How to Fix (5 minutes)

#### Step 1: Read the snippet file
```bash
cat backend/src/routes/products-low-stock.snippet.js
```

This shows the complete route handler (60+ lines).

#### Step 2: Open products.js
```bash
nano backend/src/routes/products.js
# or use VS Code
code backend/src/routes/products.js
```

#### Step 3: Find where to insert
Look for the line: `export default router;`

This should be at the end of the file (around line 300+).

**DO NOT** replace this line. Instead, insert the snippet **BEFORE** it.

#### Step 4: Copy and paste
Copy all code from `products-low-stock.snippet.js` **EXCEPT** the comment header (lines 1-11).

Paste starting at line **before** `export default router;`

The handler should start with:
```javascript
/**
 * GET /api/v1/shops/:shopId/products/low-stock
 * List products below low stock threshold for a shop.
 * ...
 */
router.get(
  '/shops/:shopId/products/low-stock',
  authenticate,
  roleGuard(['shop_owner']),
  ...
```

#### Step 5: Verify syntax
```bash
cd backend
npm run lint -- src/routes/products.js
```

Should show no errors.

#### Step 6: Run tests
```bash
npm test -- src/routes/__tests__/products-low-stock.test.js
```

Expected: All 28 tests should PASS ✓

#### Step 7: Verify coverage
```bash
npm test -- src/routes/__tests__/products-low-stock.test.js --coverage
```

Should show ~100% coverage on the new route.

---

## FAILURE #2: Redis Connection Failed in Integration Tests

### Current State
```
Test: delivery-partners-registration.integration.test.js
Status: ✓ Test code is correct
Status: ❌ Redis not running (ECONNREFUSED 127.0.0.1:6379)
Status: ❌ Hangs/times out
Result: No test results (test blocks)
```

### The Problem
```
Test code tries: await redis.setex(`otp:code:${testPhone}`, 300, testOtp);
Error received: ECONNREFUSED 127.0.0.1:6379
Meaning: Cannot connect to Redis at localhost:6379
```

### Root Cause
Redis server is not running in the test environment. The test environment setup needs to either:
1. Start Redis before tests run, OR
2. Mock Redis connections, OR
3. Use Docker Compose with services defined

### Test Structure
```javascript
beforeEach(async () => {
  // Try to connect to Redis and store test OTP
  await redis.setex(`otp:code:${testPhone}`, 300, testOtp);
  // This line fails because Redis not running ↑
});

it('should register delivery partner with valid phone + OTP', async () => {
  const response = await request(app)
    .post('/api/v1/auth/partner/register')
    .send({ phone: testPhone, otp: testOtp });
  
  expect(response.status).toBe(201);
  // Test would reach here IF beforeEach succeeded
});
```

### How to Fix (15 minutes)

#### Option A: Start Redis server (Recommended for local testing)

**On macOS (using Homebrew):**
```bash
# Install Redis if not already installed
brew install redis

# Start Redis in foreground (leave running in terminal)
redis-server

# In ANOTHER terminal, run tests
cd /Users/trinadh/projects/nearby/backend
npm test -- __tests__/integration/delivery-partners-registration.integration.test.js
```

**Or run Redis in background:**
```bash
brew services start redis
npm test -- __tests__/integration/delivery-partners-registration.integration.test.js
brew services stop redis
```

**Using Docker:**
```bash
docker run -d -p 6379:6379 redis:7-alpine
npm test -- __tests__/integration/delivery-partners-registration.integration.test.js
docker stop <container_id>
```

#### Option B: Use Docker Compose (Production-like setup)
```bash
# From project root
docker-compose up -d

# Run tests
cd backend
npm test -- __tests__/integration/delivery-partners-registration.integration.test.js

# Stop services
docker-compose down
```

#### Option C: Mock Redis for this test (if Redis not available)
Modify test to use Redis mock:
```javascript
import redis from 'redis';

// If running in test environment without real Redis:
jest.mock('../../src/services/redis.js', () => ({
  redis: {
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    get: jest.fn().mockResolvedValue('123456'),
  }
}));
```

**Recommendation:** Use Option A (start Redis) for true integration testing.

#### Step-by-step (Option A recommended):
```bash
# Terminal 1: Start Redis
redis-server

# Terminal 2: Run just this test
cd /Users/trinadh/projects/nearby/backend
npm test -- __tests__/integration/delivery-partners-registration.integration.test.js

# Expected output:
# PASS __tests__/integration/delivery-partners-registration.integration.test.js
# ✓ should register delivery partner with valid phone + OTP
# ✓ [other tests...]
# Tests: 5 passed, 5 total
```

---

## POST-FIX VERIFICATION CHECKLIST

After applying both fixes, run:

```bash
cd /Users/trinadh/projects/nearby

# Test 1: Verify products-low-stock route works
cd backend
npm test -- src/routes/__tests__/products-low-stock.test.js 2>&1 | tail -20
# Expected: Test Suites: 1 passed, Tests: 28 passed

# Test 2: Verify delivery-partners integration test works  
npm test -- __tests__/integration/delivery-partners-registration.integration.test.js 2>&1 | tail -20
# Expected: PASS (all tests pass, not timeout)

# Test 3: Run full backend test suite with coverage
npm test -- --coverage 2>&1 | grep "Test Suites:"
# Expected: Test Suites: 33 passed, 0 failed

# Test 4: Check overall coverage
npm test -- --coverage 2>&1 | grep -A 5 "All files"
# Expected: All files should show coverage increases

# Test 5: Verify frontend still passes
cd ../apps/delivery
npm test -- --coverage 2>&1 | grep "Test Suites:"
# Expected: Test Suites: 8 passed, 0 failed

# Test 6: Combined verification
cd /Users/trinadh/projects/nearby
echo "=== FULL TEST SUITE ===" && \
echo "" && \
echo "Frontend:" && \
cd apps/delivery && npm test -- --coverage 2>&1 | grep "Test Suites:" && \
echo "" && \
echo "Backend:" && \
cd ../../backend && npm test -- --coverage 2>&1 | grep "Test Suites:" && \
npm test -- --coverage 2>&1 | grep "All files" -A 1
```

---

## EXPECTED RESULTS AFTER FIXES

### Before Fixes:
```
Test Suites:   2 failed, 31 passed
Tests:        28 failed, 393 passed
Coverage:     44.7% overall
```

### After Fixes:
```
Test Suites:   0 failed, 33 passed ✓
Tests:         0 failed, 421 passed ✓
Coverage:      Expected ~65-70% (low-stock + partner tests add coverage)
```

**Note:** Coverage may still be below 80% even after these fixes because:
- Socket.IO handlers still need tests (0% coverage)
- Notification services still need tests (0% coverage)
- Frontend screens still need component tests (0% coverage)

But the **actively failing tests will be fixed** and the test suite will run to completion.

---

## FILES INVOLVED

| File | Action | Priority |
|------|--------|----------|
| `src/routes/products-low-stock.snippet.js` | Merge into products.js | 🔴 High |
| `src/routes/products.js` | Add route handler | 🔴 High |
| `__tests__/integration/delivery-partners-registration.integration.test.js` | No change needed | 🟡 Medium |
| Redis service | Start/ensure running | 🟡 Medium |

---

**Estimated Time to Fix:** 20 minutes total
- Merge products-low-stock: 5 min
- Start Redis + verify: 10 min
- Run full test suite + verify: 5 min

**Next Step:** Apply fixes, then notify tester when ready for re-test.
