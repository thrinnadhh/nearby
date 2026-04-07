import request from 'supertest';
import { app } from '../../index.js';
import { redis } from '../../services/redis.js';
import { supabase } from '../../services/supabase.js';
import { verifyToken } from '../../middleware/auth.js';

describe('Auth Routes', () => {
  // Clean up Redis and database before each test
  beforeEach(async () => {
    // Clear all OTP-related Redis keys
    const keys = await redis.keys('otp:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  });

  afterAll(async () => {
    // Clean up after all tests
    const keys = await redis.keys('otp:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /api/v1/auth/send-otp
  // ─────────────────────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/send-otp', () => {
    it('should return 400 for invalid phone format (< 10 digits)', async () => {
      const response = await request(app)
        .post('/api/v1/auth/send-otp')
        .send({ phone: '123456789' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid phone format (> 10 digits)', async () => {
      const response = await request(app)
        .post('/api/v1/auth/send-otp')
        .send({ phone: '12345678901' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for phone starting with invalid digit (0-5)', async () => {
      const response = await request(app)
        .post('/api/v1/auth/send-otp')
        .send({ phone: '0123456789' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for missing phone', async () => {
      const response = await request(app)
        .post('/api/v1/auth/send-otp')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should successfully send OTP for valid phone', async () => {
      const phone = '9876543210';
      const response = await request(app)
        .post('/api/v1/auth/send-otp')
        .send({ phone })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('otp_sent');
      expect(response.body.data.expiresIn).toBe(300);

      // Verify OTP is stored in Redis
      const storedOtp = await redis.get(`otp:code:${phone}`);
      expect(storedOtp).toBeDefined();
      expect(storedOtp).toMatch(/^\d{6}$/);
    });

    it('should generate OTP 123456 in dev mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      try {
        const phone = '9876543210';
        const response = await request(app)
          .post('/api/v1/auth/send-otp')
          .send({ phone })
          .expect(200);

        expect(response.body.success).toBe(true);

        const storedOtp = await redis.get(`otp:code:${phone}`);
        expect(storedOtp).toBe('123456');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should clear previous attempt counter on new OTP request', async () => {
      const phone = '9876543210';

      // Request OTP first time
      await request(app)
        .post('/api/v1/auth/send-otp')
        .send({ phone });

      // Manually increment attempts (simulate failed verification)
      await redis.incr(`otp:attempts:${phone}`);
      const attemptsAfterFail = await redis.get(`otp:attempts:${phone}`);
      expect(attemptsAfterFail).toBe('1');

      // Request new OTP
      await request(app)
        .post('/api/v1/auth/send-otp')
        .send({ phone });

      // Attempts counter should be deleted
      const attemptsAfterNewOtp = await redis.get(`otp:attempts:${phone}`);
      expect(attemptsAfterNewOtp).toBeNull();
    });

    it('should return 429 if user is locked out from previous failed attempts', async () => {
      const phone = '9876543210';

      // Manually set lockout
      const lockoutKey = `otp:lockout:${phone}`;
      await redis.setex(lockoutKey, 600, '1');

      const response = await request(app)
        .post('/api/v1/auth/send-otp')
        .send({ phone })
        .expect(429);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('OTP_LOCKED');
    });

    it('should accept phone numbers starting with 6-9', async () => {
      const validPhones = ['6123456789', '7987654321', '8555555555', '9000000001'];

      for (const phone of validPhones) {
        const response = await request(app)
          .post('/api/v1/auth/send-otp')
          .send({ phone });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        // Clean up
        await redis.del(`otp:code:${phone}`);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /api/v1/auth/verify-otp
  // ─────────────────────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/verify-otp', () => {
    it('should return 400 for missing phone', async () => {
      const response = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ otp: '123456' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for missing OTP', async () => {
      const response = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone: '9876543210' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid OTP length', async () => {
      const response = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone: '9876543210', otp: '12345' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for non-numeric OTP', async () => {
      const response = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone: '9876543210', otp: 'abcdef' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for expired OTP', async () => {
      const phone = '9876543210';

      // Don't store any OTP - simulate expired

      const response = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone, otp: '123456' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('OTP_EXPIRED');
    });

    it('should return 400 for invalid OTP (wrong code)', async () => {
      const phone = '9876543210';

      // Set correct OTP in Redis
      await redis.setex(`otp:code:${phone}`, 300, '123456');

      const response = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone, otp: '000000' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_OTP');
      expect(response.body.error.message).toContain('2 attempts remaining');
    });

    it('should increment failed attempts on wrong OTP', async () => {
      const phone = '9876543210';

      // Set correct OTP in Redis
      await redis.setex(`otp:code:${phone}`, 300, '123456');

      // First wrong attempt
      await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone, otp: '000000' })
        .expect(400);

      const attempts1 = await redis.get(`otp:attempts:${phone}`);
      expect(attempts1).toBe('1');

      // Set OTP again for second attempt
      await redis.setex(`otp:code:${phone}`, 300, '123456');

      // Second wrong attempt
      await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone, otp: '111111' })
        .expect(400);

      const attempts2 = await redis.get(`otp:attempts:${phone}`);
      expect(attempts2).toBe('2');
    });

    it('should lock user after 3 failed attempts', async () => {
      const phone = '9876543210';

      // Three failed attempts
      for (let i = 0; i < 3; i++) {
        await redis.setex(`otp:code:${phone}`, 300, '123456');
        await request(app)
          .post('/api/v1/auth/verify-otp')
          .send({ phone, otp: '000000' })
          .expect(400);
      }

      // Fourth attempt should be locked
      const response = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone, otp: '123456' })
        .expect(429);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('OTP_LOCKED');

      // Verify lockout key exists
      const lockoutExists = await redis.exists(`otp:lockout:${phone}`);
      expect(lockoutExists).toBe(1);
    });

    it('should create new user profile on first login', async () => {
      const phone = '9876543210';

      // Set OTP in Redis
      await redis.setex(`otp:code:${phone}`, 300, '123456');

      const response = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone, otp: '123456' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.phone).toBe(`+91${phone}`);
      expect(response.body.data.role).toBe('customer');
      expect(response.body.data.userId).toBeDefined();
      expect(response.body.data.token).toBeDefined();

      // Verify token can be decoded
      const decoded = verifyToken(response.body.data.token);
      expect(decoded.userId).toBe(response.body.data.userId);
      expect(decoded.phone).toBe(`+91${phone}`);
      expect(decoded.role).toBe('customer');
    });

    it('should use existing profile on subsequent login', async () => {
      const phone = '9876543210';

      // First login
      await redis.setex(`otp:code:${phone}`, 300, '123456');
      const response1 = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone, otp: '123456' })
        .expect(200);

      const userId1 = response1.body.data.userId;

      // Second login
      await redis.setex(`otp:code:${phone}`, 300, '123456');
      const response2 = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone, otp: '123456' })
        .expect(200);

      const userId2 = response2.body.data.userId;

      // Should be same user
      expect(userId1).toBe(userId2);
    });

    it('should clear OTP from Redis after successful verification', async () => {
      const phone = '9876543210';

      await redis.setex(`otp:code:${phone}`, 300, '123456');

      await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone, otp: '123456' })
        .expect(200);

      // OTP should be deleted
      const storedOtp = await redis.get(`otp:code:${phone}`);
      expect(storedOtp).toBeNull();
    });

    it('should clear attempts counter after successful verification', async () => {
      const phone = '9876543210';

      // One failed attempt
      await redis.setex(`otp:code:${phone}`, 300, '123456');
      await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone, otp: '000000' })
        .expect(400);

      // Successful verification
      await redis.setex(`otp:code:${phone}`, 300, '123456');
      await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone, otp: '123456' })
        .expect(200);

      // Attempts counter should be deleted
      const attempts = await redis.get(`otp:attempts:${phone}`);
      expect(attempts).toBeNull();
    });

    it('should generate valid JWT token with correct payload', async () => {
      const phone = '9876543210';

      await redis.setex(`otp:code:${phone}`, 300, '123456');

      const response = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone, otp: '123456' })
        .expect(200);

      const decoded = verifyToken(response.body.data.token);

      expect(decoded.userId).toBe(response.body.data.userId);
      expect(decoded.phone).toBe(`+91${phone}`);
      expect(decoded.role).toBe('customer');
      expect(decoded.shopId).toBeUndefined(); // Customer shouldn't have shopId
      expect(decoded.iat).toBeDefined(); // Issued at
      expect(decoded.exp).toBeDefined(); // Expiration (7 days)
    });

    it('should return 429 if user is locked out', async () => {
      const phone = '9876543210';

      // Manually set lockout
      await redis.setex(`otp:lockout:${phone}`, 600, '1');

      const response = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone, otp: '123456' })
        .expect(429);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('OTP_LOCKED');
    });

    it('should normalize phone number to +91 prefix in response', async () => {
      const phone = '9876543210';

      await redis.setex(`otp:code:${phone}`, 300, '123456');

      const response = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone, otp: '123456' })
        .expect(200);

      expect(response.body.data.phone).toBe(`+91${phone}`);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Integration tests: Full OTP flow
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Full OTP Flow Integration', () => {
    it('should complete send + verify flow successfully', async () => {
      const phone = '9876543210';

      // 1. Send OTP
      const sendResponse = await request(app)
        .post('/api/v1/auth/send-otp')
        .send({ phone })
        .expect(200);

      expect(sendResponse.body.data.status).toBe('otp_sent');

      // 2. Get OTP from Redis
      const otp = await redis.get(`otp:code:${phone}`);
      expect(otp).toBeDefined();

      // 3. Verify OTP
      const verifyResponse = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone, otp })
        .expect(200);

      expect(verifyResponse.body.success).toBe(true);
      expect(verifyResponse.body.data.token).toBeDefined();

      // 4. Use token to access protected endpoint
      const decoded = verifyToken(verifyResponse.body.data.token);
      expect(decoded.userId).toBeDefined();
      expect(decoded.phone).toBe(`+91${phone}`);
      expect(decoded.role).toBe('customer');
    });

    it('should reject flow if OTP expires between send and verify', async () => {
      const phone = '9876543210';

      // Send OTP
      await request(app)
        .post('/api/v1/auth/send-otp')
        .send({ phone })
        .expect(200);

      // Manually expire the OTP
      await redis.del(`otp:code:${phone}`);

      // Try to verify with any OTP
      const response = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone, otp: '123456' })
        .expect(400);

      expect(response.body.error.code).toBe('OTP_EXPIRED');
    });

    it('should block after 3 consecutive failed verifications', async () => {
      const phone = '9876543210';

      // Send OTP
      await request(app)
        .post('/api/v1/auth/send-otp')
        .send({ phone })
        .expect(200);

      // Try to verify with wrong OTP 3 times
      for (let i = 1; i <= 3; i++) {
        await redis.setex(`otp:code:${phone}`, 300, '123456');

        const response = await request(app)
          .post('/api/v1/auth/verify-otp')
          .send({ phone, otp: '000000' })
          .expect(400);

        if (i < 3) {
          expect(response.body.error.code).toBe('INVALID_OTP');
        }
      }

      // Fourth attempt should be locked
      const response = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone, otp: '123456' })
        .expect(429);

      expect(response.body.error.code).toBe('OTP_LOCKED');
    });
  });
});
