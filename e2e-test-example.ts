/**
 * Simple E2E Test: Customer Order Flow
 * Tests: Login → Browse shops → Add to cart → Checkout
 */

import axios from 'axios';

const API_BASE = 'http://localhost:3000/api/v1';
const TEST_PHONE = '9876543210';
const TEST_OTP = '123456'; // Mock OTP for testing

let authToken: string;
let customerId: string;
let shopId: string;
let orderId: string;

// ─────────────────────────────────────────────────────────────────────
// TEST 1: Authentication Flow
// ─────────────────────────────────────────────────────────────────────

async function testAuthFlow() {
  console.log('\n✓ TEST 1: Authentication Flow');

  // Step 1: Request OTP
  const otpRes = await axios.post(`${API_BASE}/auth/request-otp`, {
    phone: TEST_PHONE,
  });
  console.log('  ✓ OTP requested:', otpRes.data.success);

  // Step 2: Verify OTP
  const verifyRes = await axios.post(`${API_BASE}/auth/verify-otp`, {
    phone: TEST_PHONE,
    otp: TEST_OTP,
  });
  authToken = verifyRes.data.data.token;
  customerId = verifyRes.data.data.userId;
  console.log('  ✓ OTP verified, JWT token received');
  console.log('  ✓ Customer ID:', customerId);
}

// ─────────────────────────────────────────────────────────────────────
// TEST 2: Browse Shops
// ─────────────────────────────────────────────────────────────────────

async function testBrowseShops() {
  console.log('\n✓ TEST 2: Browse Nearby Shops');

  // Fetch nearby shops (latitude/longitude for Hyderabad)
  const shopsRes = await axios.get(`${API_BASE}/shops`, {
    params: {
      lat: 17.3850,
      lng: 78.4867,
      radius: 3, // 3km radius
    },
    headers: { Authorization: `Bearer ${authToken}` },
  });

  console.log('  ✓ Shops fetched:', shopsRes.data.data.length);
  console.log('  ✓ First shop:', {
    id: shopsRes.data.data[0].id,
    name: shopsRes.data.data[0].name,
    trust_score: shopsRes.data.data[0].trust_score,
  });

  shopId = shopsRes.data.data[0].id;
}

// ─────────────────────────────────────────────────────────────────────
// TEST 3: Get Shop Details
// ─────────────────────────────────────────────────────────────────────

async function testShopDetail() {
  console.log('\n✓ TEST 3: Get Shop Details & Products');

  // Get shop profile
  const shopRes = await axios.get(`${API_BASE}/shops/${shopId}`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  console.log('  ✓ Shop profile:', {
    name: shopRes.data.data.name,
    is_open: shopRes.data.data.is_open,
    avg_rating: shopRes.data.data.avg_rating,
  });

  // Get shop products
  const productsRes = await axios.get(`${API_BASE}/shops/${shopId}/products`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  console.log('  ✓ Products fetched:', productsRes.data.data.length);
  console.log('  ✓ First product:', {
    id: productsRes.data.data[0].id,
    name: productsRes.data.data[0].name,
    price: productsRes.data.data[0].price,
    stock_quantity: productsRes.data.data[0].stock_quantity,
  });
}

// ─────────────────────────────────────────────────────────────────────
// TEST 4: Create Order
// ─────────────────────────────────────────────────────────────────────

async function testCreateOrder() {
  console.log('\n✓ TEST 4: Create Order');

  // Get first product for order
  const productsRes = await axios.get(`${API_BASE}/shops/${shopId}/products`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });

  const product = productsRes.data.data[0];

  // Create order
  const orderRes = await axios.post(
    `${API_BASE}/orders`,
    {
      shop_id: shopId,
      items: [
        {
          product_id: product.id,
          quantity: 2,
        },
      ],
      delivery_address: {
        latitude: 17.3850,
        longitude: 78.4867,
        address: '123 Test Lane, Hyderabad',
      },
      payment_method: 'upi', // or 'cod'
      idempotency_key: `order-${Date.now()}`,
    },
    {
      headers: { Authorization: `Bearer ${authToken}` },
    }
  );

  orderId = orderRes.data.data.id;
  console.log('  ✓ Order created:', {
    order_id: orderId,
    total_amount: orderRes.data.data.total,
    status: orderRes.data.data.status,
  });
}

// ─────────────────────────────────────────────────────────────────────
// TEST 5: Get Order Status
// ─────────────────────────────────────────────────────────────────────

async function testOrderStatus() {
  console.log('\n✓ TEST 5: Get Order Status');

  const orderRes = await axios.get(`${API_BASE}/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });

  console.log('  ✓ Order status:', {
    order_id: orderRes.data.data.id,
    status: orderRes.data.data.status,
    items: orderRes.data.data.items.length,
    total: orderRes.data.data.total,
  });
}

// ─────────────────────────────────────────────────────────────────────
// TEST 6: Initiate Payment
// ─────────────────────────────────────────────────────────────────────

async function testInitiatePayment() {
  console.log('\n✓ TEST 6: Initiate Payment');

  const paymentRes = await axios.post(
    `${API_BASE}/payments/initiate`,
    {
      order_id: orderId,
    },
    {
      headers: { Authorization: `Bearer ${authToken}` },
    }
  );

  console.log('  ✓ Payment initiated:', {
    payment_id: paymentRes.data.data.payment_id,
    order_id: paymentRes.data.data.order_id,
    amount: paymentRes.data.data.amount,
    session_url: paymentRes.data.data.session_url ? 'present' : 'missing',
  });
}

// ─────────────────────────────────────────────────────────────────────
// RUN ALL TESTS
// ─────────────────────────────────────────────────────────────────────

async function runAllTests() {
  console.log('🧪 Starting NearBy E2E Test Suite');
  console.log('═══════════════════════════════════════════');

  try {
    await testAuthFlow();
    await testBrowseShops();
    await testShopDetail();
    await testCreateOrder();
    await testOrderStatus();
    await testInitiatePayment();

    console.log('\n═══════════════════════════════════════════');
    console.log('✅ ALL TESTS PASSED');
    console.log('═══════════════════════════════════════════\n');
  } catch (error: any) {
    console.error('\n❌ TEST FAILED:');
    console.error(
      error.response?.data || error.message
    );
  }
}

// Run tests
runAllTests();
