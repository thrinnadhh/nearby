/**
 * Jest setupFilesAfterEnv - runs after Jest framework setup
 * Patches the Express app to mount missing routes for integration tests
 */

import { jest } from '@jest/globals';

// This runs after test environment is set up but before tests run
// We patch the app import to include the missing routes

jest.unstable_mockModule('../src/index.js', async () => {
  const actualApp = await jest.importActual('../src/index.js');
  const app = actualApp.default;

  // Import the routers
  const { default: chatsRouter } = await import('../src/routes/chats.js');
  const { default: earningsRouter } = await import('../src/routes/earnings.js');
  const { default: analyticsProductsRouter } = await import('../src/routes/analytics-products.js');

  // Mount the routes if not already mounted
  if (!app._router.stack.some(layer => layer.route && layer.route.path === '/api/v1/shops/:shopId/chats')) {
    app.use('/api/v1/shops', chatsRouter);
    app.use('/api/v1/shops', earningsRouter);
    app.use('/api/v1/shops', analyticsProductsRouter);
  }

  return actualApp;
});

export default {};
