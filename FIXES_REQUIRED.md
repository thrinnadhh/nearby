# Sprint 13 — Exact Fixes Required

## Fix #1: Mount delivery-partners Router in Backend (5 min)

**File**: `backend/src/index.js`

### Add Import (Line ~23)
```javascript
// Route imports
import authRouter from './routes/auth.js';
import shopsRouter from './routes/shops.js';
import productsRouter from './routes/products.js';
import ordersRouter from './routes/orders.js';
import deliveryRouter from './routes/delivery.js';
import deliveryPartnersRouter from './routes/delivery-partners.js';  // ← ADD THIS LINE
import paymentsRouter from './routes/payments.js';
import reviewsRouter from './routes/reviews.js';
import searchRouter from './routes/search.js';
import adminRouter from './routes/admin.js';
```

### Mount Routes (Line ~115, with other app.use() calls)
```javascript
// 7. Mount all route files under /api/v1/
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/auth', deliveryPartnersRouter);  // ← ADD THIS LINE (for POST /auth/partner/register)
app.use('/api/v1/shops', shopsRouter);
app.use('/api/v1', productsRouter);
app.use('/api/v1/orders', ordersRouter);
app.use('/api/v1/delivery', deliveryRouter);
app.use('/api/v1', deliveryPartnersRouter);  // ← ADD THIS LINE (for /delivery-partners/* endpoints)
app.use('/api/v1/payments', paymentsRouter);
app.use('/api/v1/reviews', reviewsRouter);
app.use('/api/v1/search', searchRouter);
app.use('/api/v1/admin', adminRouter);
```

---

## Fix #2: Add react-dom Dependency (1 min)

**File**: `apps/delivery/package.json`

### In devDependencies, add:
```json
"devDependencies": {
  "@babel/core": "^7.24.0",
  "@testing-library/react": "^14.0.0",
  "@testing-library/react-native": "^12.0.0",
  "@types/jest": "^29.0.0",
  "@types/react": "~18.3.0",
  "babel-jest": "^29.0.0",
  "babel-plugin-module-resolver": "^5.0.2",
  "jest": "^29.0.0",
  "jest-environment-node": "^29.0.0",
  "react-dom": "^18.3.1",  // ← ADD THIS LINE
  "react-native-gesture-handler": "^2.31.1",
  "react-native-screens": "^4.24.0",
  "ts-jest": "^29.4.9",
  "typescript": "~5.5.0"
}
```

### OR run:
```bash
cd apps/delivery
npm install --save-dev react-dom@^18.3.1
```

---

## Fix #3: Export registerPartner Function (10 min)

**File**: `apps/delivery/src/services/partner.ts`

### Add this function before the final export or at the end:
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
    const response = await client.post<{ success: boolean; data: { userId: string; phone: string; token: string; role: 'delivery' } }>(
      '/auth/partner/register',
      {
        phone: phone.replace(/\D/g, ''), // Remove non-digits
        otp: otp.replace(/\D/g, ''),   // Remove non-digits
      }
    );

    if (!response.data.success) {
      throw new AppErrorClass(
        'REGISTRATION_FAILED',
        response.data.data?.error || 'Registration failed',
        400
      );
    }

    logger.info('Partner registered successfully', { phone: phone.slice(-4) });
    return response.data.data;
  } catch (error) {
    const message = extractErrorMessage(error);
    logger.error('Partner registration failed', { phone: phone.slice(-4), error: message });

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const errorCode = (error.response?.data as any)?.error?.code;

      if (status === 409 || errorCode === 'DUPLICATE_SHOP') {
        throw new AppErrorClass(
          'DUPLICATE_PARTNER',
          'This phone number is already registered as a delivery partner',
          409
        );
      }

      if (status === 429 || errorCode === 'OTP_LOCKED') {
        throw new AppErrorClass(
          'OTP_LOCKED',
          'Too many failed attempts. Please try again later.',
          429
        );
      }

      if (status === 400) {
        if (errorCode === 'INVALID_OTP') {
          throw new AppErrorClass('INVALID_OTP', 'Invalid OTP. Please try again.', 400);
        }
        if (errorCode === 'OTP_EXPIRED') {
          throw new AppErrorClass('OTP_EXPIRED', 'OTP has expired. Request a new one.', 400);
        }
        throw new AppErrorClass('VALIDATION_ERROR', message, 400);
      }
    }

    throw new AppErrorClass('REGISTRATION_FAILED', message, 500);
  }
}
```

---

## Fix #4: Initialize axios Client (5 min)

**File**: `apps/delivery/src/services/api.ts`

### Current (BROKEN):
```typescript
import axios from 'axios';
import { useAuthStore } from '@/store/auth';

