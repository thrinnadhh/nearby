#!/usr/bin/env node

import crypto from 'node:crypto';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(color, message, details) {
  if (details !== undefined) {
    console.log(color, message, details, colors.reset);
    return;
  }

  console.log(color, message, colors.reset);
}

function usage() {
  console.log(`
NearBy E2E Critical Flow

Required:
  E2E_CUSTOMER_TOKEN=jwt

Optional:
  E2E_BASE_URL=http://localhost:3000
  E2E_CUSTOMER_LAT=17.3850
  E2E_CUSTOMER_LNG=78.4867
  E2E_RADIUS_KM=5
  E2E_SHOP_ID=shop_uuid
  E2E_PRODUCT_ID=product_uuid
  E2E_PRODUCT_QUERY=milk
  E2E_PRODUCT_QTY=1
  E2E_PAYMENT_METHOD=cod
  E2E_SHOP_TOKEN=jwt
  E2E_ADMIN_TOKEN=jwt

Run:
  cd /Users/trinadh/projects/nearby/backend
  E2E_CUSTOMER_TOKEN=... npm run test:e2e:critical
`);
}

if (process.argv.includes('--help')) {
  usage();
  process.exit(0);
}

const requiredCustomerToken = process.env.E2E_CUSTOMER_TOKEN;
if (!requiredCustomerToken) {
  usage();
  process.exit(1);
}

const BASE_URL = (process.env.E2E_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const API_BASE = `${BASE_URL}/api/v1`;
const CUSTOMER_TOKEN = process.env.E2E_CUSTOMER_TOKEN;
const SHOP_TOKEN = process.env.E2E_SHOP_TOKEN || null;
const ADMIN_TOKEN = process.env.E2E_ADMIN_TOKEN || null;
const LAT = process.env.E2E_CUSTOMER_LAT || '17.3850';
const LNG = process.env.E2E_CUSTOMER_LNG || '78.4867';
const RADIUS_KM = process.env.E2E_RADIUS_KM || '5';
const PAYMENT_METHOD = process.env.E2E_PAYMENT_METHOD || 'cod';
const PRODUCT_QTY = Number.parseInt(process.env.E2E_PRODUCT_QTY || '1', 10);
const PRODUCT_QUERY = process.env.E2E_PRODUCT_QUERY || '*';
const PRESELECTED_SHOP_ID = process.env.E2E_SHOP_ID || null;
const PRESELECTED_PRODUCT_ID = process.env.E2E_PRODUCT_ID || null;

function step(name) {
  log(colors.blue, `\n${name}`);
  log(colors.blue, '─'.repeat(name.length));
}

function ensureOk(response, payload, context) {
  if (!response.ok) {
    const error = new Error(`${context} failed with ${response.status}`);
    error.payload = payload;
    throw error;
  }
}

async function requestJson(method, url, { token, body, headers = {} } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let payload = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }

  return { response, payload };
}

async function checkSystemEndpoints() {
  step('1. System Health');

  for (const path of ['/health', '/readiness', '/metrics']) {
    const response = await fetch(`${BASE_URL}${path}`);
    const text = await response.text();

    if (!response.ok) {
      throw new Error(`GET ${path} failed with ${response.status}`);
    }

    log(colors.green, `✓ ${path} ok`);
    if (path === '/metrics' && !text.includes('nearby_http_requests_total')) {
      throw new Error('/metrics response did not expose expected counters');
    }
  }
}

async function findShop() {
  if (PRESELECTED_SHOP_ID) {
    log(colors.yellow, `Using shop from env: ${PRESELECTED_SHOP_ID}`);
    return PRESELECTED_SHOP_ID;
  }

  step('2. Search Shops');
  const url = `${API_BASE}/search/shops?lat=${encodeURIComponent(LAT)}&lng=${encodeURIComponent(LNG)}&radius_km=${encodeURIComponent(RADIUS_KM)}&page=1&limit=10&open_only=true`;
  const { response, payload } = await requestJson('GET', url);

  ensureOk(response, payload, 'Search shops');

  const shops = payload?.data || [];
  if (!shops.length) {
    throw new Error('No shops found. Set E2E_SHOP_ID or seed a searchable shop first.');
  }

  const shop = shops[0];
  log(colors.green, `✓ Found shop ${shop.name} (${shop.id})`);
  return shop.id;
}

async function findProduct(shopId) {
  if (PRESELECTED_PRODUCT_ID) {
    log(colors.yellow, `Using product from env: ${PRESELECTED_PRODUCT_ID}`);
    return PRESELECTED_PRODUCT_ID;
  }

  step('3. Search Products');
  const url = `${API_BASE}/search/products?q=${encodeURIComponent(PRODUCT_QUERY)}&shop_id=${encodeURIComponent(shopId)}&page=1&limit=10`;
  const { response, payload } = await requestJson('GET', url);

  ensureOk(response, payload, 'Search products');

  const products = payload?.data || [];
  if (!products.length) {
    throw new Error('No products found for the selected shop. Set E2E_PRODUCT_ID or seed a searchable product first.');
  }

  const product = products[0];
  log(colors.green, `✓ Found product ${product.name} (${product.id})`);
  return product.id;
}

