import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { parse } from 'csv-parse/sync';
import logger from '../utils/logger.js';
import {
  AppError,
  SHOP_NOT_FOUND,
  UNAUTHORIZED,
  UPLOAD_FAILED,
  VALIDATION_ERROR,
  INTERNAL_ERROR,
  PRODUCT_NOT_FOUND,
} from '../utils/errors.js';
import { supabase } from './supabase.js';
import { uploadFile } from './r2.js';
import { typesenseSyncQueue } from '../jobs/typesenseSync.js';
import { bulkProductRowSchema } from '../utils/validators.js';

const PRODUCTS_BUCKET = process.env.R2_PRODUCTS_BUCKET || 'nearby-products';
const R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN || 'pub.nearby.app';

// Required CSV column headers (order-independent)
const REQUIRED_CSV_COLUMNS = ['name', 'description', 'category', 'price_paise', 'stock_quantity', 'unit'];

const BULK_ROW_LIMIT = 100;
const TEMPLATE_HEADER = ['name', 'description', 'category', 'price_paise', 'stock_quantity', 'unit'];
const CATEGORY_TEMPLATE_DEFAULTS = {
  grocery: { name: 'Toor Dal', description: 'Premium pantry staple', price_paise: '12000', stock_quantity: '25', unit: 'kg' },
  vegetable: { name: 'Fresh Tomatoes', description: 'Farm fresh tomatoes', price_paise: '3000', stock_quantity: '50', unit: 'kg' },
  fruit: { name: 'Bananas', description: 'Robusta bananas', price_paise: '6000', stock_quantity: '30', unit: 'dozen' },
  dairy: { name: 'Cow Milk', description: 'Fresh full cream milk', price_paise: '6500', stock_quantity: '20', unit: 'litre' },
  medicine: { name: 'Paracetamol 500', description: '10 tablet strip', price_paise: '3500', stock_quantity: '40', unit: 'box' },
  personal_care: { name: 'Shampoo Sachet', description: 'Daily care shampoo', price_paise: '200', stock_quantity: '200', unit: 'piece' },
  household: { name: 'Dishwash Liquid', description: 'Lemon fresh cleaner', price_paise: '9500', stock_quantity: '18', unit: 'litre' },
  electronics: { name: 'USB Cable', description: 'Type-C charging cable', price_paise: '24900', stock_quantity: '35', unit: 'piece' },
  clothing: { name: 'Cotton T-Shirt', description: 'Regular fit tee', price_paise: '49900', stock_quantity: '15', unit: 'piece' },
  food_beverage: { name: 'Cold Coffee', description: 'Ready to drink bottle', price_paise: '8500', stock_quantity: '24', unit: 'pack' },
  pet_supplies: { name: 'Dog Biscuits', description: 'Adult dog treats', price_paise: '19900', stock_quantity: '22', unit: 'pack' },
  other: { name: 'Sample Product', description: 'Describe the product clearly', price_paise: '10000', stock_quantity: '10', unit: 'piece' },
};

/**
 * ProductService — encapsulates all product business logic.
 * Provides methods for single product creation and bulk CSV import.
 */
