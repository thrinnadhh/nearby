import request from 'supertest';
import { app } from '../../index.js';
import { generateToken } from '../../middleware/auth.js';

jest.mock('../../services/redis.js', () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    call: jest.fn().mockResolvedValue(null),
    ping: jest.fn().mockResolvedValue('PONG'),
  },
}));

jest.mock('../../services/supabase.js', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: {}, error: null }),
    },
  },
}));

jest.mock('../../services/r2.js', () => ({
  uploadFile: jest.fn().mockResolvedValue({ ETag: '"test-etag"' }),
  getSignedFileUrl: jest.fn().mockResolvedValue('https://example.r2.dev/signed-kyc'),
  deleteFile: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../jobs/typesenseSync.js', () => ({
  typesenseSyncQueue: {
    add: jest.fn().mockResolvedValue({ id: 'job-123' }),
  },
  typesenseSyncWorker: {},
}));

describe('Shop KYC Upload (Task 2.2)', () => {
  const SHOP_OWNER_ID = '550e8400-e29b-41d4-a716-446655440001';
  const SHOP_ID = '550e8400-e29b-41d4-a716-446655440020';
  const OTHER_OWNER_ID = '550e8400-e29b-41d4-a716-446655440099';
  const IDEMPOTENCY_KEY = '85e9f9ff-7601-4440-90c5-fd7f8dbf7f7c';

  let ownerToken;
  let mockSupabase;
  let mockRedis;
  let mockR2;

  beforeAll(async () => {
    ownerToken = generateToken({
      userId: SHOP_OWNER_ID,
      phone: '+919999999999',
      role: 'shop_owner',
      shopId: SHOP_ID,
    });

    ({ supabase: mockSupabase } = await import('../../services/supabase.js'));
    ({ redis: mockRedis } = await import('../../services/redis.js'));
    mockR2 = await import('../../services/r2.js');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedis.get.mockResolvedValue(null);
    mockRedis.setex.mockResolvedValue('OK');
    mockR2.uploadFile.mockResolvedValue({ ETag: '"test-etag"' });
    mockR2.getSignedFileUrl.mockResolvedValue('https://example.r2.dev/signed-kyc');
  });

  const createPdfBuffer = (sizeInKb = 8) => {
    const pdfHeader = '%PDF-1.4\n';
    const padding = 'x'.repeat(Math.max(0, sizeInKb * 1024 - pdfHeader.length));
    return Buffer.from(pdfHeader + padding);
  };

  const mockKycFlow = ({ ownerId = SHOP_OWNER_ID, cached = null } = {}) => {
    let shopsCallCount = 0;
    mockRedis.get.mockResolvedValue(cached ? JSON.stringify(cached) : null);

    mockSupabase.from.mockImplementation((table) => {
      if (table !== 'shops') {
        return {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      }

      shopsCallCount += 1;

      if (shopsCallCount === 1) {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { owner_id: ownerId },
            error: ownerId ? null : { code: 'PGRST116' },
          }),
        };
      }

      if (shopsCallCount === 2) {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: ownerId
              ? { id: SHOP_ID, name: 'Fresh Kirana Store', owner_id: ownerId }
              : null,
            error: ownerId ? null : { code: 'PGRST116' },
          }),
        };
      }

      return {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: SHOP_ID,
            kyc_status: 'kyc_submitted',
            updated_at: new Date().toISOString(),
          },
          error: null,
        }),
      };
    });
  };

  it('uploads a valid PDF KYC document and returns 201', async () => {
    mockKycFlow();

    const res = await request(app)
      .post(`/api/v1/shops/${SHOP_ID}/kyc`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('idempotency-key', IDEMPOTENCY_KEY)
      .attach('document', createPdfBuffer(), {
        filename: 'kyc.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.shopId).toBe(SHOP_ID);
    expect(res.body.data.kycStatus).toBe('kyc_submitted');
    expect(res.body.data.kycDocumentUrl).toBe('https://example.r2.dev/signed-kyc');
    expect(mockR2.uploadFile).toHaveBeenCalled();
    expect(mockRedis.setex).toHaveBeenCalled();
  });

  it('returns cached response for repeated idempotency key', async () => {
    const cached = {
      shopId: SHOP_ID,
      kycDocumentUrl: 'https://example.r2.dev/cached-kyc',
      kycStatus: 'kyc_submitted',
      updatedAt: new Date().toISOString(),
    };
    mockKycFlow({ cached });

    const res = await request(app)
      .post(`/api/v1/shops/${SHOP_ID}/kyc`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('idempotency-key', IDEMPOTENCY_KEY)
      .attach('document', createPdfBuffer(), {
        filename: 'kyc.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.kycDocumentUrl).toBe(cached.kycDocumentUrl);
    expect(mockR2.uploadFile).not.toHaveBeenCalled();
  });

  it('returns 400 when idempotency-key header is missing', async () => {
    mockKycFlow();

    const res = await request(app)
      .post(`/api/v1/shops/${SHOP_ID}/kyc`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('document', createPdfBuffer(), {
        filename: 'kyc.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when no PDF document is uploaded', async () => {
    mockKycFlow();

    const res = await request(app)
      .post(`/api/v1/shops/${SHOP_ID}/kyc`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('idempotency-key', IDEMPOTENCY_KEY)
      .field('_placeholder', '1');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
  });

  it('returns 403 when shop ownership verification fails', async () => {
    mockKycFlow({ ownerId: OTHER_OWNER_ID });

    const res = await request(app)
      .post(`/api/v1/shops/${SHOP_ID}/kyc`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('idempotency-key', IDEMPOTENCY_KEY)
      .attach('document', createPdfBuffer(), {
        filename: 'kyc.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
