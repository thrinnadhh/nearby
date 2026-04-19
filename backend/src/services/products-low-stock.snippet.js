// ADD THIS METHOD TO backend/src/services/products.js 
// BEFORE the "export default ProductService;" line

  /**
   * Get products below low stock threshold for a shop.
   * 
   * Features:
   *  - Filters products where stock_quantity <= threshold
   *  - Excludes soft-deleted products
   *  - Supports sorting by: stock (lowest first), name (A-Z), updated_at (newest)
   *  - Pagination with total count and page info
   *  - Returns comprehensive metadata for UI
   *
   * @param {string} userId - authenticated user ID
   * @param {string} shopId - shop ID to get low stock products for
   * @param {Object} options - query options
   * @param {number} options.threshold - stock quantity threshold (1-999, default 5)
   * @param {number} options.page - page number (1-indexed, default 1)
   * @param {number} options.limit - items per page (1-100, default 20)
   * @param {string} options.sortBy - sort order: 'stock'|'name'|'updated_at' (default 'stock')
   * @returns {Promise<Object>} { products, total, lowStockCount, page, pages, limit, threshold }
   * @throws {AppError} if not authorized or shop not found
   */
  static async getLowStockProducts(
    userId,
    shopId,
    { threshold = 5, page = 1, limit = 20, sortBy = 'stock' } = {}
  ) {
    logger.info('ProductService.getLowStockProducts called', {
      userId,
      shopId,
      threshold,
      page,
      limit,
      sortBy,
    });

    // 1. Verify ownership
    await this._verifyOwnership(userId, shopId);

    // 2. Validate and normalize pagination params
    const validPage = Math.max(1, parseInt(page, 10) || 1);
    const validLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const validThreshold = Math.max(1, Math.min(999, parseInt(threshold, 10) || 5));
    const offset = (validPage - 1) * validLimit;

    // 3. Determine sort column and direction
    let sortColumn = 'stock_quantity';
    let sortAscending = true;

    if (sortBy === 'name') {
      sortColumn = 'name';
      sortAscending = true;
    } else if (sortBy === 'updated_at') {
      sortColumn = 'updated_at';
      sortAscending = false;
    } else {
      // Default: 'stock' — lowest stock first
      sortColumn = 'stock_quantity';
      sortAscending = true;
    }

    // 4. Get total count of low stock products (for pagination metadata)
    const { count: lowStockCount, error: countError } = await supabase
      .from('products')
      .select('id', { count: 'exact' })
      .eq('shop_id', shopId)
      .lte('stock_quantity', validThreshold)
      .is('deleted_at', null);

    if (countError) {
      logger.error('ProductService: count low stock products failed', {
        shopId,
        userId,
        error: countError.message,
      });
      throw new AppError(INTERNAL_ERROR, 'Failed to get low stock count. Please try again.', 500);
    }

    const totalLowStockCount = lowStockCount || 0;
    const totalPages = Math.ceil(totalLowStockCount / validLimit);

    // 5. Fetch paginated low stock products
    const query = supabase
      .from('products')
      .select('*')
      .eq('shop_id', shopId)
      .lte('stock_quantity', validThreshold)
      .is('deleted_at', null)
      .order(sortColumn, { ascending: sortAscending })
      .range(offset, offset + validLimit - 1);

    const { data: products, error: fetchError } = await query;

    if (fetchError) {
      logger.error('ProductService: fetch low stock products failed', {
        shopId,
        userId,
        error: fetchError.message,
      });
      throw new AppError(INTERNAL_ERROR, 'Failed to fetch low stock products. Please try again.', 500);
    }

    logger.info('ProductService: low stock products fetched', {
      shopId,
      userId,
      threshold: validThreshold,
      page: validPage,
      limit: validLimit,
      sortBy,
      count: products?.length || 0,
      total: totalLowStockCount,
    });

    // 6. Return response with metadata
    return {
      products: (products || []).map(p => this._toResponse(p)),
      total: totalLowStockCount,
      lowStockCount: totalLowStockCount,
      page: validPage,
      pages: totalPages,
      limit: validLimit,
      threshold: validThreshold,
    };
  }
