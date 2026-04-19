# Sprint 13 Testing — Critical Blockers

## ❌ FAIL — 9 Critical Issues Blocking Tests

**Status**: NOT READY FOR TESTING  
**Date**: April 19, 2026  
**Coverage**: Frontend 1.44% (vs 80%), Backend 0.44% (vs 80%)

---

## BUG [1]: delivery-partners Router NOT Mounted
**Severity**: CRITICAL — BLOCKER  
**File**: backend/src/index.js  
**Issue**: delivery-partners.js router exists but is not imported or mounted  
**Impact**: All 4 delivery-partner endpoints return 404 or are unreachable

**Evidence**:
- ✓ File exists: `backend/src/routes/delivery-partners.js` (556 lines)
- ✓ Router exported: `export default router;` at line 556
- ✗ NOT imported in index.js
- ✗ NOT mounted in any app.use() call

**Current State**:
```javascript
// backend/src/index.js - Lines 115-125
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/shops', shopsRouter);
app.use('/api/v1', productsRouter);
app.use('/api/v1/orders', ordersRouter);
app.use('/api/v1/delivery', deliveryRouter);  // This is delivery.js, NOT delivery-partners.js
app.use('/api/v1/payments', paymentsRouter);
app.use('/api/v1/reviews', reviewsRouter);
```

**Routes NOT Accessible**:
- ❌ POST /api/v1/auth/partner/register (line 82 in delivery-partners.js)
- ❌ POST /api/v1/delivery-partners/:id/kyc (line 312 in delivery-partners.js)
- ❌ PATCH /api/v1/delivery-partners/:id (line 368 in delivery-partners.js)
- ❌ PATCH /api/v1/delivery-partners/:id/toggle-online (line 442 in delivery-partners.js)

**Fix**:
```javascript
// Add to backend/src/index.js at top with other imports (around line 23):
import deliveryPartnersRouter from './routes/delivery-partners.js';

// Add to backend/src/index.js around line 115 (with other app.use() calls):
app.use('/api/v1/auth', deliveryPartnersRouter);  // For POST /auth/partner/register
app.use('/api/v1', deliveryPartnersRouter);       // For /delivery-partners/* endpoints
```

---

## BUG [2]: Missing react-dom Dependency
**Severity**: CRITICAL — BLOCKER  
**File**: apps/delivery/package.json  
**Issue**: @testing-library/react requires react-dom but it's not in devDependencies  
**Impact**: 7 of 8 test suites fail to run

**Error**:
```
Cannot find module 'react-dom/test-utils' from 'node_modules/@testing-library/react/dist/act-compat.js'

Test suites affected:
- src/store/__tests__/partner.test.ts ❌
- src/store/__tests__/auth.test.ts ❌
- src/store/__tests__/registration.test.ts ❌
- src/hooks/__tests__/useAuth.test.ts ❌
- src/hooks/__tests__/useOnlineStatus.test.ts ❌
- src/services/__tests__/services.test.ts ❌
```

**Fix**:
```bash
cd apps/delivery && npm install --save-dev react-dom
```

Or add to package.json devDependencies:
```json
"react-dom": "^18.3.1"
```

---

## BUG [3]: registerPartner Not Exported
**Severity**: CRITICAL — BLOCKER  
**File**: apps/delivery/src/services/partner.ts  
**Issue**: useRegistration hook imports registerPartner but it doesn't exist  
**Impact**: Registration screen cannot call registration function

**Error**:
```
Module '"@/services/partner"' has no exported member 'registerPartner'

Location: apps/delivery/src/hooks/useRegistration.ts:8
```

**Current Code**:
```typescript
// apps/delivery/src/services/partner.ts
export async function submitKYC(partnerId: string, kyc: KYCDocument): Promise<any>
export async function updateBankDetails(partnerId: string, bankDetails: BankDetails): Promise<any>
// ❌ registerPartner NOT EXPORTED
```

