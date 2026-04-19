/**
 * Backend route tests for analytics-products, chats, and statements
 */

import request from 'supertest';
import express from 'express';
import analyticsProductsRouter from '@/routes/analytics-products';
import chatsRouter from '@/routes/chats';
import statementsRouter from '@/routes/statements';
import { authenticate } from '@/middleware/auth';
import { roleGuard } from '@/middleware/roleGuard';
import supabase from '@/services/supabase';

jest.mock('@/services/supabase');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

// Setup Express app with routes
const setupApp = () => {
  const app = express();
  app.use(express.json());
  
  // Mock auth middleware
  app.use((req: any, res, next) => {
    req.user = { id: 'user123', shopId: 'shop123', role: 'shop_owner' };
    next();
  });

  app.use('/analytics', analyticsProductsRouter);
  app.use('/chats', chatsRouter);
  app.use('/statements', statementsRouter);

  return app;
};

describe('Analytics Products Route', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = setupApp();
  });

  it('should return top products with valid dateRange', async () => {
    const mockProducts = [
      {
        productId: '1',
        productName: 'Product A',
        totalSales: 50,
        totalRevenuePaise: 100000,
        avgRating: 4.5,
      },
    ];

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: mockProducts, error: null }),
      }),
    } as any);

    const res = await request(app)
      .get('/analytics/shop123/analytics/top-products')
      .query({ dateRange: '30d', limit: 5 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(mockProducts);
  });

  it('should validate dateRange parameter', async () => {
    const res = await request(app)
      .get('/analytics/shop123/analytics/top-products')
      .query({ dateRange: 'invalid', limit: 5 })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should validate limit parameter bounds', async () => {
    const res = await request(app)
      .get('/analytics/shop123/analytics/top-products')
      .query({ dateRange: '30d', limit: 101 })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should handle database errors gracefully', async () => {
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Database error' } 
        }),
      }),
    } as any);

    const res = await request(app)
      .get('/analytics/shop123/analytics/top-products')
      .query({ dateRange: '30d', limit: 5 })
      .expect(500);

    expect(res.body.success).toBe(false);
  });

  it('should support all valid dateRange values', async () => {
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    } as any);

    for (const dateRange of ['7d', '30d', '90d']) {
      const res = await request(app)
        .get('/analytics/shop123/analytics/top-products')
        .query({ dateRange, limit: 5 })
        .expect(200);

      expect(res.body.success).toBe(true);
    }
  });
});

describe('Chats Route', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = setupApp();
  });

  it('should return conversations with pagination', async () => {
    const mockConversations = [
      {
        chatId: '1',
        customerId: 'cust1',
        customerName: 'John Doe',
        lastMessage: 'Hello',
        lastMessageTime: new Date().toISOString(),
        messageCount: 5,
        unreadCount: 1,
      },
    ];

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          range: jest.fn().mockResolvedValue({ 
            data: mockConversations,
            count: 1,
            error: null,
          }),
        }),
      }),
    } as any);

    const res = await request(app)
      .get('/chats/shop123/chats')
      .query({ page: 1, limit: 20 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.conversations).toEqual(mockConversations);
    expect(res.body.data.meta.page).toBe(1);
  });

  it('should filter conversations by search', async () => {
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          range: jest.fn().mockResolvedValue({ 
            data: [],
            count: 0,
            error: null,
          }),
        }),
      }),
    } as any);

    const res = await request(app)
      .get('/chats/shop123/chats')
      .query({ page: 1, limit: 20, search: 'john' })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('should return messages for conversation', async () => {
    const mockMessages = [
      {
        messageId: 'msg1',
        senderType: 'customer',
        body: 'Hello',
        createdAt: new Date().toISOString(),
        isRead: true,
      },
    ];

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            range: jest.fn().mockResolvedValue({
              data: mockMessages,
              count: 1,
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const res = await request(app)
      .get('/chats/shop123/chats/cust1/messages')
      .query({ page: 1, limit: 50 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.messages).toEqual(mockMessages);
  });

  it('should validate pagination parameters', async () => {
    const res = await request(app)
      .get('/chats/shop123/chats')
      .query({ page: 0, limit: 20 })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should handle database errors', async () => {
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          range: jest.fn().mockResolvedValue({ 
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      }),
    } as any);

    const res = await request(app)
      .get('/chats/shop123/chats')
      .query({ page: 1, limit: 20 })
      .expect(500);

    expect(res.body.success).toBe(false);
  });
});

describe('Statements Route', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = setupApp();
  });

  it('should generate PDF for valid month/year', async () => {
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [
            {
              date: '2026-04-01',
              revenuePaise: 100000,
              orders: 5,
            },
          ],
          error: null,
        }),
      }),
    } as any);

    const res = await request(app)
      .get('/statements/shop123/statement/pdf')
      .query({ month: 4, year: 2026 })
      .expect(200);

    expect(res.headers['content-type']).toMatch(/pdf/i);
    expect(res.headers['content-disposition']).toBeDefined();
  });

  it('should reject invalid month', async () => {
    const res = await request(app)
      .get('/statements/shop123/statement/pdf')
      .query({ month: 13, year: 2026 })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toMatch(/VALIDATION_ERROR|INVALID_DATE/);
  });

  it('should reject future dates', async () => {
    const futureYear = new Date().getFullYear() + 1;

    const res = await request(app)
      .get('/statements/shop123/statement/pdf')
      .query({ month: 1, year: futureYear })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should validate year bounds', async () => {
    const res = await request(app)
      .get('/statements/shop123/statement/pdf')
      .query({ month: 4, year: 2019 })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should handle analytics data aggregation', async () => {
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [
            { date: '2026-04-01', revenuePaise: 100000, orders: 5 },
            { date: '2026-04-02', revenuePaise: 150000, orders: 7 },
          ],
          error: null,
        }),
      }),
    } as any);

    const res = await request(app)
      .get('/statements/shop123/statement/pdf')
      .query({ month: 4, year: 2026 })
      .expect(200);

    expect(res.headers['content-type']).toMatch(/pdf/i);
  });

  it('should include proper PDF headers', async () => {
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    } as any);

    const res = await request(app)
      .get('/statements/shop123/statement/pdf')
      .query({ month: 4, year: 2026 })
      .expect(200);

    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.headers['content-disposition']).toContain('.pdf');
    expect(res.headers['cache-control']).toBeDefined();
  });
});
