import 'dotenv/config';
import { ensureTypesenseCollections } from '../services/typesense.js';
import logger from '../utils/logger.js';

try {
  const result = await ensureTypesenseCollections();

  logger.info('Typesense schema bootstrap complete', result);
  process.exit(0);
} catch (err) {
  logger.error('Typesense schema bootstrap failed', {
    error: err.message,
    stack: err.stack,
  });
  process.exit(1);
}
