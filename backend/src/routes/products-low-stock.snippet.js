// ADD THIS ROUTE TO backend/src/routes/products.js
// BEFORE the "export default router;" line

/**
 * GET /api/v1/shops/:shopId/products/low-stock
 * List products below low stock threshold for a shop.
 * Requires: Authentication + shop_owner role + ownership of shop
 * Query params:
 *   - threshold (1-999, default 5): stock quantity threshold
 *   - page (1-indexed, default 1): pagination
 *   - limit (1-100, default 20): items per page
 *   - sortBy ('stock'|'name'|'updated_at', default 'stock'): sort order
 * Response: 200 with paginated products below threshold
 * Metadata: { page, total, pages, lowStockCount, threshold }
 */
router.get(
  '/shops/:shopId/products/low-stock',
  authenticate,
  roleGuard(['shop_owner']),
  shopOwnerGuard(),
  validate(lowStockAlertsQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const { shopId } = req.params;
      const { userId } = req.user;
      const { threshold, page, limit, sortBy } = req.query;

      const result = await ProductService.getLowStockProducts(userId, shopId, {
        threshold: threshold ? parseInt(threshold, 10) : 5,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
        sortBy: sortBy || 'stock',
      });

      logger.info('Low stock alerts endpoint success', {
        userId,
        shopId,
        threshold: result.threshold,
        page: result.page,
        limit: result.limit,
        sortBy,
        count: result.products.length,
        total: result.total,
      });

      return res.status(200).json(
        successResponse(result.products, {
          page: result.page,
          limit: result.limit,
          total: result.total,
          pages: result.pages,
          lowStockCount: result.lowStockCount,
          threshold: result.threshold,
        })
      );
    } catch (err) {
      logger.error('Low stock alerts endpoint error', {
        error: err.message,
        shopId: req.params.shopId,
        userId: req.user?.userId,
      });
      return next(err);
    }
  }
);
