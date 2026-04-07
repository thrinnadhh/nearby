import request from 'supertest';
import express from 'express';
import Joi from 'joi';
import { generateToken, authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { roleGuard, adminGuard, customerGuard } from '../../middleware/roleGuard.js';
import errorHandler from '../../middleware/errorHandler.js';
import { AppError, UNAUTHORIZED, FORBIDDEN, VALIDATION_ERROR } from '../../utils/errors.js';

describe('Middleware: validate', () => {
  let testApp;

  beforeEach(() => {
    testApp = express();
    testApp.use(express.json());
  });

  it('should validate request body against schema', async () => {
    const schema = Joi.object({
      email: Joi.string().email().required(),
      age: Joi.number().integer().min(0).max(150),
    });

    testApp.post('/test', validate(schema), (req, res) => {
      res.json({ success: true, data: req.body });
    });

    testApp.use(errorHandler);

    const response = await request(testApp)
      .post('/test')
      .send({ email: 'test@example.com', age: 25 })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.email).toBe('test@example.com');
  });

  it('should reject invalid input', async () => {
    const schema = Joi.object({
      email: Joi.string().email().required(),
    });

    testApp.post('/test', validate(schema), (req, res) => {
      res.json({ success: true });
    });

    testApp.use(errorHandler);

    const response = await request(testApp)
      .post('/test')
      .send({ email: 'invalid-email' })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe(VALIDATION_ERROR);
  });

  it('should strip unknown fields', async () => {
    const schema = Joi.object({
      email: Joi.string().email().required(),
    });

    testApp.post('/test', validate(schema), (req, res) => {
      res.json({ success: true, data: req.body });
    });

    testApp.use(errorHandler);

    const response = await request(testApp)
      .post('/test')
      .send({ email: 'test@example.com', unknownField: 'should-be-removed' })
      .expect(200);

    expect(response.body.data.unknownField).toBeUndefined();
  });
});

describe('Middleware: authenticate', () => {
  let testApp;

  beforeEach(() => {
    testApp = express();
    testApp.use(express.json());
  });

  it('should verify valid JWT token', async () => {
    const token = generateToken({ userId: 'test-user', role: 'customer' });

    testApp.get('/test', authenticate, (req, res) => {
      res.json({ success: true, data: { userId: req.user.userId } });
    });

    testApp.use(errorHandler);

    const response = await request(testApp)
      .get('/test')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.userId).toBe('test-user');
  });

  it('should reject requests without authorization header', async () => {
    testApp.get('/test', authenticate, (req, res) => {
      res.json({ success: true });
    });

    testApp.use(errorHandler);

    const response = await request(testApp)
      .get('/test')
      .expect(401);

    expect(response.body.error.code).toBe(UNAUTHORIZED);
  });

  it('should reject invalid tokens', async () => {
    testApp.get('/test', authenticate, (req, res) => {
      res.json({ success: true });
    });

    testApp.use(errorHandler);

    const response = await request(testApp)
      .get('/test')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);

    expect(response.body.error.code).toBe('INVALID_TOKEN');
  });

  it('should attach decoded user to req.user', async () => {
    const token = generateToken({
      userId: 'abc123',
      phone: '+919876543210',
      role: 'shop_owner',
      shopId: 'shop-123',
    });

    testApp.get('/test', authenticate, (req, res) => {
      res.json({
        success: true,
        data: req.user,
      });
    });

    testApp.use(errorHandler);

    const response = await request(testApp)
      .get('/test')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.userId).toBe('abc123');
    expect(response.body.data.role).toBe('shop_owner');
    expect(response.body.data.shopId).toBe('shop-123');
  });
});

describe('Middleware: roleGuard', () => {
  let testApp;

  beforeEach(() => {
    testApp = express();
    testApp.use(express.json());
  });

  it('should allow request with correct role', async () => {
    const token = generateToken({ userId: 'test-user', role: 'admin' });

    testApp.get('/test', authenticate, roleGuard(['admin']), (req, res) => {
      res.json({ success: true });
    });

    testApp.use(errorHandler);

    const response = await request(testApp)
      .get('/test')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
  });

  it('should reject request with wrong role', async () => {
    const token = generateToken({ userId: 'test-user', role: 'customer' });

    testApp.get('/test', authenticate, roleGuard(['admin']), (req, res) => {
      res.json({ success: true });
    });

    testApp.use(errorHandler);

    const response = await request(testApp)
      .get('/test')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(response.body.error.code).toBe(FORBIDDEN);
  });

  it('should allow multiple allowed roles', async () => {
    const token = generateToken({ userId: 'test-user', role: 'delivery' });

    testApp.get('/test', authenticate, roleGuard(['admin', 'delivery']), (req, res) => {
      res.json({ success: true });
    });

    testApp.use(errorHandler);

    const response = await request(testApp)
      .get('/test')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
  });

  it('adminGuard should only allow admin role', async () => {
    const token = generateToken({ userId: 'test-user', role: 'customer' });

    testApp.get('/test', authenticate, adminGuard(), (req, res) => {
      res.json({ success: true });
    });

    testApp.use(errorHandler);

    const response = await request(testApp)
      .get('/test')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(response.body.error.code).toBe(FORBIDDEN);
  });

  it('customerGuard should only allow customer role', async () => {
    const token = generateToken({ userId: 'test-user', role: 'customer' });

    testApp.get('/test', authenticate, customerGuard(), (req, res) => {
      res.json({ success: true });
    });

    testApp.use(errorHandler);

    const response = await request(testApp)
      .get('/test')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
  });
});

describe('Middleware: errorHandler', () => {
  let testApp;

  beforeEach(() => {
    testApp = express();
    testApp.use(express.json());
  });

  it('should handle AppError correctly', async () => {
    testApp.get('/test', (req, res, next) => {
      next(new AppError('TEST_ERROR', 'Test error message', 400));
    });

    testApp.use(errorHandler);

    const response = await request(testApp)
      .get('/test')
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('TEST_ERROR');
    expect(response.body.error.message).toBe('Test error message');
  });

  it('should handle unexpected errors gracefully', async () => {
    testApp.get('/test', (req, res, next) => {
      next(new Error('Unexpected error'));
    });

    testApp.use(errorHandler);

    const response = await request(testApp)
      .get('/test')
      .expect(500);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
  });

  it('should include error details if provided', async () => {
    testApp.get('/test', (req, res, next) => {
      next(new AppError('TEST_ERROR', 'Test', 400, { details: 'extra info' }));
    });

    testApp.use(errorHandler);

    const response = await request(testApp)
      .get('/test')
      .expect(400);

    expect(response.body.error.details).toBeDefined();
  });
});
