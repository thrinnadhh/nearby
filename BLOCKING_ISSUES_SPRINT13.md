# BLOCKING ISSUES — SPRINT 13 TESTER REPORT
**Total Blockers:** 8 (down from 9 — 1 fixed ✅)  
**Status:** 🔴 CRITICAL — Cannot proceed to security review

---

## BUG #1: Axios Client Undefined  
**Severity:** 🔴 CRITICAL  
**Module:** Frontend (delivery app)  
**File:** `apps/delivery/src/services/api.ts`  
**Issue:** Axios client is undefined when interceptors are set up
```
ERROR: TypeError: Cannot read properties of undefined (reading 'interceptors')
Line: 21 (client.interceptors.request.use(...))
```
**Root Cause:** Line order — trying to use client before it's created  
**Fix:** Initialize client BEFORE setting up interceptors  
**Time:** 5 minutes

---

## BUG #2: Jest Environment Conflict  
**Severity:** 🔴 CRITICAL  
**Module:** Frontend (delivery app)  
**File:** `apps/delivery/jest.config.js`  
**Issue:** Tests need jsdom for renderHook, but config conflicts  

**Original Error:**
```
TypeError: Cannot redefine property: window
  (from react-native setup.js)
```

**Current State:**  
- Removed jsdom from config (fixed window error)
- Now reveals NEW issue: renderHook needs jsdom (document is undefined)

**Root Cause:** 
- Tests use `renderHook` from @testing-library/react (web library)
- React-native preset doesn't provide jsdom
- Can't render React without jsdom OR need react-native-testing-library

**Solution Choices:**
- **Option A:** Use jsdom testEnvironment + switch to react-native-testing-library
- **Option B:** Remove jsdom, rewrite tests for React Native environment
- **Option C:** Split tests (unit in node, components in jsdom)

**Recommended:** Option C (split by test type)  
**Time:** 30 minutes

---

## BUG #3: Delivery-Partners Registration Test Fails  
**Severity:** 🔴 CRITICAL  
**Module:** Backend  
**File:** `backend/__tests__/integration/delivery-partners-registration.integration.test.js`  
**Issue:** Redis mock not configured before test calls redis.del()
```
ERROR: TypeError: Cannot read properties of undefined (reading 'del')
Location: __tests__/integration/delivery-partners-registration.integration.test.js:20
```

