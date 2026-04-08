import Typesense from 'typesense';
import logger from '../utils/logger.js';
import {
  getMissingCollectionSchemas,
  TYPESENSE_COLLECTION_SCHEMAS,
} from './typesenseSchema.js';

const TYPESENSE_HOST = process.env.TYPESENSE_HOST || 'localhost';
const TYPESENSE_PORT = process.env.TYPESENSE_PORT || '8108';
const TYPESENSE_PROTOCOL = process.env.TYPESENSE_PROTOCOL || 'http';
const TYPESENSE_API_KEY = process.env.TYPESENSE_API_KEY;

if (!TYPESENSE_API_KEY) {
  throw new Error('TYPESENSE_API_KEY is not configured');
}

const client = new Typesense.Client({
  nodes: [{
    host: TYPESENSE_HOST,
    port: TYPESENSE_PORT,
    protocol: TYPESENSE_PROTOCOL,
  }],
  apiKey: TYPESENSE_API_KEY,
  connectionTimeoutSeconds: 2,
});

logger.info('Typesense client initialized', {
  host: TYPESENSE_HOST,
  port: TYPESENSE_PORT,
  protocol: TYPESENSE_PROTOCOL,
});

async function ensureTypesenseCollections() {
  const existingCollections = await client.collections().retrieve();
  const missingSchemas = getMissingCollectionSchemas(existingCollections);

  for (const schema of missingSchemas) {
    await client.collections().create(schema);
    logger.info('Typesense collection created', {
      collection: schema.name,
      fields: schema.fields.length,
    });
  }

  if (missingSchemas.length === 0) {
    logger.info('Typesense collections already present', {
      collections: TYPESENSE_COLLECTION_SCHEMAS.map((schema) => schema.name),
    });
  }

  return {
    created: missingSchemas.map((schema) => schema.name),
    existing: existingCollections.map((collection) => collection.name),
  };
}

export { client as typesense, ensureTypesenseCollections };
