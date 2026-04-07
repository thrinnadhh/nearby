import Typesense from 'typesense';
import logger from '../utils/logger.js';

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

export { client as typesense };