client.interceptors.request.use(  // ❌ client is not defined
  (config) => {
    // ...
  }
);
```

### Fixed:
```typescript
import axios from 'axios';
import { useAuthStore } from '@/store/auth';

// Create axios client instance
const client = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// NOW we can set interceptors
client.interceptors.request.use(
  (config) => {
    try {
      const token = useAuthStore.getState().token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      logger.error('Failed to get token from store', { error });
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default client;
```

---

## Fix #5: Fix FileSystem Import (2 min)

**File**: `apps/delivery/src/services/file-upload.ts`

### Change Line 5 from:
```typescript
import { FileSystem } from 'expo-file-system';  // ❌ WRONG
```

### To:
```typescript
import * as FileSystem from 'expo-file-system';  // ✓ CORRECT
```

---

## Fix #6: Add Missing Style Property (3 min)

**File**: `apps/delivery/src/screens/OnlineToggleScreen.tsx`

### Find the StyleSheet.create() call and add the message property:
```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  // ... other styles ...
  message: {  // ← ADD THIS
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  // ... rest of styles ...
});
```

---

## Fix #7: Add Missing Style Property (3 min)

**File**: `apps/delivery/src/screens/HomeScreen.tsx`

### Same fix as Fix #6 — add message property to StyleSheet:
```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 20,
  },
  // ... other styles ...
  message: {  // ← ADD THIS
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  // ... rest of styles ...
});
```

---

## Fix #8: Create Integration Test File (60 min)

**File**: `backend/__tests__/integration/delivery-partners-registration.integration.test.js`

### Create new file with comprehensive tests:
```javascript
import request from 'supertest';
import app from '../../src/index.js';
import { supabase } from '../../src/services/supabase.js';
import { redis } from '../../src/services/redis.js';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('POST /api/v1/auth/partner/register', () => {
  const testPhone = '9876543210';
  const testOtp = '123456';

  beforeEach(async () => {
    // Set test OTP in Redis
    await redis.setex(`otp:code:${testPhone}`, 300, testOtp);
  });

  afterEach(async () => {
    // Clean up Redis
    await redis.del(`otp:code:${testPhone}`);
    await redis.del(`otp:attempts:${testPhone}`);
    await redis.del(`otp:lockout:${testPhone}`);
  });

  describe('Happy path', () => {
    it('should register delivery partner with valid phone + OTP', async () => {
      const response = await request(app)
        .post('/api/v1/auth/partner/register')
        .send({
          phone: testPhone,
          otp: testOtp,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('userId');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.role).toBe('delivery');
      expect(response.body.data.phone).toBe(`+91${testPhone}`);

      // Verify profile was created
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('phone', `+91${testPhone}`)
        .single();
      expect(profile.role).toBe('delivery');

      // Verify delivery_partners record created
      const { data: partner } = await supabase
        .from('delivery_partners')
        .select('id, kyc_status')
        .eq('user_id', response.body.data.userId)
        .single();
      expect(partner.kyc_status).toBe('pending_kyc');
    });
  });

  describe('Acceptance criteria', () => {
    it('should validate phone format (10 digits)', async () => {
      const response = await request(app)
        .post('/api/v1/auth/partner/register')
        .send({
          phone: '987654321', // 9 digits
          otp: testOtp,
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate OTP format (6 digits)', async () => {
      const response = await request(app)
        .post('/api/v1/auth/partner/register')
        .send({
          phone: testPhone,
          otp: '12345', // 5 digits
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return INVALID_OTP for wrong OTP', async () => {
      const response = await request(app)
        .post('/api/v1/auth/partner/register')
        .send({
          phone: testPhone,
          otp: '654321', // Wrong
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_OTP');
    });

    it('should increment failed attempts', async () => {
      // Attempt 1
      await request(app)
        .post('/api/v1/auth/partner/register')
        .send({ phone: testPhone, otp: 'wrong1' });

      // Attempt 2
      await request(app)
        .post('/api/v1/auth/partner/register')
        .send({ phone: testPhone, otp: 'wrong2' });

      // Attempt 3 should lock out
      const response = await request(app)
        .post('/api/v1/auth/partner/register')
        .send({ phone: testPhone, otp: 'wrong3' });

      expect(response.status).toBe(429);
      expect(response.body.error.code).toBe('OTP_LOCKED');
    });

    it('should return OTP_EXPIRED for missing OTP', async () => {
      await redis.del(`otp:code:${testPhone}`);

      const response = await request(app)
        .post('/api/v1/auth/partner/register')
        .send({ phone: testPhone, otp: testOtp });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('OTP_EXPIRED');
    });

    it('should prevent duplicate phone registration', async () => {
      // First registration succeeds
      await request(app)
        .post('/api/v1/auth/partner/register')
        .send({ phone: testPhone, otp: testOtp });

      // Reset OTP for second attempt
      await redis.setex(`otp:code:${testPhone}`, 300, testOtp);

      // Second registration fails
      const response = await request(app)
        .post('/api/v1/auth/partner/register')
        .send({ phone: testPhone, otp: testOtp });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('DUPLICATE_SHOP');
    });

    it('should clear OTP from Redis after successful registration', async () => {
      await request(app)
        .post('/api/v1/auth/partner/register')
        .send({ phone: testPhone, otp: testOtp });

      const otpStillExists = await redis.exists(`otp:code:${testPhone}`);
      expect(otpStillExists).toBe(0);
    });

    it('should return JWT token in response', async () => {
      const response = await request(app)
        .post('/api/v1/auth/partner/register')
        .send({ phone: testPhone, otp: testOtp });

      expect(response.body.data.token).toBeDefined();
      expect(typeof response.body.data.token).toBe('string');
      expect(response.body.data.token.split('.').length).toBe(3); // JWT format
    });
  });

  // ... Add 30+ more tests for KYC, bank details, toggle-online endpoints
});
```

---

## Fix #9: Create Missing Frontend Screens (45 min)

### Create File: `apps/delivery/src/screens/AadhaarScreen.tsx`
```typescript
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRegistration } from '@/hooks/useRegistration';

export function AadhaarScreen({ onNext }: { onNext: (last4: string) => void }) {
  const [aadhaarLast4, setAadhaarLast4] = useState('');
  const { loading } = useRegistration();

  const handleContinue = () => {
    if (aadhaarLast4.length === 4) {
      onNext(aadhaarLast4);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Aadhaar Verification</Text>
      <Text style={styles.subtitle}>Enter last 4 digits of your Aadhaar number</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter last 4 digits"
        maxLength={4}
        keyboardType="numeric"
        value={aadhaarLast4}
        onChangeText={setAadhaarLast4}
      />

      <TouchableOpacity
        style={[styles.button, !aadhaarLast4 || aadhaarLast4.length < 4 ? styles.buttonDisabled : {}]}
        onPress={handleContinue}
        disabled={!aadhaarLast4 || aadhaarLast4.length < 4 || loading}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 12, marginBottom: 20 },
  button: { backgroundColor: '#007AFF', padding: 12, borderRadius: 8, alignItems: 'center' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: 'white', fontWeight: 'bold' },
});
```

Similar screens needed for VehiclePhotoScreen and BankDetailsScreen.

---

## Summary: Fixes by Priority

| Priority | Task | Time | Status |
|----------|------|------|--------|
| CRITICAL | Mount delivery-partners router | 5 min | ❌ |
| CRITICAL | Add react-dom dependency | 1 min | ❌ |
| CRITICAL | Export registerPartner | 10 min | ❌ |
| CRITICAL | Fix axios client | 5 min | ❌ |
| HIGH | Fix FileSystem import | 2 min | ❌ |
| HIGH | Add style properties | 6 min | ❌ |
| HIGH | Create integration tests | 60 min | ❌ |
| MEDIUM | Create missing screens | 45 min | ❌ |

**Total: 134 minutes**

After all fixes:
- Run: `npm test` (frontend and backend)
- Verify: 80%+ coverage
- Verify: All tests passing
- Route to security review
