import { Router } from 'express';
import logger from '../utils/logger.js';
import { successResponse } from '../utils/response.js';
import { validate } from '../middleware/validate.js';
import {
  searchProductsQuerySchema,
  searchShopsQuerySchema,
} from '../utils/validators.js';
import SearchService from '../services/search.js';

const router = Router();

router.get(
  '/shops',
  validate(searchShopsQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const result = await SearchService.searchShops(req.query);

      logger.info('Shop search completed', {
        found: result.meta.found,
        page: result.meta.page,
        limit: result.meta.limit,
      });

      return res.status(200).json(successResponse(result.data, result.meta));
    } catch (err) {
      logger.error('Search shops endpoint error', {
        error: err.message,
        query: req.query,
      });
      return next(err);
    }
  }
);

router.get(
  '/products',
  validate(searchProductsQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const result = await SearchService.searchProducts(req.query);

      logger.info('Product search completed', {
        found: result.meta.found,
        page: result.meta.page,
        limit: result.meta.limit,
      });

      return res.status(200).json(successResponse(result.data, result.meta));
    } catch (err) {
      logger.error('Search products endpoint error', {
        error: err.message,
        query: req.query,
      });
      return next(err);
    }
  }
);

export default router;
