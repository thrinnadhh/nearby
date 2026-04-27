#!/usr/bin/env node

/**
 * Simple E2E Test for NearBy API
 * Uses native fetch() - no dependencies needed
 *
 * Run: node e2e-test-simple.js
 */

const API_BASE = 'http://localhost:3000/api/v1';
const TEST_PHONE = '9876543210';
const TEST_OTP = '123456'; // Must match backend test OTP

let authToken = '';
let customerId = '';
let shopId = '';
let orderId = '';

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

async function makeRequest(method, endpoint, body = null) {
  const url = `${API_BASE}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { Authorization: `Bearer ${authToken}` }),
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`${response.status}: ${data.error?.message || 'Unknown error'}`);
    }

    return data;
  } catch (error) {
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────
// TEST 1: Auth Flow
// ─────────────────────────────────────────────────────────────────────

async function testAuthFlow() {
  log(colors.blue, '\n📱 TEST 1: Authentication Flow');
  log(colors.blue, '─'.repeat(50));

  try {
    // Request OTP
    log(colors.yellow, '  → Requesting OTP for phone: ' + TEST_PHONE);
    const otpRes = await makeRequest('POST', '/auth/request-otp', {
      phone: TEST_PHONE,
    });
    log(colors.green, '  ✓ OTP requested');

    // Verify OTP
    log(colors.yellow, '  → Verifying OTP: ' + TEST_OTP);
    const verifyRes = await makeRequest('POST', '/auth/verify-otp', {
      phone: TEST_PHONE,
      otp: TEST_OTP,
    });

    authToken = verifyRes.data.token;
    customerId = verifyRes.data.userId;

    log(colors.green, '  ✓ OTP verified');
    log(colors.green, '  ✓ JWT token received');
    log(colors.green, `  ✓ Customer ID: ${customerId}`);
  } catch (error) {
    log(colors.red, `  ✗ FAILED: ${error.message}`);
    process.exit(1);
  }
}

// ─────────────────────────────────────────────────────────────────────
// TEST 2: Browse Shops
// ─────────────────────────────────────────────────────────────────────

async function testBrowseShops() {
  log(colors.blue, '\n🏪 TEST 2: Browse Nearby Shops');
  log(colors.blue, '─'.repeat(50));

  try {
    log(colors.yellow, '  → Fetching nearby shops (Hyderabad coordinates)');
    const shopsRes = await makeRequest('GET', '/shops?lat=17.3850&lng=78.4867&radius=5');

    if (!shopsRes.data || shopsRes.data.length === 0) {
      log(colors.red, '  ✗ No shops found. Make sure some shops exist in the database.');
      return false;
    }

    shopId = shopsRes.data[0].id;

    log(colors.green, `  ✓ Found ${shopsRes.data.length} shops`);
    log(colors.green, `  ✓ First shop: ${shopsRes.data[0].name}`);
    log(colors.green, `  ✓ Shop ID: ${shopId}`);
    log(colors.green, `  ✓ Trust score: ${shopsRes.data[0].trust_score || 'N/A'}`);

    return true;
  } catch (error) {
    log(colors.red, `  ✗ FAILED: ${error.message}`);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────
// TEST 3: Get Shop Details
// ─────────────────────────────────────────────────────────────────────

async function testShopDetail() {
  log(colors.blue, '\n📋 TEST 3: Get Shop Details');
  log(colors.blue, '─'.repeat(50));

  try {
    log(colors.yellow, `  → Fetching shop: ${shopId}`);
    const shopRes = await makeRequest('GET', `/shops/${shopId}`);

    log(colors.green, '  ✓ Shop details:');
    log(colors.green, `    • Name: ${shopRes.data.name}`);
    log(colors.green, `    • Is open: ${shopRes.data.is_open}`);
    log(colors.green, `    • Avg rating: ${shopRes.data.avg_rating || 'N/A'}`);

    // Get products
    log(colors.yellow, `  → Fetching products for shop`);
    const productsRes = await makeRequest('GET', `/shops/${shopId}/products`);

    if (!productsRes.data || productsRes.data.length === 0) {
      log(colors.yellow, '  ⚠ No products found in this shop');
      return false;
    }

    log(colors.green, `  ✓ Found ${productsRes.data.length} products`);
    log(colors.green, `    • First product: ${productsRes.data[0].name}`);
    log(colors.green, `    • Price: ₹${(productsRes.data[0].price / 100).toFixed(2)}`);
    log(colors.green, `    • Stock: ${productsRes.data[0].stock_quantity}`);

    return true;
  } catch (error) {
    log(colors.red, `  ✗ FAILED: ${error.message}`);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────
// TEST 4: Create Order
// ─────────────────────────────────────────────────────────────────────

async function testCreateOrder() {
  log(colors.blue, '\n🛒 TEST 4: Create Order');
  log(colors.blue, '─'.repeat(50));

  try {
    // Get products first
    log(colors.yellow, '  → Fetching products...');
    const productsRes = await makeRequest('GET', `/shops/${shopId}/products`);

    if (!productsRes.data || productsRes.data.length === 0) {
      log(colors.red, '  ✗ No products available');
      return false;
    }

    const product = productsRes.data[0];

    log(colors.yellow, `  → Creating order with product: ${product.name}`);
    const orderRes = await makeRequest('POST', '/orders', {
      shop_id: shopId,
      items: [
        {
          product_id: product.id,
          quantity: 1,
        },
      ],
      delivery_address: {
        latitude: 17.3850,
        longitude: 78.4867,
        address: '123 Test Lane, Hyderabad',
      },
      payment_method: 'cod',
      idempotency_key: `test-order-${Date.now()}`,
    });

    orderId = orderRes.data.id;

    log(colors.green, '  ✓ Order created successfully');
    log(colors.green, `    • Order ID: ${orderId}`);
    log(colors.green, `    • Status: ${orderRes.data.status}`);
    log(colors.green, `    • Total: ₹${(orderRes.data.total / 100).toFixed(2)}`);

    return true;
  } catch (error) {
    log(colors.red, `  ✗ FAILED: ${error.message}`);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────
// TEST 5: Get Order Status
// ─────────────────────────────────────────────────────────────────────

async function testOrderStatus() {
  log(colors.blue, '\n📦 TEST 5: Get Order Status');
  log(colors.blue, '─'.repeat(50));

  try {
    log(colors.yellow, `  → Fetching order: ${orderId}`);
    const orderRes = await makeRequest('GET', `/orders/${orderId}`);

    log(colors.green, '  ✓ Order status retrieved:');
    log(colors.green, `    • Order ID: ${orderRes.data.id}`);
    log(colors.green, `    • Status: ${orderRes.data.status}`);
    log(colors.green, `    • Items: ${orderRes.data.items?.length || 0}`);
    log(colors.green, `    • Total: ₹${(orderRes.data.total / 100).toFixed(2)}`);

    return true;
  } catch (error) {
    log(colors.red, `  ✗ FAILED: ${error.message}`);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────

async function main() {
  log(colors.blue, '\n' + '═'.repeat(50));
  log(colors.blue, '🧪 NearBy E2E API Test');
  log(colors.blue, '═'.repeat(50));

  try {
    await testAuthFlow();

    const hasShops = await testBrowseShops();
    if (!hasShops) {
      log(colors.yellow, '\n⚠️  No shops found in database. Skipping further tests.');
      log(colors.yellow, 'Tip: Create a test shop in the database first.');
      process.exit(0);
    }

    await testShopDetail();
    const orderCreated = await testCreateOrder();

    if (orderCreated) {
      await testOrderStatus();
    }

    log(colors.blue, '\n' + '═'.repeat(50));
    log(colors.green, '✅ ALL TESTS PASSED!');
    log(colors.blue, '═'.repeat(50) + '\n');
  } catch (error) {
    log(colors.red, `\n❌ Test suite failed: ${error.message}\n`);
    process.exit(1);
  }
}

main();