**Root Cause:** 
- Line 20 tries to call redis.del()
- Redis client is not mocked in jest.setup.js or test file
- io-redis connects to real Redis (which isn't running)

**Fix:** Add Redis mock to test setup
```javascript
// In jest.setup.js or at top of test file:
jest.mock('ioredis');
jest.mock('../services/redis.js', () => ({
  redis: {
    del: jest.fn().mockResolvedValue(1),
    // ... other methods
  }
}));
```

**Time:** 15 minutes

---

## BUG #4: Supabase Mock Structure Mismatch  
**Severity:** 🟠 HIGH  
**Module:** Backend  
**File:** `backend/src/routes/__tests__/products-low-stock.test.js`  
**Issue:** Mock setup doesn't match actual test usage pattern
```
ERROR: TypeError: Cannot read properties of undefined (reading 'select')
Location: Line 708 (supabaseService.supabase.from('shops').select...)
```

**Root Cause:**
- Test tries to chain: `.from('shops').select().eq().single()`
- Mock only mocks the first `.from()` call
- Missing the return values for `.select()` chain

**Fix:** Proper mock chain setup
```javascript
supabaseService.supabase.from = jest.fn().mockReturnValue({
  select: jest.fn().mockReturnValue({
    eq: jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({
        data: { id: TEST_SHOP_ID, owner_id: TEST_USER_ID },
        error: null,
      }),
    }),
  }),
});
```

**Time:** 20 minutes

---

## BUG #5: Test File Path Mismatch  
**Severity:** 🟠 HIGH  
**Module:** Backend  
**File:** `backend/__tests__/products.low-stock.test.js`  
**Issue:** Import path is wrong for directory structure
```
ERROR: Cannot find module '../services/supabase.js'
    at Resolver._throwModNotFoundError (__tests__/products.low-stock.test.js:14)
```

**Root Cause:**
- Test file is at: `backend/__tests__/products.low-stock.test.js`
- Imports from: `../services/supabase.js` ❌
- Should import from: `../../services/supabase.js` ✅

**Fix:** Change line 14
```javascript
// FROM:
jest.mock('../services/supabase.js');

// TO:
jest.mock('../../services/supabase.js');
```

**Time:** 5 minutes

---

## BUG #6: Zustand Store Type Casting Error  
**Severity:** 🟠 HIGH  
**Module:** Frontend  
**File:** `apps/delivery/src/screens/__tests__/screens.test.tsx`  
**Issue:** Cannot cast Zustand hook to jest.Mock (TypeScript error)
```
ERROR: Type 'UseBoundStore<...>' is not assignable to type 'Mock<any, any, any>'
Locations: Lines 17, 37, 57, 78, 102, 129 (6 instances)
```

**Root Cause:**
- Zustand store is a function, not a jest.Mock
- Type casting with `as jest.Mock` doesn't work for Zustand
- Need proper jest.spyOn() approach instead

**Fix:** Use jest.spyOn() instead of casting
```javascript
// CURRENT (broken):
(usePartnerStore as jest.Mock).mockReturnValue({...})

// FIXED:
jest.spyOn(partnerStoreModule, 'usePartnerStore').mockReturnValue({...})

// OR use proper Zustand mocking:
jest.mock('@/store/partner', () => ({
  usePartnerStore: jest.fn().mockReturnValue({...})
}))
```

**Time:** 20 minutes

---

## BUG #7: Missing Products.js Class Closing Brace  
**Severity:** 🔴 CRITICAL  
**Module:** Backend  
**File:** `backend/src/services/products.js`  
**Issue:** Missing closing brace for ProductService class  
**Status:** ✅ **FIXED** (line 799: added `}`)  
**Time:** — (already fixed)

---

## BUG #8: Delivery-Partners Router Mounting  
**Severity:** 🔴 CRITICAL  
**Module:** Backend  
**File:** `backend/src/index.js`  
**Issue:** Delivery-partners router not imported or mounted  
**Status:** ✅ **FIXED** (mounted at lines 144, 150)  
**Time:** — (already fixed)

---

## Summary Table

| # | Issue | Module | Severity | Status | Time |
|---|-------|--------|----------|--------|------|
| 1 | Axios client undefined | Frontend | 🔴 CRITICAL | ❌ BLOCKED | 5m |
| 2 | Jest env (jsdom/react-native) | Frontend | 🔴 CRITICAL | ❌ BLOCKED | 30m |
| 3 | Redis mock missing | Backend | 🔴 CRITICAL | ❌ BLOCKED | 15m |
| 4 | Supabase mock mismatch | Backend | 🟠 HIGH | ❌ BLOCKED | 20m |
| 5 | Path mismatch (__tests__) | Backend | 🟠 HIGH | ❌ BLOCKED | 5m |
| 6 | Zustand type casting | Frontend | 🟠 HIGH | ❌ BLOCKED | 20m |
| 7 | Products.js missing } | Backend | 🔴 CRITICAL | ✅ FIXED | — |
| 8 | Router not mounted | Backend | 🔴 CRITICAL | ✅ FIXED | — |

**Total Fix Time:** ~95 minutes (1.6 hours)

---

## Test Results After Fixes

### Expected After All Fixes
```
Backend:
  Test Suites: 34/34 passing ✅
  Tests: 421/421 passing ✅
  Coverage: 80%+ ✅

Frontend:
  Test Suites: 8/8 passing ✅
  Tests: 30/30 passing ✅
  Coverage: 80%+ ✅

Overall:
  Status: READY FOR SECURITY REVIEW ✅
```

---

## Next Action

🔴 **ROUTE BACK TO nearby-builder**

Builder should:
1. Fix BUG #1 (Axios initialization)
2. Fix BUG #2 (Jest environment)
3. Fix BUG #3 (Redis mock)
4. Fix BUG #4 (Supabase mock)
5. Fix BUG #5 (Path mismatch)
6. Fix BUG #6 (Zustand typing)

After fixes:
- Run full test suite
- Verify coverage ≥80%
- Re-route to tester for final validation

---

**NearBy Tester**  
April 19, 2026 @ 11:50 UTC