**Import That Fails**:
```typescript
// apps/delivery/src/hooks/useRegistration.ts:8
import { registerPartner, submitKYC, updateBankDetails } from '@/services/partner';  // ❌ registerPartner missing
```

**Fix**: Add to partner.ts:
```typescript
/**
 * POST /api/v1/auth/partner/register
 * Register new delivery partner with phone + OTP
 */
export async function registerPartner(
  phone: string,
  otp: string
): Promise<{ userId: string; phone: string; token: string; role: 'delivery' }> {
  try {
    const { data } = await client.post<{ success: boolean; data: any }>(
      PARTNER_ENDPOINTS.REGISTER,
      { phone, otp }
    );
    
    logger.info('Partner registered', { phone });
    return data.data;
  } catch (error) {
    const message = extractErrorMessage(error);
    logger.error('Partner registration failed', { error: message });
    
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 409) {
        throw new AppErrorClass('DUPLICATE_PARTNER', 'Phone already registered', 409);
      }
      if (status === 429) {
        throw new AppErrorClass('OTP_LOCKED', 'Too many attempts. Try again later', 429);
      }
      if (status === 400) {
        throw new AppErrorClass('INVALID_OTP', 'Invalid or expired OTP', 400);
      }
    }
    
    throw new AppErrorClass('REGISTRATION_FAILED', message, 500);
  }
}
```

---

## BUG [4]: Axios Client Undefined
**Severity**: CRITICAL — BLOCKER  
**File**: apps/delivery/src/services/api.ts  
**Issue**: client is not defined when interceptors are called  
**Impact**: services.test.ts fails to load, all API calls fail at runtime

**Error**:
```
TypeError: Cannot read properties of undefined (reading 'interceptors')

Location: apps/delivery/src/services/api.ts:19:8
Code: client.interceptors.request.use(...)
```

**Current Code** (apps/delivery/src/services/api.ts):
```typescript
import { useAuthStore } from '@/store/auth';

client.interceptors.request.use(  // ❌ client is undefined here
  (config) => {
    try {
      const token = useAuthStore.getState().token;
      ...
```

**Fix**: The client needs to be imported before use. Check that it's properly initialized:
```typescript
import axios from 'axios';
import { useAuthStore } from '@/store/auth';

const client = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
  timeout: 10000,
});

// Now interceptors can be set
client.interceptors.request.use(...)
```

---

## BUG [5]: FileSystem Import Wrong
**Severity**: HIGH  
**File**: apps/delivery/src/services/file-upload.ts  
**Issue**: Incorrect import from expo-file-system  
**Line**: 5  
**Impact**: Coverage collection fails, FileSystem calls fail at runtime

**Error**:
```
Module '"expo-file-system"' has no exported member 'FileSystem'
```

**Current Code**:
```typescript
import { FileSystem } from 'expo-file-system';  // ❌ Wrong
```

**Fix**:
```typescript
import FileSystem from 'expo-file-system';  // ✓ Correct default export
```

Or use the correct named import:
```typescript
import * as FileSystem from 'expo-file-system';
```

---

## BUG [6]: Missing Style Property - OnlineToggleScreen
**Severity**: HIGH  
**File**: apps/delivery/src/screens/OnlineToggleScreen.tsx  
**Line**: 18  
**Issue**: StyleSheet doesn't define message property but code uses it  
**Impact**: Coverage fails, render fails at runtime

**Error**:
```
Property 'message' does not exist on type { container, content, title, ... }
```

**Current Code**:
```typescript
<Text style={styles.message}>Loading...</Text>  // ❌ styles.message doesn't exist
```

**Fix**: Add to styles:
```typescript
const styles = StyleSheet.create({
  // ... existing styles ...
  message: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
});
```

---

## BUG [7]: Missing Style Property - HomeScreen
**Severity**: HIGH  
**File**: apps/delivery/src/screens/HomeScreen.tsx  
**Line**: 22  
**Issue**: Same as BUG [6]  
**Impact**: Coverage fails, render fails at runtime

**Fix**: Add message style same as BUG [6]

---

