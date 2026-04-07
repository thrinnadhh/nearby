import request from 'supertest';
import { app } from '../../index.js';

describe('Server Endpoints', () => {
  describe('GET /health', () => {
    it('should return 200 with health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('ok');
      expect(response.body.data.version).toBeDefined();
      expect(response.body.data.timestamp).toBeDefined();
    });

    it('should return ISO 8601 timestamp', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      const timestamp = response.body.data.timestamp;
      const date = new Date(timestamp);
      expect(date instanceof Date && !Number.isNaN(date.getTime())).toBe(true);
    });

    it('should include environment in response', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.data.environment).toBeDefined();
      expect(['development', 'test', 'production']).toContain(response.body.data.environment);
    });
  });

  describe('GET /readiness', () => {
    it('should return 200 or 503 depending on service availability', async () => {
      const response = await request(app)
        .get('/readiness');

      expect([200, 503]).toContain(response.status);
    });

    it('should include readiness check results', async () => {
      const response = await request(app)
        .get('/readiness');

      expect(response.body.success).toBe(true);
      expect(response.body.data.readiness).toBeDefined();
      expect(typeof response.body.data.readiness).toBe('boolean');
    });

    it('should include checks for all services', async () => {
      const response = await request(app)
        .get('/readiness');

      expect(response.body.data.checks).toBeDefined();
      expect(response.body.data.checks.redis).toBeDefined();
      expect(response.body.data.checks.supabase).toBeDefined();
      expect(response.body.data.checks.typesense).toBeDefined();
    });

    it('should include status for each service check', async () => {
      const response = await request(app)
        .get('/readiness');

      const checks = response.body.data.checks;
      Object.values(checks).forEach((check) => {
        expect(check.status).toBeDefined();
        expect(['ready', 'unavailable']).toContain(check.status);
      });
    });

    it('should include timestamp', async () => {
      const response = await request(app)
        .get('/readiness');

      expect(response.body.data.timestamp).toBeDefined();
      const date = new Date(response.body.data.timestamp);
      expect(date instanceof Date && !Number.isNaN(date.getTime())).toBe(true);
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/v1/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should include path in 404 error message', async () => {
      const response = await request(app)
        .get('/api/v1/invalid/path')
        .expect(404);

      expect(response.body.error.message).toContain('/api/v1/invalid/path');
    });
  });

  describe('Response Format', () => {
    it('success responses should follow convention', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.error).toBeUndefined();
    });

    it('error responses should follow convention', async () => {
      const response = await request(app)
        .get('/api/v1/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBeDefined();
      expect(response.body.error.message).toBeDefined();
      expect(response.body.data).toBeUndefined();
    });
  });

  describe('Request Headers', () => {
    it('should set X-Request-ID header', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.headers['x-request-id']).toBeDefined();
    });

    it('should use client-provided X-Request-ID if present', async () => {
      const requestId = 'test-request-id-12345';
      const response = await request(app)
        .get('/health')
        .set('X-Request-ID', requestId);

      expect(response.headers['x-request-id']).toBe(requestId);
    });
  });

  describe('CORS', () => {
    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/health')
        .expect([200, 204]); // Both 200 and 204 are valid for preflight

      // CORS headers may be set depending on configuration
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThanOrEqual(204);
    });
  });

  describe('Security Headers', () => {
    it('should include Helmet security headers', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
    });
  });
});
