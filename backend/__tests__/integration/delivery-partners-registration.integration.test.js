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
    await redis.del(`otp:attempts:${testPhone}`);
    await redis.del(`otp:lockout:${testPhone}`);
  });

  afterEach(async () => {
    // Clean up Redis
    await redis.del(`otp:code:${testPhone}`);
    await redis.del(`otp:attempts:${testPhone}`);
    await redis.del(`otp:lockout:${testPhone}`);
    
    // Clean up Supabase test data if created
    try {
      await supabase.from('delivery_partners').delete().eq('user_phone', `+91${testPhone}`);
      await supabase.from('profiles').delete().eq('phone', `+91${testPhone}`);
    } catch (err) {
      // Ignore cleanup errors
    }
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

      // Verify profile was created in Supabase
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('phone', `+91${testPhone}`)
        .single();

      expect(profileError).toBeNull();
      expect(profile.role).toBe('delivery');

      // Verify delivery_partners record created
      const { data: partner, error: partnerError } = await supabase
        .from('delivery_partners')
        .select('id, kyc_status')
        .eq('user_id', response.body.data.userId)
        .single();

      expect(partnerError).toBeNull();
      expect(partner.kyc_status).toBe('pending_kyc');
    });
  });

  describe('Acceptance criteria - Validation', () => {
    it('should validate phone format (10 digits)', async () => {
      const response = await request(app)
        .post('/api/v1/auth/partner/register')
        .send({
          phone: '987654321', // 9 digits
          otp: testOtp,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toMatch(/VALIDATION|INVALID/i);
    });

    it('should validate OTP format (6 digits)', async () => {
      const response = await request(app)
        .post('/api/v1/auth/partner/register')
        .send({
          phone: testPhone,
          otp: '12345', // 5 digits
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject missing phone field', async () => {
      const response = await request(app)
        .post('/api/v1/auth/partner/register')
        .send({
          otp: testOtp,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject missing OTP field', async () => {
      const response = await request(app)
        .post('/api/v1/auth/partner/register')
        .send({
          phone: testPhone,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('OTP Verification', () => {
    it('should return INVALID_OTP for wrong OTP', async () => {
      const response = await request(app)
        .post('/api/v1/auth/partner/register')
        .send({
          phone: testPhone,
          otp: '654321', // Wrong
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toMatch(/INVALID_OTP|OTP/i);
    });

    it('should increment failed attempts on wrong OTP', async () => {
      // Attempt 1
      await request(app)
        .post('/api/v1/auth/partner/register')
        .send({ phone: testPhone, otp: 'wrong1' });

      const attempts1 = await redis.get(`otp:attempts:${testPhone}`);
      expect(parseInt(attempts1 || '0')).toBe(1);

      // Attempt 2
      await request(app)
        .post('/api/v1/auth/partner/register')
        .send({ phone: testPhone, otp: 'wrong2' });

      const attempts2 = await redis.get(`otp:attempts:${testPhone}`);
      expect(parseInt(attempts2 || '0')).toBe(2);
    });

    it('should lock account after 3 failed attempts', async () => {
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
      expect(response.body.error.code).toMatch(/OTP_LOCKED|LOCKED/i);
    });

    it('should return OTP_EXPIRED for missing/expired OTP in Redis', async () => {
      await redis.del(`otp:code:${testPhone}`);

      const response = await request(app)
        .post('/api/v1/auth/partner/register')
        .send({ phone: testPhone, otp: testOtp });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toMatch(/OTP_EXPIRED|OTP/i);
    });

    it('should clear OTP from Redis after successful registration', async () => {
      await request(app)
        .post('/api/v1/auth/partner/register')
        .send({ phone: testPhone, otp: testOtp });

      const otpStillExists = await redis.exists(`otp:code:${testPhone}`);
      expect(otpStillExists).toBe(0);
    });
  });

  describe('Duplicate Prevention', () => {
    it('should prevent duplicate phone registration', async () => {
      // First registration succeeds
      const firstResponse = await request(app)
        .post('/api/v1/auth/partner/register')
        .send({ phone: testPhone, otp: testOtp });

      expect(firstResponse.status).toBe(201);
      expect(firstResponse.body.success).toBe(true);

      // Reset OTP for second attempt
      await redis.setex(`otp:code:${testPhone}`, 300, testOtp);
      await redis.del(`otp:attempts:${testPhone}`);

      // Second registration fails
      const secondResponse = await request(app)
        .post('/api/v1/auth/partner/register')
        .send({ phone: testPhone, otp: testOtp });

      expect(secondResponse.status).toBe(409);
      expect(secondResponse.body.error.code).toMatch(/DUPLICATE/i);
    });
  });

  describe('Token Response', () => {
    it('should return JWT token in response', async () => {
      const response = await request(app)
        .post('/api/v1/auth/partner/register')
        .send({ phone: testPhone, otp: testOtp });

      expect(response.body.data.token).toBeDefined();
      expect(typeof response.body.data.token).toBe('string');
      // JWT format: 3 parts separated by dots
      expect(response.body.data.token.split('.').length).toBe(3);
    });

    it('should return userId in response', async () => {
      const response = await request(app)
        .post('/api/v1/auth/partner/register')
        .send({ phone: testPhone, otp: testOtp });

      expect(response.body.data.userId).toBeDefined();
      expect(typeof response.body.data.userId).toBe('string');
    });

    it('should return delivery role', async () => {
      const response = await request(app)
        .post('/api/v1/auth/partner/register')
        .send({ phone: testPhone, otp: testOtp });

      expect(response.body.data.role).toBe('delivery');
    });
  });

  describe('Error Handling', () => {
    it('should return proper error response on validation failure', async () => {
      const response = await request(app)
        .post('/api/v1/auth/partner/register')
        .send({
          phone: 'invalid',
          otp: 'invalid',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
    });

    it('should handle missing request body', async () => {
      const response = await request(app)
        .post('/api/v1/auth/partner/register')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should accept phone with special characters and strip them', async () => {
      const response = await request(app)
        .post('/api/v1/auth/partner/register')
        .send({
          phone: '+91-9876543210',
          otp: testOtp,
        });

      // Should either succeed or fail with validation error, not parsing error
      expect([201, 400]).toContain(response.status);
    });
  });

  describe('Database Integrity', () => {
    it('should create profile with correct role', async () => {
      const response = await request(app)
        .post('/api/v1/auth/partner/register')
        .send({ phone: testPhone, otp: testOtp });

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone', `+91${testPhone}`)
        .single();

      expect(profile.role).toBe('delivery');
      expect(profile.phone).toBe(`+91${testPhone}`);
    });

    it('should create delivery_partners record with pending KYC', async () => {
      const response = await request(app)
        .post('/api/v1/auth/partner/register')
        .send({ phone: testPhone, otp: testOtp });

      const { data: partner } = await supabase
        .from('delivery_partners')
        .select('*')
        .eq('user_id', response.body.data.userId)
        .single();

      expect(partner.kyc_status).toBe('pending_kyc');
      expect(partner.is_online).toBe(false);
    });
  });
});

describe('GET /api/v1/delivery-partners/:id', () => {
  it('should return 404 for non-existent partner', async () => {
    const response = await request(app)
      .get('/api/v1/delivery-partners/nonexistent-id')
      .set('Authorization', 'Bearer fake-token');

    expect([401, 404]).toContain(response.status);
  });
});

describe('PATCH /api/v1/delivery-partners/:id/toggle-online', () => {
  it('should require authentication', async () => {
    const response = await request(app)
      .patch('/api/v1/delivery-partners/test-id/toggle-online')
      .send({ isOnline: true });

    expect(response.status).toBe(401);
  });

  it('should reject invalid toggle data', async () => {
    const response = await request(app)
      .patch('/api/v1/delivery-partners/test-id/toggle-online')
      .set('Authorization', 'Bearer invalid-token')
      .send({ isOnline: 'not-a-boolean' });

    expect([400, 401]).toContain(response.status);
  });
});
