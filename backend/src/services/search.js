import logger from '../utils/logger.js';
import { AppError, INTERNAL_ERROR } from '../utils/errors.js';
import { typesense } from './typesense.js';

const SHOPS_COLLECTION = 'shops';
const PRODUCTS_COLLECTION = 'products';

class SearchService {
  static _buildShopFilter({ lat, lng, radius_km, category, open_only }) {
    const clauses = [`geo_location:(${lat}, ${lng}, ${radius_km}km)`];

    if (category) {
      clauses.push(`category:=${category}`);
    }

    if (open_only) {
      clauses.push('is_open:=true');
    }

    return clauses.join(' && ');
  }

  static _mapShopHit(hit) {
    const document = hit.document || {};
    const distanceMeters = hit.geo_distance_meters?.geo_location
      ?? hit.geo_distance_meters?.location
      ?? null;

    return Object.freeze({
      id: document.id,
      name: document.name,
      category: document.category,
      description: document.description || '',
      latitude: document.latitude ?? null,
      longitude: document.longitude ?? null,
      isOpen: document.is_open ?? false,
      isVerified: document.is_verified ?? false,
      trustScore: document.trust_score ?? null,
      distanceMeters,
    });
  }

  static async searchShops(query) {
    const {
      lat,
      lng,
      radius_km,
      category,
      open_only,
      page,
      limit,
    } = query;

    const searchParameters = {
      q: '*',
      query_by: 'name,category,description',
      filter_by: this._buildShopFilter({ lat, lng, radius_km, category, open_only }),
      sort_by: `_geo_point(${lat}, ${lng}):asc,trust_score:desc`,
      page,
      per_page: limit,
    };

    logger.info('SearchService.searchShops called', {
      lat,
      lng,
      radiusKm: radius_km,
      category: category || null,
      openOnly: open_only,
      page,
      limit,
    });

    try {
      const result = await typesense
        .collections(SHOPS_COLLECTION)
        .documents()
        .search(searchParameters);

      return {
        data: (result.hits || []).map((hit) => this._mapShopHit(hit)),
        meta: {
          found: result.found ?? 0,
          page: result.page ?? page,
          limit,
        },
      };
    } catch (err) {
      logger.error('SearchService.searchShops failed', {
        error: err.message,
        lat,
        lng,
        radiusKm: radius_km,
      });
      throw new AppError(
        INTERNAL_ERROR,
        'Failed to search shops. Please try again.',
        500
      );
    }
  }

  static _buildProductFilter({ category, shop_id }) {
    const clauses = ['is_available:=true'];

    if (category) {
      clauses.push(`category:=${category}`);
    }

    if (shop_id) {
      clauses.push(`shop_id:=${shop_id}`);
    }

    return clauses.join(' && ');
  }

  static _mapProductHit(hit) {
    const document = hit.document || {};

    return Object.freeze({
      id: document.id,
      shopId: document.shop_id,
      name: document.name,
      description: document.description || '',
      category: document.category,
      price: document.price ?? null,
      stockQuantity: document.stock_quantity ?? null,
      unit: document.unit ?? null,
      isAvailable: document.is_available ?? false,
      imageUrl: document.image_url || null,
      thumbnailUrl: document.thumbnail_url || null,
    });
  }

  static async searchProducts(query) {
    const {
      q,
      category,
      shop_id,
      page,
      limit,
    } = query;

    const searchParameters = {
      q,
      query_by: 'name,description,category',
      filter_by: this._buildProductFilter({ category, shop_id }),
      sort_by: '_text_match:desc',
      typo_tokens_threshold: 1,
      prefix: true,
      page,
      per_page: limit,
    };

    logger.info('SearchService.searchProducts called', {
      q,
      category: category || null,
      shopId: shop_id || null,
      page,
      limit,
    });

    try {
      const result = await typesense
        .collections(PRODUCTS_COLLECTION)
        .documents()
        .search(searchParameters);

      return {
        data: (result.hits || []).map((hit) => this._mapProductHit(hit)),
        meta: {
          found: result.found ?? 0,
          page: result.page ?? page,
          limit,
        },
      };
    } catch (err) {
      logger.error('SearchService.searchProducts failed', {
        error: err.message,
        q,
        category: category || null,
        shopId: shop_id || null,
      });
      throw new AppError(
        INTERNAL_ERROR,
        'Failed to search products. Please try again.',
        500
      );
    }
  }
}

export default SearchService;
