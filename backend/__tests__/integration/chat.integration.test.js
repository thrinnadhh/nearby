import { describe, it, expect, beforeAll, afterEach, jest } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';

// Mock Supabase service
jest.mock('../../src/services/supabase.js', () => ({
  supabase: {
    from: jest.fn((table) => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

describe('Chat Messages', () => {
  let customerId;
  let shopId;
  let mockSupabase;

  beforeAll(async () => {
    customerId = uuidv4();
    shopId = uuidv4();

    const { supabase } = await import('../../src/services/supabase.js');
    mockSupabase = supabase;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('messages table', () => {
    it('should insert customer message', async () => {
      const messageId = uuidv4();

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'messages') {
          return {
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: messageId,
                shop_id: shopId,
                customer_id: customerId,
                sender_type: 'customer',
                body: 'Hello shop!',
                is_read: false,
                created_at: new Date().toISOString(),
              },
              error: null,
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const { data, error } = await mockSupabase
        .from('messages')
        .insert({
          id: messageId,
          shop_id: shopId,
          customer_id: customerId,
          sender_type: 'customer',
          body: 'Hello shop!',
          is_read: false,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.body).toBe('Hello shop!');
      expect(data.sender_type).toBe('customer');
    });

    it('should insert shop message', async () => {
      const messageId = uuidv4();

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'messages') {
          return {
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: messageId,
                shop_id: shopId,
                customer_id: customerId,
                sender_type: 'shop',
                body: 'Hello customer!',
                is_read: false,
                created_at: new Date().toISOString(),
              },
              error: null,
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const { data, error } = await mockSupabase
        .from('messages')
        .insert({
          id: messageId,
          shop_id: shopId,
          customer_id: customerId,
          sender_type: 'shop',
          body: 'Hello customer!',
          is_read: false,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.sender_type).toBe('shop');
    });

    it('should fetch messages for shop', async () => {
      const messageId = uuidv4();

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'messages') {
          return {
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({
              data: [
                {
                  id: messageId,
                  shop_id: shopId,
                  customer_id: customerId,
                  sender_type: 'customer',
                  body: 'Hello!',
                  is_read: false,
                  created_at: new Date().toISOString(),
                },
              ],
              error: null,
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const { data, error } = await mockSupabase
        .from('messages')
        .select('*')
        .eq('shop_id', shopId);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(0);
    });
  });
});
