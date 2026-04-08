import {
  getMissingCollectionSchemas,
  PRODUCTS_COLLECTION_SCHEMA,
  SHOPS_COLLECTION_SCHEMA,
  TYPESENSE_COLLECTION_SCHEMAS,
} from '../../services/typesenseSchema.js';

describe('Typesense schema definitions', () => {
  it('defines both shop and product collection schemas', () => {
    expect(TYPESENSE_COLLECTION_SCHEMAS).toHaveLength(2);
    expect(TYPESENSE_COLLECTION_SCHEMAS.map((schema) => schema.name)).toEqual([
      'shops',
      'products',
    ]);
  });

  it('includes geo and trust fields on the shops schema', () => {
    expect(SHOPS_COLLECTION_SCHEMA.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'geo_location', type: 'geopoint' }),
        expect.objectContaining({ name: 'trust_score', type: 'float' }),
        expect.objectContaining({ name: 'is_open', type: 'bool' }),
      ])
    );
  });

  it('includes search and availability fields on the products schema', () => {
    expect(PRODUCTS_COLLECTION_SCHEMA.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'name', type: 'string' }),
        expect.objectContaining({ name: 'category', type: 'string', facet: true }),
        expect.objectContaining({ name: 'is_available', type: 'bool' }),
      ])
    );
  });

  it('returns missing schemas when some collections do not exist yet', () => {
    const missing = getMissingCollectionSchemas([{ name: 'shops' }]);

    expect(missing).toHaveLength(1);
    expect(missing[0].name).toBe('products');
  });

  it('returns no missing schemas when all collections exist', () => {
    const missing = getMissingCollectionSchemas([
      { name: 'shops' },
      { name: 'products' },
    ]);

    expect(missing).toEqual([]);
  });
});
