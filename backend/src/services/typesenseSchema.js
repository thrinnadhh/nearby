export const TYPESENSE_SHOPS_COLLECTION = 'shops';
export const TYPESENSE_PRODUCTS_COLLECTION = 'products';

export const SHOPS_COLLECTION_SCHEMA = Object.freeze({
  name: TYPESENSE_SHOPS_COLLECTION,
  enable_nested_fields: false,
  default_sorting_field: 'trust_score',
  fields: [
    { name: 'id', type: 'string' },
    { name: 'owner_id', type: 'string', optional: true },
    { name: 'name', type: 'string' },
    { name: 'category', type: 'string', facet: true },
    { name: 'description', type: 'string', optional: true },
    { name: 'latitude', type: 'float', optional: true },
    { name: 'longitude', type: 'float', optional: true },
    { name: 'geo_location', type: 'geopoint', optional: true },
    { name: 'is_open', type: 'bool', facet: true },
    { name: 'is_verified', type: 'bool', facet: true },
    { name: 'trust_score', type: 'float' },
    { name: 'created_at', type: 'int64' },
    { name: 'updated_at', type: 'int64' },
  ],
});

export const PRODUCTS_COLLECTION_SCHEMA = Object.freeze({
  name: TYPESENSE_PRODUCTS_COLLECTION,
  enable_nested_fields: false,
  default_sorting_field: 'created_at',
  fields: [
    { name: 'id', type: 'string' },
    { name: 'shop_id', type: 'string', facet: true },
    { name: 'name', type: 'string' },
    { name: 'description', type: 'string', optional: true },
    { name: 'category', type: 'string', facet: true },
    { name: 'price', type: 'int64' },
    { name: 'stock_quantity', type: 'int32' },
    { name: 'unit', type: 'string', facet: true },
    { name: 'is_available', type: 'bool', facet: true },
    { name: 'image_url', type: 'string', optional: true },
    { name: 'thumbnail_url', type: 'string', optional: true },
    { name: 'created_at', type: 'int64' },
    { name: 'updated_at', type: 'int64' },
  ],
});

export const TYPESENSE_COLLECTION_SCHEMAS = Object.freeze([
  SHOPS_COLLECTION_SCHEMA,
  PRODUCTS_COLLECTION_SCHEMA,
]);

export function getMissingCollectionSchemas(existingCollections = []) {
  const existingNames = new Set(existingCollections.map((collection) => collection.name));

  return TYPESENSE_COLLECTION_SCHEMAS.filter(
    (schema) => !existingNames.has(schema.name)
  );
}