class ProductService {
  static buildTemplateCsv(category) {
    const selectedCategory = category || 'grocery';
    const sampleRow = CATEGORY_TEMPLATE_DEFAULTS[selectedCategory] || CATEGORY_TEMPLATE_DEFAULTS.other;
    const fields = [
      sampleRow.name,
      sampleRow.description,
      category || '',
      sampleRow.price_paise,
      sampleRow.stock_quantity,
      sampleRow.unit,
    ];

    return [
      TEMPLATE_HEADER.join(','),
      fields.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','),
    ].join('\n');
  }

  /**
   * Verify that a shop exists and that the given user owns it.
   * Defense-in-depth: checks DB regardless of JWT claims.
   *
   * @private
   * @param {string} userId
   * @param {string} shopId
   * @returns {Promise<Object>} shop row (id, owner_id)
   * @throws {AppError} SHOP_NOT_FOUND (404) or UNAUTHORIZED (403)
   */
  static async _verifyOwnership(userId, shopId) {
    const { data: shop, error } = await supabase
      .from('shops')
      .select('id, owner_id')
      .eq('id', shopId)
      .single();

    if (error || !shop) {
      logger.warn('ProductService: shop not found', { userId, shopId, error: error?.message });
      throw new AppError(SHOP_NOT_FOUND, 'Shop does not exist.', 404);
    }

    if (shop.owner_id !== userId) {
      logger.warn('ProductService: unauthorized shop access', {
        userId,
        shopId,
        shopOwnerId: shop.owner_id,
      });
      throw new AppError(UNAUTHORIZED, 'You are not authorized to manage this shop.', 403);
    }

    return shop;
  }

  /**
   * Upload a product image (full + thumbnail) to R2 public bucket.
   * Resizes with Sharp: 600×600 full, 150×150 thumbnail. Always outputs JPEG.
   * Atomic: if either upload fails, throws before any DB insert.
   *
   * @private
   * @param {string} shopId
   * @param {string} productId - pre-generated UUID for the product
   * @param {Buffer} imageBuffer - raw file buffer from multer
   * @returns {Promise<{ imageUrl: string, thumbnailUrl: string }>}
   * @throws {AppError} UPLOAD_FAILED (500) if R2 upload fails
   */
  static async _uploadProductImages(shopId, productId, imageBuffer) {
    let fullBuffer;
    let thumbBuffer;

    try {
      fullBuffer = await sharp(imageBuffer)
        .resize(600, 600, { fit: 'cover' })
        .jpeg({ quality: 85 })
        .toBuffer();

      thumbBuffer = await sharp(imageBuffer)
        .resize(150, 150, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toBuffer();
    } catch (err) {
      logger.error('ProductService: image processing failed', {
        shopId,
        productId,
        error: err.message,
      });
      throw new AppError(UPLOAD_FAILED, 'Failed to process product image.', 500);
    }

    const fullKey = `products/${shopId}/${productId}-full.jpg`;
    const thumbKey = `products/${shopId}/${productId}-thumb.jpg`;

    try {
      await uploadFile(PRODUCTS_BUCKET, fullKey, fullBuffer, { contentType: 'image/jpeg', shopId });
    } catch (err) {
      logger.error('ProductService: full image R2 upload failed', {
        shopId,
        productId,
        key: fullKey,
        error: err.message,
      });
      throw new AppError(UPLOAD_FAILED, 'Failed to upload product image. Please try again.', 500);
    }

    try {
      await uploadFile(PRODUCTS_BUCKET, thumbKey, thumbBuffer, { contentType: 'image/jpeg', shopId });
    } catch (err) {
      logger.error('ProductService: thumbnail R2 upload failed', {
        shopId,
        productId,
        key: thumbKey,
        error: err.message,
      });
      throw new AppError(UPLOAD_FAILED, 'Failed to upload product thumbnail. Please try again.', 500);
    }

    const imageUrl = `https://${R2_PUBLIC_DOMAIN}/products/${shopId}/${productId}-full.jpg`;
    const thumbnailUrl = `https://${R2_PUBLIC_DOMAIN}/products/${shopId}/${productId}-thumb.jpg`;

    return { imageUrl, thumbnailUrl };
  }

  /**
   * Queue a Typesense product_sync job (fire-and-forget).
   * Logs warning on failure but does NOT throw — queue failure is non-critical.
   *
   * @private
   * @param {Object} product - inserted product row
   */
  static async _queueTypesenseSync(product) {
    try {
      await typesenseSyncQueue.add('product_sync', {
        action: 'product_sync',
        productId: product.id,
        productData: {
          id: product.id,
          shop_id: product.shop_id,
          name: product.name,
          description: product.description || '',
          category: product.category,
          price: product.price,
          stock_quantity: product.stock_quantity,
          unit: product.unit,
          is_available: product.is_available,
          image_url: product.image_url || '',
          thumbnail_url: product.thumbnail_url || '',
          created_at: Math.floor(new Date(product.created_at).getTime() / 1000),
          updated_at: Math.floor(new Date(product.updated_at).getTime() / 1000),
        },
      });
      logger.debug('ProductService: Typesense sync job queued', { productId: product.id });
    } catch (queueErr) {
      logger.warn('ProductService: failed to queue Typesense sync', {
        productId: product.id,
        error: queueErr.message,
      });
    }
  }

  /**
   * Map a DB product row to a camelCase API response object (immutable).
   *
   * @private
   * @param {Object} row - raw Supabase row
   * @returns {Object} camelCase product response
   */
  static _toResponse(row) {
    return Object.freeze({
      id: row.id,
      shopId: row.shop_id,
      name: row.name,
      description: row.description ?? null,
      category: row.category,
      price: row.price,
      stockQuantity: row.stock_quantity,
      unit: row.unit,
      isAvailable: row.is_available,
      imageUrl: row.image_url ?? null,
      thumbnailUrl: row.thumbnail_url ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  /**
   * Create a single product, optionally with an image.
   *
   * Steps:
   *  1. Verify shop exists + user owns it (defense-in-depth)
   *  2. If image provided: resize with Sharp → upload full + thumb to R2 (atomic)
   *  3. Insert product row into Supabase
   *  4. Queue Typesense product_sync job (fire-and-forget)
   *  5. Return immutable camelCase response
   *
   * @param {string} userId
   * @param {string} shopId
   * @param {Object} productData - validated body from createProductSchema
   * @param {Object|null} imageFile - multer file object or null
   * @returns {Promise<Object>} camelCase product response
   */
  static async createProduct(userId, shopId, productData, imageFile) {
    logger.info('ProductService.createProduct called', { userId, shopId });

    // 1. Verify ownership
    await this._verifyOwnership(userId, shopId);

    // 2. Handle image upload before DB insert (atomic — fail fast)
    const productId = uuidv4();
    let imageUrl = null;
    let thumbnailUrl = null;

    if (imageFile) {
      const urls = await this._uploadProductImages(shopId, productId, imageFile.buffer);
      imageUrl = urls.imageUrl;
      thumbnailUrl = urls.thumbnailUrl;
    }

    // 3. Insert product row
    const productRecord = {
      id: productId,
      shop_id: shopId,
      name: productData.name.trim(),
      description: productData.description ? productData.description.trim() : null,
      category: productData.category,
      price: productData.price,
      stock_quantity: productData.stock_quantity,
      unit: productData.unit,
      is_available: true,
      image_url: imageUrl,
      thumbnail_url: thumbnailUrl,
    };

    const { data: product, error: insertError } = await supabase
      .from('products')
      .insert(productRecord)
      .select()
      .single();

    if (insertError || !product) {
      logger.error('ProductService: failed to insert product', {
        userId,
        shopId,
        productId,
        error: insertError?.message,
      });
      throw new AppError(INTERNAL_ERROR, 'Failed to create product. Please try again.', 500);
    }

    logger.info('ProductService: product created', { productId: product.id, shopId });

    // 4. Queue Typesense sync (fire-and-forget)
    await this._queueTypesenseSync(product);

    // 5. Return immutable camelCase response
    return this._toResponse(product);
  }

  /**
   * Update mutable product fields for a shop owner.
   * Allowed fields: price, stock_quantity.
   *
   * @param {string} userId
   * @param {string} productId
   * @param {Object} updateData
   * @returns {Promise<Object>} camelCase product response
   */
  static async updateProduct(userId, productId, updateData) {
    logger.info('ProductService.updateProduct called', { userId, productId });

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId)) {
      throw new AppError(PRODUCT_NOT_FOUND, 'Product does not exist.', 404);
    }

    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      logger.warn('ProductService: product not found', {
        userId,
        productId,
        error: productError?.message,
      });
      throw new AppError(PRODUCT_NOT_FOUND, 'Product does not exist.', 404);
    }

    if (product.deleted_at) {
      logger.warn('ProductService: attempted update on deleted product', {
        userId,
        productId,
      });
      throw new AppError(PRODUCT_NOT_FOUND, 'Product does not exist.', 404);
    }

    await this._verifyOwnership(userId, product.shop_id);

    const productPatch = {};
    if (Object.prototype.hasOwnProperty.call(updateData, 'price')) {
      productPatch.price = updateData.price;
    }
    if (Object.prototype.hasOwnProperty.call(updateData, 'stock_quantity')) {
      productPatch.stock_quantity = updateData.stock_quantity;
    }

    const { data: updatedProduct, error: updateError } = await supabase
      .from('products')
      .update(productPatch)
      .eq('id', productId)
      .select()
      .single();

    if (updateError || !updatedProduct) {
      logger.error('ProductService: failed to update product', {
        userId,
        productId,
        error: updateError?.message,
      });
      throw new AppError(INTERNAL_ERROR, 'Failed to update product. Please try again.', 500);
    }

    await this._queueTypesenseSync(updatedProduct);
    return this._toResponse(updatedProduct);
  }

  /**
   * Soft-delete a product and remove it from Typesense.
   *
   * @param {string} userId
   * @param {string} productId
   * @returns {Promise<void>}
   */
  static async deleteProduct(userId, productId) {
    logger.info('ProductService.deleteProduct called', { userId, productId });

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId)) {
      throw new AppError(PRODUCT_NOT_FOUND, 'Product does not exist.', 404);
    }

    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError || !product || product.deleted_at) {
      logger.warn('ProductService: product not found for delete', {
        userId,
        productId,
        error: productError?.message,
      });
      throw new AppError(PRODUCT_NOT_FOUND, 'Product does not exist.', 404);
    }

    await this._verifyOwnership(userId, product.shop_id);

    const { error: deleteError } = await supabase
      .from('products')
      .update({
        deleted_at: new Date().toISOString(),
        is_available: false,
      })
      .eq('id', productId)
      .select('id')
      .single();

    if (deleteError) {
      logger.error('ProductService: failed to soft delete product', {
        userId,
        productId,
        error: deleteError.message,
      });
      throw new AppError(INTERNAL_ERROR, 'Failed to delete product. Please try again.', 500);
    }

    try {
      await typesenseSyncQueue.add('product_remove', {
        action: 'product_remove',
        productId,
      });
      logger.debug('ProductService: Typesense remove job queued', { productId });
    } catch (queueErr) {
      logger.warn('ProductService: failed to queue product remove', {
        productId,
        error: queueErr.message,
      });
    }
  }

  /**
   * Bulk-create products from a CSV buffer.
   *
   * Steps:
   *  1. Verify shop exists + user owns it
   *  2. Parse CSV synchronously with csv-parse
   *  3. Validate headers (must include all required columns)
   *  4. Reject if row count > BULK_ROW_LIMIT
   *  5. Validate each row with bulkProductRowSchema
   *  6. If no valid rows, throw VALIDATION_ERROR
   *  7. Batch insert valid rows via single Supabase call
   *  8. Queue one product_sync job per inserted product
   *  9. Return { created, failed, errors }
   *
   * @param {string} userId
   * @param {string} shopId
   * @param {Buffer} csvBuffer - raw CSV file buffer
   * @returns {Promise<{ created: number, failed: number, errors: Array }>}
   */
  static async bulkCreateProducts(userId, shopId, csvBuffer) {
    logger.info('ProductService.bulkCreateProducts called', { userId, shopId });

    // 1. Verify ownership
    await this._verifyOwnership(userId, shopId);

    // 2. Parse CSV
    let rows;
    try {
      rows = parse(csvBuffer.toString(), {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (parseErr) {
      logger.warn('ProductService: CSV parse error', { shopId, error: parseErr.message });
      throw new AppError(VALIDATION_ERROR, `CSV parse error: ${parseErr.message}`, 400);
    }

    // 3. Validate headers
    if (!rows || rows.length === 0) {
      throw new AppError(VALIDATION_ERROR, 'CSV file is empty or contains only headers.', 400);
    }

    const actualColumns = Object.keys(rows[0]);
    const missingColumns = REQUIRED_CSV_COLUMNS.filter(col => !actualColumns.includes(col));
    if (missingColumns.length > 0) {
      throw new AppError(
        VALIDATION_ERROR,
        `CSV is missing required columns: ${missingColumns.join(', ')}. Required: ${REQUIRED_CSV_COLUMNS.join(', ')}`,
        400
      );
    }

    // 4. Enforce row limit
    if (rows.length > BULK_ROW_LIMIT) {
      throw new AppError(
        VALIDATION_ERROR,
        `CSV must not exceed ${BULK_ROW_LIMIT} rows. Found: ${rows.length}`,
        400
      );
    }

    // 5. Validate each row
    const validRows = [];
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const rawRow = rows[i];
      const rowNumber = i + 1;

      // Map CSV column price_paise → price for schema validation
      const rowToValidate = {
        name: rawRow.name,
        description: rawRow.description,
        category: rawRow.category,
        price: rawRow.price_paise,
        stock_quantity: rawRow.stock_quantity,
        unit: rawRow.unit,
      };

      const { error: rowError, value: rowValue } = bulkProductRowSchema.validate(rowToValidate, {
        abortEarly: true,
        convert: true,
      });

      if (rowError) {
        const detail = rowError.details[0];
        errors.push({
          row: rowNumber,
          field: detail.path.join('.'),
          message: detail.message,
        });
      } else {
        validRows.push({
          shop_id: shopId,
          name: rowValue.name.trim(),
          description: rowValue.description ? rowValue.description.trim() : null,
          category: rowValue.category,
          price: rowValue.price,
          stock_quantity: rowValue.stock_quantity,
          unit: rowValue.unit,
          is_available: true,
          image_url: null,
          thumbnail_url: null,
        });
      }
    }

    // 6. Reject if no valid rows
    if (validRows.length === 0) {
      logger.warn('ProductService: bulk upload — no valid rows', { shopId, errors });
      throw new AppError(
        VALIDATION_ERROR,
        'No valid rows found in CSV. Please fix the errors and try again.',
        400,
        { errors }
      );
    }

    // 7. Batch insert valid rows (single Supabase call)
    const { data: insertedProducts, error: insertError } = await supabase
      .from('products')
      .insert(validRows)
      .select();

    if (insertError || !insertedProducts) {
      logger.error('ProductService: bulk insert failed', {
        shopId,
        error: insertError?.message,
        validRowCount: validRows.length,
      });
      throw new AppError(INTERNAL_ERROR, 'Failed to insert products. Please try again.', 500);
    }

    logger.info('ProductService: bulk products inserted', {
      shopId,
      created: insertedProducts.length,
      failed: errors.length,
    });

    // 8. Queue one Typesense sync job per inserted product (fire-and-forget)
    await Promise.all(insertedProducts.map(product => this._queueTypesenseSync(product)));

    // 9. Return result summary
    return {
      created: insertedProducts.length,
      failed: errors.length,
      errors,
    };
  }
}

export default ProductService;
