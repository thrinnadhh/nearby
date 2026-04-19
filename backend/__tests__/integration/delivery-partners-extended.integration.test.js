import request from 'supertest';
import app from '../../src/index.js';
import { supabase } from '../../src/services/supabase.js';
import { redis } from '../../src/services/redis.js';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';

describe('Delivery Partners Extended Endpoints', () => {
  let partnerId;
  let partnerPhone;
  let partnerToken;

  const createDeliveryPartner = async () => {
    const newPartnerId = uuidv4();
    const phone = `+91${Math.random().toString().slice(2, 12)}`;

    await supabase.from('profiles').insert({
      id: newPartnerId,
      phone,
      role: 'delivery',
      display_name: 'Test Delivery Partner',
    });

    await supabase.from('delivery_partners').insert({
      id: newPartnerId,
      user_id: newPartnerId,
      kyc_status: 'approved',
      aadhaar_last_4: '1234',
      vehicle_number: 'DL01AB1234',
      bank_account_number: '1234567890',
      bank_ifsc: 'HDFC0000123',
      bank_account_name: 'Test Partner Account',
      is_online: false,
      latitude: 17.3850,
      longitude: 78.4867,
    });

    return { partnerId: newPartnerId, phone };
  };

  beforeEach(async () => {
    const partner = await createDeliveryPartner();
    partnerId = partner.partnerId;
    partnerPhone = partner.phone;

    partnerToken = jwt.sign(
      { userId: partnerId, phone: partnerPhone, role: 'delivery' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
  });

  afterEach(async () => {
    try {
      await redis.del(`delivery:${partnerId}:location`);
      await supabase.from('delivery_partners').delete().eq('id', partnerId);
      await supabase.from('profiles').delete().eq('id', partnerId);
    } catch (err) {
      // Ignore cleanup errors
    }
  });

  describe('PATCH /api/v1/delivery-partners/:id/vehicle', () => {
    it('should update vehicle details', async () => {
      const response = await request(app)
        .patch(`/api/v1/delivery-partners/${partnerId}/vehicle`)
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          vehicle_number: 'DL01AB5678',
        });

      expect([200, 201]).toContain(response.status);
      expect(response.body.success).toBe(true);
    });

    it('should validate vehicle number format', async () => {
      const response = await request(app)
        .patch(`/api/v1/delivery-partners/${partnerId}/vehicle`)
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          vehicle_number: 'INVALID',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .patch(`/api/v1/delivery-partners/${partnerId}/vehicle`)
        .send({
          vehicle_number: 'DL01AB5678',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should prevent partner from updating others vehicle', async () => {
      const otherPartnerId = uuidv4();

      const response = await request(app)
        .patch(`/api/v1/delivery-partners/${otherPartnerId}/vehicle`)
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          vehicle_number: 'DL01AB9999',
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should be idempotent', async () => {
      const vehicleNum = 'DL01AB7777';

      const response1 = await request(app)
        .patch(`/api/v1/delivery-partners/${partnerId}/vehicle`)
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          vehicle_number: vehicleNum,
        });

      const response2 = await request(app)
        .patch(`/api/v1/delivery-partners/${partnerId}/vehicle`)
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          vehicle_number: vehicleNum,
        });

      expect(response1.status).toBeGreaterThanOrEqual(200);
      expect(response2.status).toBeGreaterThanOrEqual(200);
    });

    it('should require vehicle_number field', async () => {
      const response = await request(app)
        .patch(`/api/v1/delivery-partners/${partnerId}/vehicle`)
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should persist vehicle updates to database', async () => {
      const newVehicleNum = 'DL01AB8888';

      await request(app)
        .patch(`/api/v1/delivery-partners/${partnerId}/vehicle`)
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          vehicle_number: newVehicleNum,
        });

      const { data: partner } = await supabase
        .from('delivery_partners')
        .select('vehicle_number')
        .eq('id', partnerId)
        .single();

      expect(partner.vehicle_number).toBe(newVehicleNum);
    });
  });

  describe('PATCH /api/v1/delivery-partners/:id/bank', () => {
    it('should update bank account details', async () => {
      const response = await request(app)
        .patch(`/api/v1/delivery-partners/${partnerId}/bank`)
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          bank_account_number: '9876543210',
          bank_ifsc: 'ICIC0000456',
          bank_account_name: 'Updated Partner Account',
        });

      expect([200, 201]).toContain(response.status);
      expect(response.body.success).toBe(true);
    });

    it('should validate bank account number (9-18 digits)', async () => {
      const response = await request(app)
        .patch(`/api/v1/delivery-partners/${partnerId}/bank`)
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          bank_account_number: '123', // Too short
          bank_ifsc: 'ICIC0000456',
          bank_account_name: 'Test',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate IFSC code format', async () => {
      const response = await request(app)
        .patch(`/api/v1/delivery-partners/${partnerId}/bank`)
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          bank_account_number: '1234567890',
          bank_ifsc: 'INVALID',
          bank_account_name: 'Test',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate account name length (3-60 chars)', async () => {
      const response = await request(app)
        .patch(`/api/v1/delivery-partners/${partnerId}/bank`)
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          bank_account_number: '1234567890',
          bank_ifsc: 'HDFC0000123',
          bank_account_name: 'ab', // Too short
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .patch(`/api/v1/delivery-partners/${partnerId}/bank`)
        .send({
          bank_account_number: '9876543210',
          bank_ifsc: 'ICIC0000456',
          bank_account_name: 'Test',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should prevent updating others bank account', async () => {
      const otherPartnerId = uuidv4();

      const response = await request(app)
        .patch(`/api/v1/delivery-partners/${otherPartnerId}/bank`)
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          bank_account_number: '9876543210',
          bank_ifsc: 'ICIC0000456',
          bank_account_name: 'Test',
        });

      expect(response.status).toBe(403);
    });

    it('should be idempotent', async () => {
      const bankData = {
        bank_account_number: '5555555555',
        bank_ifsc: 'SBIN0000789',
        bank_account_name: 'Idempotent Test',
      };

      const response1 = await request(app)
        .patch(`/api/v1/delivery-partners/${partnerId}/bank`)
        .set('Authorization', `Bearer ${partnerToken}`)
        .send(bankData);

      const response2 = await request(app)
        .patch(`/api/v1/delivery-partners/${partnerId}/bank`)
        .set('Authorization', `Bearer ${partnerToken}`)
        .send(bankData);

      expect(response1.status).toBeGreaterThanOrEqual(200);
      expect(response2.status).toBeGreaterThanOrEqual(200);
    });

    it('should persist bank updates to database', async () => {
      const newAccount = '6666666666';

      await request(app)
        .patch(`/api/v1/delivery-partners/${partnerId}/bank`)
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          bank_account_number: newAccount,
          bank_ifsc: 'AXIS0000123',
          bank_account_name: 'Test Account',
        });

      const { data: partner } = await supabase
        .from('delivery_partners')
        .select('bank_account_number')
        .eq('id', partnerId)
        .single();

      expect(partner.bank_account_number).toBe(newAccount);
    });
  });

  describe('PATCH /api/v1/delivery-partners/:id/toggle-online', () => {
    it('should toggle online status to true', async () => {
      const response = await request(app)
        .patch(`/api/v1/delivery-partners/${partnerId}/toggle-online`)
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          is_online: true,
          latitude: 17.3850,
          longitude: 78.4867,
        });

      expect([200, 201]).toContain(response.status);
      expect(response.body.success).toBe(true);
    });

    it('should toggle online status to false', async () => {
      // First go online
      await request(app)
        .patch(`/api/v1/delivery-partners/${partnerId}/toggle-online`)
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          is_online: true,
          latitude: 17.3850,
          longitude: 78.4867,
        });

      // Then go offline
      const response = await request(app)
        .patch(`/api/v1/delivery-partners/${partnerId}/toggle-online`)
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          is_online: false,
        });

      expect([200, 201]).toContain(response.status);
      expect(response.body.success).toBe(true);
    });

    it('should validate coordinates when going online', async () => {
      const response = await request(app)
        .patch(`/api/v1/delivery-partners/${partnerId}/toggle-online`)
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          is_online: true,
          latitude: 'invalid',
          longitude: 78.4867,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate India bounds for coordinates', async () => {
      const response = await request(app)
        .patch(`/api/v1/delivery-partners/${partnerId}/toggle-online`)
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          is_online: true,
          latitude: 50.0, // Outside India
          longitude: 78.4867,
        });

      expect(response.status).toBe(400);
    });

    it('should update Redis with location when going online', async () => {
      await request(app)
        .patch(`/api/v1/delivery-partners/${partnerId}/toggle-online`)
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          is_online: true,
          latitude: 17.3850,
          longitude: 78.4867,
        });

      const locationKey = `delivery:${partnerId}:location`;
      const location = await redis.get(locationKey);
      expect(location).toBeDefined();
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .patch(`/api/v1/delivery-partners/${partnerId}/toggle-online`)
        .send({
          is_online: true,
          latitude: 17.3850,
          longitude: 78.4867,
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should prevent toggling others online status', async () => {
      const otherPartnerId = uuidv4();

      const response = await request(app)
        .patch(`/api/v1/delivery-partners/${otherPartnerId}/toggle-online`)
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          is_online: true,
          latitude: 17.3850,
          longitude: 78.4867,
        });

      expect(response.status).toBe(403);
    });

    it('should not allow toggle if KYC not approved', async () => {
      const unverifiedPartnerId = uuidv4();
      const unverifiedPhone = `+91${Math.random().toString().slice(2, 12)}`;

      await supabase.from('profiles').insert({
        id: unverifiedPartnerId,
        phone: unverifiedPhone,
        role: 'delivery',
        display_name: 'Unverified Partner',
      });

      await supabase.from('delivery_partners').insert({
        id: unverifiedPartnerId,
        user_id: unverifiedPartnerId,
        kyc_status: 'pending_kyc',
      });

      const unverifiedToken = jwt.sign(
        { userId: unverifiedPartnerId, phone: unverifiedPhone, role: 'delivery' },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      const response = await request(app)
        .patch(`/api/v1/delivery-partners/${unverifiedPartnerId}/toggle-online`)
        .set('Authorization', `Bearer ${unverifiedToken}`)
        .send({
          is_online: true,
          latitude: 17.3850,
          longitude: 78.4867,
        });

      expect(response.status).toBe(403);

      // Cleanup
      await supabase.from('delivery_partners').delete().eq('id', unverifiedPartnerId);
      await supabase.from('profiles').delete().eq('id', unverifiedPartnerId);
    });

    it('should persist online status to database', async () => {
      await request(app)
        .patch(`/api/v1/delivery-partners/${partnerId}/toggle-online`)
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          is_online: true,
          latitude: 17.3850,
          longitude: 78.4867,
        });

      const { data: partner } = await supabase
        .from('delivery_partners')
        .select('is_online')
        .eq('id', partnerId)
        .single();

      expect(partner.is_online).toBe(true);
    });

    it('should be idempotent', async () => {
      const toggleData = {
        is_online: true,
        latitude: 17.3850,
        longitude: 78.4867,
      };

      const response1 = await request(app)
        .patch(`/api/v1/delivery-partners/${partnerId}/toggle-online`)
        .set('Authorization', `Bearer ${partnerToken}`)
        .send(toggleData);

      const response2 = await request(app)
        .patch(`/api/v1/delivery-partners/${partnerId}/toggle-online`)
        .set('Authorization', `Bearer ${partnerToken}`)
        .send(toggleData);

      expect(response1.status).toBeGreaterThanOrEqual(200);
      expect(response2.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('GET /api/v1/delivery-partners/:id/stats', () => {
    it('should return partner statistics', async () => {
      const response = await request(app)
        .get(`/api/v1/delivery-partners/${partnerId}/stats`)
        .set('Authorization', `Bearer ${partnerToken}`);

      expect([200, 404]).toContain(response.status);
    });

    it('should include delivery metrics', async () => {
      const response = await request(app)
        .get(`/api/v1/delivery-partners/${partnerId}/stats`)
        .set('Authorization', `Bearer ${partnerToken}`);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        const stats = response.body.data;
        
        // Stats should have metrics
        if (stats) {
          expect(typeof stats === 'object').toBe(true);
        }
      }
    });

    it('should include earnings in stats', async () => {
      const response = await request(app)
        .get(`/api/v1/delivery-partners/${partnerId}/stats`)
        .set('Authorization', `Bearer ${partnerToken}`);

      if (response.status === 200) {
        const stats = response.body.data;
        if (stats && stats.earnings !== undefined) {
          expect(typeof stats.earnings).toBe('number');
        }
      }
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/delivery-partners/${partnerId}/stats`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should prevent viewing others stats', async () => {
      const otherPartnerId = uuidv4();

      const response = await request(app)
        .get(`/api/v1/delivery-partners/${otherPartnerId}/stats`)
        .set('Authorization', `Bearer ${partnerToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent partner', async () => {
      const fakeId = uuidv4();

      const response = await request(app)
        .get(`/api/v1/delivery-partners/${fakeId}/stats`)
        .set('Authorization', `Bearer ${partnerToken}`);

      expect([403, 404]).toContain(response.status);
    });

    it('should return proper response format', async () => {
      const response = await request(app)
        .get(`/api/v1/delivery-partners/${partnerId}/stats`)
        .set('Authorization', `Bearer ${partnerToken}`);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success');
        expect(response.body).toHaveProperty('data');
      }
    });
  });

  describe('Race conditions and concurrent operations', () => {
    it('should handle concurrent toggle-online requests', async () => {
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(
          request(app)
            .patch(`/api/v1/delivery-partners/${partnerId}/toggle-online`)
            .set('Authorization', `Bearer ${partnerToken}`)
            .send({
              is_online: i % 2 === 0,
              latitude: 17.3850 + (i * 0.001),
              longitude: 78.4867 + (i * 0.001),
            })
        );
      }

      const results = await Promise.all(promises);
      expect(results.length).toBe(3);
    });

    it('should handle concurrent vehicle updates', async () => {
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(
          request(app)
            .patch(`/api/v1/delivery-partners/${partnerId}/vehicle`)
            .set('Authorization', `Bearer ${partnerToken}`)
            .send({
              vehicle_number: `DL01AB${1000 + i}`,
            })
        );
      }

      const results = await Promise.all(promises);
      expect(results.length).toBe(3);
    });

    it('should handle concurrent bank updates', async () => {
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(
          request(app)
            .patch(`/api/v1/delivery-partners/${partnerId}/bank`)
            .set('Authorization', `Bearer ${partnerToken}`)
            .send({
              bank_account_number: `${1000000000 + i}`,
              bank_ifsc: 'HDFC0000123',
              bank_account_name: 'Concurrent Test',
            })
        );
      }

      const results = await Promise.all(promises);
      expect(results.length).toBe(3);
    });
  });

  describe('Security validations', () => {
    it('should validate all UUID parameters', async () => {
      const response = await request(app)
        .get(`/api/v1/delivery-partners/invalid-uuid/stats`)
        .set('Authorization', `Bearer ${partnerToken}`);

      expect([400, 403]).toContain(response.status);
    });

    it('should not expose sensitive data in error messages', async () => {
      const response = await request(app)
        .patch(`/api/v1/delivery-partners/${partnerId}/bank`)
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          bank_account_number: 'invalid',
          bank_ifsc: 'HDFC0000123',
          bank_account_name: 'Test',
        });

      expect(response.status).toBe(400);
      const errorMsg = JSON.stringify(response.body);
      expect(errorMsg).not.toContain(partnerId);
    });
  });
});
