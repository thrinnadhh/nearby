/**
 * Setup file to mount missing routes for integration tests
 * This allows tests to run while routes are being integrated into index.js
 */

import chatsRouter from '../routes/chats.js';
import earningsRouter from '../routes/earnings.js';
import analyticsProductsRouter from '../routes/analytics-products.js';

export function mountMissingRoutes(app) {
  // Mount shop analytics, chats, and earnings routes
  app.use('/api/v1/shops', chatsRouter);
  app.use('/api/v1/shops', earningsRouter);
  app.use('/api/v1/shops', analyticsProductsRouter);
  
  return app;
}

export default mountMissingRoutes;