async function createOrder(shopId, productId) {
  step('4. Create Order');

  const idempotencyKey = crypto.randomUUID();
  const { response, payload } = await requestJson('POST', `${API_BASE}/orders`, {
    token: CUSTOMER_TOKEN,
    headers: {
      'idempotency-key': idempotencyKey,
    },
    body: {
      shop_id: shopId,
      payment_method: PAYMENT_METHOD,
      items: [
        {
          product_id: productId,
          qty: PRODUCT_QTY,
        },
      ],
    },
  });

  ensureOk(response, payload, 'Create order');

  const order = payload?.data;
  if (!order?.id) {
    throw new Error('Order creation succeeded but no order id was returned.');
  }

  log(colors.green, `✓ Order created ${order.id}`);
  log(colors.cyan, `Status: ${order.status} | Payment: ${order.paymentStatus || order.payment_status || PAYMENT_METHOD}`);
  return order.id;
}

async function getCustomerOrder(orderId) {
  step('5. Customer Order Detail');

  const { response, payload } = await requestJson('GET', `${API_BASE}/orders/${orderId}`, {
    token: CUSTOMER_TOKEN,
  });

  ensureOk(response, payload, 'Get customer order');
  const order = payload?.data;
  log(colors.green, `✓ Customer can read order ${order.id}`);
  return order;
}

async function maybeInitiatePayment(orderId) {
  if (PAYMENT_METHOD === 'cod') {
    log(colors.yellow, 'Skipping payment initiation for COD order');
    return null;
  }

  step('6. Initiate Payment');
  const { response, payload } = await requestJson('POST', `${API_BASE}/payments/initiate`, {
    token: CUSTOMER_TOKEN,
    body: {
      order_id: orderId,
    },
  });

  ensureOk(response, payload, 'Initiate payment');
  log(colors.green, `✓ Payment initiation ok for order ${orderId}`);
  return payload?.data || null;
}

async function maybeShopFlow(orderId) {
  if (!SHOP_TOKEN) {
    log(colors.yellow, 'Skipping shop-owner flow (set E2E_SHOP_TOKEN to enable accept/ready checks)');
    return null;
  }

  step('7. Shop Owner Flow');

  const listResult = await requestJson('GET', `${API_BASE}/orders`, {
    token: SHOP_TOKEN,
  });
  ensureOk(listResult.response, listResult.payload, 'Shop list orders');

  const shopOrders = listResult.payload?.data || [];
  const matched = shopOrders.find((order) => order.id === orderId);
  if (!matched) {
    throw new Error(`Shop token could not see order ${orderId}. Check shop ownership.`);
  }
  log(colors.green, `✓ Shop can see order ${orderId}`);

  const acceptResult = await requestJson('PATCH', `${API_BASE}/orders/${orderId}/accept`, {
    token: SHOP_TOKEN,
  });
  ensureOk(acceptResult.response, acceptResult.payload, 'Shop accept order');
  log(colors.green, `✓ Shop accepted order ${orderId}`);

  const readyResult = await requestJson('PATCH', `${API_BASE}/orders/${orderId}/ready`, {
    token: SHOP_TOKEN,
  });
  ensureOk(readyResult.response, readyResult.payload, 'Shop mark ready');
  log(colors.green, `✓ Shop marked order ready ${orderId}`);

  return readyResult.payload?.data || null;
}

async function maybeAdminFlow(orderId) {
  if (!ADMIN_TOKEN) {
    log(colors.yellow, 'Skipping admin flow (set E2E_ADMIN_TOKEN to enable live-order checks)');
    return null;
  }

  step('8. Admin Flow');

  const liveResult = await requestJson('GET', `${API_BASE}/admin/orders/live?limit=50`, {
    token: ADMIN_TOKEN,
  });
  ensureOk(liveResult.response, liveResult.payload, 'Admin live orders');

  const liveOrders = liveResult.payload?.data?.orders || [];
  const matched = liveOrders.find((order) => order.id === orderId);
  if (matched) {
    log(colors.green, `✓ Admin live monitor sees order ${orderId}`);
  } else {
    log(colors.yellow, `Order ${orderId} not currently in the 5-minute live window; skipping live-order assertion`);
  }

  return matched || null;
}

async function main() {
  log(colors.blue, '══════════════════════════════════════════════');
  log(colors.blue, 'NearBy E2E Critical Flow');
  log(colors.blue, '══════════════════════════════════════════════');

  const shopId = await findShop();
  const productId = await findProduct(shopId);

  await checkSystemEndpoints();
  const orderId = await createOrder(shopId, productId);
  await getCustomerOrder(orderId);
  await maybeInitiatePayment(orderId);
  await maybeShopFlow(orderId);
  await maybeAdminFlow(orderId);

  log(colors.green, '\n✅ E2E critical flow completed');
  log(colors.cyan, `Order exercised: ${orderId}`);
}

main().catch((error) => {
  log(colors.red, `\n❌ ${error.message}`);
  if (error.payload) {
    console.error(error.payload);
  }
  process.exit(1);
});