## BUG [8]: No Integration Test File
**Severity**: HIGH  
**File**: Missing backend/__tests__/integration/delivery-partners-registration.integration.test.js  
**Issue**: Delivery-partner registration flow has no test coverage  
**Impact**: 0% coverage on delivery-partners.js route (40+ test cases needed)

**Required Tests** (minimum 40):
1. **Registration** (POST /auth/partner/register) - 12 tests
   - Happy path: valid phone + OTP
   - INVALID_OTP: wrong code
   - OTP_EXPIRED: not found
   - OTP_LOCKED: 3 failed attempts
   - DUPLICATE_SHOP: phone already registered
   - Validation errors: phone not 10 digits, OTP not 6 digits
   - 401 Unauthorized (if protected)
   - Creates profiles + delivery_partners record
   - Returns token + userId + phone
   - Clears OTP from Redis

2. **KYC Submission** (POST /delivery-partners/:id/kyc) - 10 tests
   - Happy path
   - Ownership check (403 if different user)
   - Validation: Aadhaar, URLs
   - Partner not found (404)
   - Status becomes pending_review

3. **Bank Details** (PATCH /delivery-partners/:id) - 10 tests
   - Happy path
   - Account validation (9-18 digits)
   - IFSC validation (11 chars, XXXX0XXXXXX format)
   - Ownership check (403)
   - Partner not found (404)

4. **Toggle Online** (PATCH /delivery-partners/:id/toggle-online) - 8 tests
   - Happy path: toggle is_online
   - Rate limit: max 10/minute (429 on 11th)
   - KYC check: cannot toggle if kyc_status != 'approved'
   - Returns current online status

---

## BUG [9]: Missing Frontend Screens
**Severity**: MEDIUM  
**Issue**: Registration flow requires screens that don't exist  
**Impact**: Registration flow incomplete

**Missing Files**:
- apps/delivery/src/screens/AadhaarScreen.tsx
- apps/delivery/src/screens/VehiclePhotoScreen.tsx
- apps/delivery/src/screens/BankDetailsScreen.tsx

**These should**:
1. AadhaarScreen: Capture Aadhaar last 4 digits, display in registration flow
2. VehiclePhotoScreen: Let partner take photo of vehicle, upload to R2
3. BankDetailsScreen: Collect bank account + IFSC, validate with Joi

---

## Summary Table

| # | Bug | Severity | Component | Fix Time | Status |
|---|-----|----------|-----------|----------|--------|
| 1 | Router not mounted | CRITICAL | Backend | 5 min | ❌ |
| 2 | Missing react-dom | CRITICAL | Frontend | 1 min | ❌ |
| 3 | registerPartner missing | CRITICAL | Frontend | 10 min | ❌ |
| 4 | axios client undefined | CRITICAL | Frontend | 5 min | ❌ |
| 5 | FileSystem import | HIGH | Frontend | 2 min | ❌ |
| 6 | Style missing (Online) | HIGH | Frontend | 3 min | ❌ |
| 7 | Style missing (Home) | HIGH | Frontend | 3 min | ❌ |
| 8 | No integration tests | HIGH | Backend | 60 min | ❌ |
| 9 | Missing screens | MEDIUM | Frontend | 45 min | ❌ |

**Total Fix Time**: ~134 minutes (2.2 hours)

---

## Recommendation

**ROUTE BACK TO BUILDER** — 9 blocking issues prevent testing

**Priority Order**:
1. **Immediate** (5 min each):
   - Mount delivery-partners router in backend/src/index.js
   - Add react-dom to frontend package.json
   - Fix axios client initialization

2. **Quick** (10-15 min):
   - Export registerPartner from partner.ts
   - Fix FileSystem import
   - Add missing style properties

3. **Coverage** (60-90 min):
   - Write integration test file for delivery-partners
   - Create missing frontend screens

**After Fixes**:
- Run tests again
- Target: All 40+ tests passing, 80%+ coverage
- Then route to security review

**Status**: ❌ NOT READY FOR PRODUCTION
