import { Router } from 'express';
import { MulterError } from 'multer';
import logger from '../utils/logger.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { authenticate } from '../middleware/auth.js';
import { roleGuard, shopOwnerGuard } from '../middleware/roleGuard.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { imageUpload, csvUpload } from '../middleware/multer.js';
import {
  createProductSchema,
  productTemplateQuerySchema,
  updateProductSchema,
} from '../utils/validators.js';
import ProductService from '../services/products.js';

const router = Router();

function handleUploadError(err, res) {
  if (err instanceof MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json(
      errorResponse('FILE_TOO_LARGE', 'File is too large.')
    );
  }

  return res.status(400).json(
    errorResponse('INVALID_FILE_TYPE', err.message)
  );
}

/**
 * GET /api/v1/shops/:shopId/products
 * List all products for authenticated shop owner
 * Query params: page (1-indexed), limit (1-100)
 * Response: { success, data: Product[], meta: { page, total, pages } }
 */
router.get(
  '/shops/:shopId/products',
  authenticate,
  roleGuard(['shop_owner']),
  shopOwnerGuard(),
  rateLimit('shop-products', 60, 60), // 60 req/min per user (SECURITY FIX #2)
  async (req, res, next) => {
    try {
      const { shopId } = req.params;
      const { userId } = req.user;
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 50));

      // Verify ownership (shopOwnerGuard already did this, but be explicit)
      const result = await ProductService.listShopProducts(userId, shopId, page, limit);

      logger.info('List shop products success', {
        userId,
        shopId,
        page,
        limit,
        count: result.products.length,
        total: result.total,
      });

      return res.status(200).json(successResponse(result.products, {
        page,
        total: result.total,
        pages: result.pages,
        limit,
      }));
    } catch (err) {
      logger.error('List shop products error', {
        error: err.message,
        shopId: req.params.shopId,
        userId: req.user?.userId,
      });
      return next(err);
    }
  }
);

/**
 * POST /api/v1/shops/:shopId/products
 * Create a single product for a shop, with optional image upload.
 * Requires: Authentication + shop_owner role + ownership of shop
 * Request: multipart/form-data
 *   Fields: name, description?, category, price (paise), stock_quantity, unit
 *   File:   image? (JPEG/PNG/WEBP, max 5 MB)
 * Response: 201 with created product object
 */
router.post(
  '/shops/:shopId/products',
  authenticate,
  roleGuard(['shop_owner']),
  (req, res, next) => {
    // imageUpload.single wraps its own multer error handling.
    // We surface INVALID_FILE_TYPE for wrong MIME rather than a 500.
    imageUpload.single('image')(req, res, (err) => {
      if (err) {
        logger.warn('Product image upload multer error', {
          error: err.message,
          shopId: req.params.shopId,
          userId: req.user?.userId,
        });
        return handleUploadError(err, res);
      }
      next();
    });
  },
  validate(createProductSchema),
  shopOwnerGuard(),
  async (req, res, next) => {
    try {
      const { shopId } = req.params;
      const { userId } = req.user;

      const product = await ProductService.createProduct(
        userId,
        shopId,
        req.body,
        req.file || null
      );

      logger.info('Product created', { userId, shopId, productId: product.id });
      return res.status(201).json(successResponse(product));
    } catch (err) {
      logger.error('Create product endpoint error', {
        error: err.message,
        shopId: req.params.shopId,
        userId: req.user?.userId,
      });
      return next(err);
    }
  }
);

router.get(
  '/products/template',
  authenticate,
  roleGuard(['shop_owner']),
  validate(productTemplateQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const { category } = req.query;
      const csv = ProductService.buildTemplateCsv(category);
      const suffix = category ? `-${category}` : '';

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="nearby-products-template${suffix}.csv"`
      );

      return res.status(200).send(csv);
    } catch (err) {
      logger.error('Get product template endpoint error', {
        error: err.message,
        userId: req.user?.userId,
      });
      return next(err);
    }
  }
);

router.patch(
  '/products/:productId',
  authenticate,
  roleGuard(['shop_owner']),
  validate(updateProductSchema),
  async (req, res, next) => {
    try {
      const { productId } = req.params;
      const { userId } = req.user;

      const product = await ProductService.updateProduct(userId, productId, req.body);

      logger.info('Product updated', { userId, productId });
      return res.status(200).json(successResponse(product));
    } catch (err) {
      logger.error('Update product endpoint error', {
        error: err.message,
        productId: req.params.productId,
        userId: req.user?.userId,
      });
      return next(err);
    }
  }
);

router.delete(
  '/products/:productId',
  authenticate,
  roleGuard(['shop_owner']),
  async (req, res, next) => {
    try {
      const { productId } = req.params;
      const { userId } = req.user;

      await ProductService.deleteProduct(userId, productId);

      logger.info('Product deleted', { userId, productId });
      return res.status(204).send();
    } catch (err) {
      logger.error('Delete product endpoint error', {
        error: err.message,
        productId: req.params.productId,
        userId: req.user?.userId,
      });
      return next(err);
    }
  }
);

/**
 * POST /api/v1/shops/:shopId/products/bulk
 * Bulk-create products for a shop from a CSV file.
 * Requires: Authentication + shop_owner role + ownership of shop
 * Request: multipart/form-data
 *   File: csv (text/csv, max 2 MB)
 *   CSV columns: name, description, category, price_paise, stock_quantity, unit
 * Response:
 *   201 when all rows succeed  ({ created: N, failed: 0,  errors: [] })
 *   207 when some rows fail    ({ created: N, failed: M,  errors: [...] })
 */
router.post(
  '/shops/:shopId/products/bulk',
  authenticate,
  roleGuard(['shop_owner']),
  (req, res, next) => {
    csvUpload.single('csv')(req, res, (err) => {
      if (err) {
        logger.warn('Bulk CSV upload multer error', {
          error: err.message,
          shopId: req.params.shopId,
          userId: req.user?.userId,
        });
        return handleUploadError(err, res);
      }
      next();
    });
  },
  shopOwnerGuard(),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json(
          errorResponse('VALIDATION_ERROR', 'CSV file is required. Upload a file in the "csv" field.')
        );
      }

      const { shopId } = req.params;
      const { userId } = req.user;

      const result = await ProductService.bulkCreateProducts(userId, shopId, req.file.buffer);

      logger.info('Bulk products created', {
        userId,
        shopId,
        created: result.created,
        failed: result.failed,
      });

      // 201 when fully successful, 207 when partially successful
      const status = result.failed === 0 ? 201 : 207;
      return res.status(status).json(successResponse(result));
    } catch (err) {
      logger.error('Bulk create products endpoint error', {
        error: err.message,
        shopId: req.params.shopId,
        userId: req.user?.userId,
      });
      return next(err);
    }
  }
);

export default router;
