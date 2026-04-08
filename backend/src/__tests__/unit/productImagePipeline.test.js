import { v4 as uuidv4 } from 'uuid';

const mockUploadFile = jest.fn();
const mockTypesenseAdd = jest.fn();
const mockSharpFactory = jest.fn();

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
  uploadFile: (...args) => mockUploadFile(...args),
}));

jest.mock('../../jobs/typesenseSync.js', () => ({
  typesenseSyncQueue: {
    add: (...args) => mockTypesenseAdd(...args),
  },
  typesenseSyncWorker: {},
}));

jest.mock('sharp', () => (...args) => mockSharpFactory(...args));

describe('Product image resize pipeline', () => {
  let ProductService;
  let sharpChains;

  beforeAll(async () => {
    ({ default: ProductService } = await import('../../services/products.js'));
  });

  beforeEach(() => {
    jest.clearAllMocks();

    sharpChains = [];
    mockSharpFactory.mockImplementation(() => {
      const chain = {
        resize: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(Buffer.from(`processed-${sharpChains.length}`)),
      };
      sharpChains.push(chain);
      return chain;
    });

    mockUploadFile.mockResolvedValue({ ETag: '"ok"' });
    mockTypesenseAdd.mockResolvedValue({ id: 'job-1' });
  });

  it('resizes product images to 600x600 and 150x150 JPEGs before upload', async () => {
    const productId = uuidv4();
    const createdAt = new Date().toISOString();

    jest.spyOn(ProductService, '_verifyOwnership').mockResolvedValue({ id: 'shop-1', owner_id: 'user-1' });

    const { supabase } = await import('../../services/supabase.js');
    supabase.from.mockImplementation((table) => {
      if (table === 'products') {
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: {
              id: productId,
              shop_id: 'shop-1',
              name: 'Milk',
              description: 'Fresh milk',
              category: 'dairy',
              price: 6500,
              stock_quantity: 12,
              unit: 'litre',
              is_available: true,
              image_url: 'https://pub.nearby.app/products/shop-1/test-full.jpg',
              thumbnail_url: 'https://pub.nearby.app/products/shop-1/test-thumb.jpg',
              created_at: createdAt,
              updated_at: createdAt,
            },
            error: null,
          }),
        };
      }

      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'shop-1', owner_id: 'user-1' }, error: null }),
      };
    });

    await ProductService.createProduct(
      'user-1',
      'shop-1',
      {
        name: 'Milk',
        description: 'Fresh milk',
        category: 'dairy',
        price: 6500,
        stock_quantity: 12,
        unit: 'litre',
      },
      { buffer: Buffer.from('raw-image') }
    );

    expect(sharpChains).toHaveLength(2);
    expect(sharpChains[0].resize).toHaveBeenCalledWith(600, 600, { fit: 'cover' });
    expect(sharpChains[0].jpeg).toHaveBeenCalledWith({ quality: 85 });
    expect(sharpChains[1].resize).toHaveBeenCalledWith(150, 150, { fit: 'cover' });
    expect(sharpChains[1].jpeg).toHaveBeenCalledWith({ quality: 80 });
    expect(mockUploadFile).toHaveBeenCalledTimes(2);
    expect(mockUploadFile).toHaveBeenNthCalledWith(
      1,
      expect.any(String),
      expect.stringContaining('-full.jpg'),
      expect.any(Buffer),
      expect.objectContaining({ contentType: 'image/jpeg', shopId: 'shop-1' })
    );
    expect(mockUploadFile).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      expect.stringContaining('-thumb.jpg'),
      expect.any(Buffer),
      expect.objectContaining({ contentType: 'image/jpeg', shopId: 'shop-1' })
    );
  });

  it('returns UPLOAD_FAILED when Sharp processing fails before upload', async () => {
    jest.spyOn(ProductService, '_verifyOwnership').mockResolvedValue({ id: 'shop-1', owner_id: 'user-1' });
    mockSharpFactory.mockImplementation(() => ({
      resize: jest.fn().mockReturnThis(),
      jpeg: jest.fn().mockReturnThis(),
      toBuffer: jest.fn().mockRejectedValue(new Error('sharp failed')),
    }));

    await expect(
      ProductService.createProduct(
        'user-1',
        'shop-1',
        {
          name: 'Milk',
          description: 'Fresh milk',
          category: 'dairy',
          price: 6500,
          stock_quantity: 12,
          unit: 'litre',
        },
        { buffer: Buffer.from('raw-image') }
      )
    ).rejects.toMatchObject({
      code: 'UPLOAD_FAILED',
      statusCode: 500,
    });

    expect(mockUploadFile).not.toHaveBeenCalled();
  });
});
