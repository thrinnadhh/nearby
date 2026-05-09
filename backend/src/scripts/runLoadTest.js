/**
 * Sprint 15.4 — Automated Load Test Runner
 * 
 * Fully self-contained: registers a test customer, fetches a real shop + product
 * from Supabase, then fires 100 concurrent order requests at the API.
 *
 * Usage:  node src/scripts/runLoadTest.js
 */

import 'dotenv/config';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const BASE_URL       = process.env.LOAD_TEST_BASE_URL || 'http://localhost:3000';
const REQUESTS       = parseInt(process.env.LOAD_TEST_REQUESTS   || '100', 10);
const CONCURRENCY    = parseInt(process.env.LOAD_TEST_CONCURRENCY || '20',  10);
const TIMEOUT_MS     = parseInt(process.env.LOAD_TEST_TIMEOUT_MS  || '10000', 10);
const TEST_PHONE     = process.env.LOAD_TEST_PHONE || '9000000001';  // fake test number
const DEV_OTP        = '123456'; // always works in development mode

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

async function apiPost(path, body, token) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}: ${JSON.stringify(json)}`);
  return json.data;
}

async function apiGet(path, token) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}: ${JSON.stringify(json)}`);
  return json.data;
}

function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

// ──────────────────────────────────────────────────────────────────────────────
// Step 1: Get a customer JWT via OTP flow (dev mode OTP = 123456)
// ──────────────────────────────────────────────────────────────────────────────

async function getToken() {
  console.log(`\n[1/3] Authenticating test customer (+91${TEST_PHONE})...`);
  await apiPost('/api/v1/auth/send-otp', { phone: TEST_PHONE });
  const auth = await apiPost('/api/v1/auth/verify-otp', { phone: TEST_PHONE, otp: DEV_OTP });
  console.log(`      ✅ Token obtained for userId=${auth.userId}`);
  return { token: auth.token, userId: auth.userId };
}

// ──────────────────────────────────────────────────────────────────────────────
// Step 2: Find an open, verified shop + one of its products via Supabase
// ──────────────────────────────────────────────────────────────────────────────

async function getShopAndProduct() {
  console.log('\n[2/3] Finding test shop + product from database...');

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Find first open, verified shop
  const { data: shops, error: shopErr } = await supabase
    .from('shops')
    .select('id, name')
    .eq('is_open', true)
    .eq('is_verified', true)
    .limit(1);

  if (shopErr) throw new Error(`Supabase shop query failed: ${shopErr.message}`);

  if (!shops || shops.length === 0) {
    // Try any shop (not necessarily open/verified) as fallback
    const { data: anyShops, error: anyErr } = await supabase
      .from('shops')
      .select('id, name')
      .limit(1);
    if (anyErr || !anyShops?.length) {
      throw new Error('No shops found in database. Please seed the database first.');
    }
    console.log(`      ⚠️  No open+verified shops. Using first available: ${anyShops[0].name}`);
    shops.push(...anyShops);
  }

  const shop = shops[0];
  console.log(`      Shop: ${shop.name} (${shop.id})`);

  // Find a product in this shop with stock > 0
  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id, name, price, stock_quantity')
    .eq('shop_id', shop.id)
    .gt('stock_quantity', 5)
    .is('deleted_at', null)
    .limit(1);

  if (prodErr) throw new Error(`Supabase product query failed: ${prodErr.message}`);

  if (!products || products.length === 0) {
    // Fallback: any product in any shop
    const { data: anyProds, error: anyProdErr } = await supabase
      .from('products')
      .select('id, name, price, stock_quantity, shop_id')
      .gt('stock_quantity', 0)
      .is('deleted_at', null)
      .limit(1);

    if (anyProdErr || !anyProds?.length) {
      throw new Error('No products with stock found. Please seed the database first.');
    }

    console.log(`      ⚠️  No products found in shop. Using first available: ${anyProds[0].name} (stock=${anyProds[0].stock_quantity})`);
    return { shopId: anyProds[0].shop_id, productId: anyProds[0].id, productName: anyProds[0].name };
  }

  const product = products[0];
  console.log(`      Product: ${product.name} (${product.id}, stock=${product.stock_quantity}, ₹${(product.price / 100).toFixed(2)})`);
  return { shopId: shop.id, productId: product.id, productName: product.name };
}

// ──────────────────────────────────────────────────────────────────────────────
// Step 3: Run the load test
// ──────────────────────────────────────────────────────────────────────────────

async function runLoadTest(token, shopId, productId) {
  console.log(`\n[3/3] Running load test: ${REQUESTS} requests @ concurrency=${CONCURRENCY}...`);
  console.log(`      Endpoint: POST ${BASE_URL}/api/v1/orders`);

  const durations = [];
  const statusCounts = new Map();
  let successCount = 0;
  let failureCount = 0;
  let nextIndex = 0;

  async function runOne() {
    const start = Date.now();
    try {
      const res = await fetch(`${BASE_URL}/api/v1/orders`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
          'idempotency-key': crypto.randomUUID(),
        },
        body: JSON.stringify({
          shop_id: shopId,
          payment_method: 'cod',
          items: [{ product_id: productId, qty: 1 }],
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      const ms = Date.now() - start;
      durations.push(ms);
      statusCounts.set(res.status, (statusCounts.get(res.status) || 0) + 1);

      if (res.ok) {
        successCount++;
      } else {
        failureCount++;
        // Print first few failure bodies for diagnosis
        if (failureCount <= 3) {
          const body = await res.json().catch(() => ({}));
          console.log(`      ❌ ${res.status}: ${JSON.stringify(body?.error || body)}`);
        }
      }
    } catch (err) {
      const ms = Date.now() - start;
      durations.push(ms);
      failureCount++;
      statusCounts.set('network_error', (statusCounts.get('network_error') || 0) + 1);
      if (failureCount <= 3) console.error(`      ❌ Network: ${err.message}`);
    }
  }

  async function worker() {
    while (nextIndex < REQUESTS) {
      nextIndex++;
      await runOne();
    }
  }

  const wallStart = Date.now();
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, REQUESTS) }, () => worker()));
  const wallMs = Date.now() - wallStart;

  return {
    requests: REQUESTS,
    concurrency: Math.min(CONCURRENCY, REQUESTS),
    wallTimeMs: wallMs,
    rps: +(REQUESTS / Math.max(wallMs / 1000, 1)).toFixed(2),
    successCount,
    failureCount,
    successRate: `${((successCount / REQUESTS) * 100).toFixed(1)}%`,
    statusCodes: Object.fromEntries(statusCounts),
    latencyMs: {
      min:  durations.length ? Math.min(...durations) : 0,
      p50:  percentile(durations, 0.50),
      p95:  percentile(durations, 0.95),
      p99:  percentile(durations, 0.99),
      max:  durations.length ? Math.max(...durations) : 0,
      avg:  durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
    },
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Sprint 15.4 — Load Test: 100 Concurrent Orders   ');
  console.log('═══════════════════════════════════════════════════');

  try {
    const { token } = await getToken();
    const { shopId, productId, productName } = await getShopAndProduct();
    const results = await runLoadTest(token, shopId, productId);

    console.log('\n══════════════════════ RESULTS ══════════════════════');
    console.log(`  Total Requests   : ${results.requests}`);
    console.log(`  Concurrency      : ${results.concurrency}`);
    console.log(`  Wall Time        : ${results.wallTimeMs}ms`);
    console.log(`  Throughput (RPS) : ${results.rps}`);
    console.log(`  ✅ Successes     : ${results.successCount}`);
    console.log(`  ❌ Failures      : ${results.failureCount}`);
    console.log(`  Success Rate     : ${results.successRate}`);
    console.log(`  Status Codes     : ${JSON.stringify(results.statusCodes)}`);
    console.log(`\n  Latency (ms):`);
    console.log(`    min  : ${results.latencyMs.min}`);
    console.log(`    avg  : ${results.latencyMs.avg}`);
    console.log(`    p50  : ${results.latencyMs.p50}`);
    console.log(`    p95  : ${results.latencyMs.p95}`);
    console.log(`    p99  : ${results.latencyMs.p99}`);
    console.log(`    max  : ${results.latencyMs.max}`);
    console.log('═════════════════════════════════════════════════════');

    // Pass/fail verdict
    // Note: 429 rate-limit responses are EXPECTED (system is working correctly)
    // We count them separately from true failures (network errors, 5xx)
    const trueFailures = (results.statusCodes['network_error'] || 0) +
      Object.entries(results.statusCodes)
        .filter(([code]) => parseInt(code) >= 500)
        .reduce((sum, [, count]) => sum + count, 0);

    const rateLimited  = results.statusCodes[429] || 0;
    const p95Target    = 3000; // ms — realistic for local dev with all services running

    const passed = trueFailures === 0 && results.latencyMs.p95 <= p95Target;

    if (passed) {
      console.log('\n  🎉 SPRINT 15.4 LOAD TEST: PASSED');
      if (rateLimited > 0) {
        console.log(`     ℹ️  ${rateLimited} requests rate-limited (429) — this is correct behaviour`);
      }
    } else {
      console.log('\n  ⚠️  SPRINT 15.4 LOAD TEST: NEEDS REVIEW');
      if (trueFailures > 0) {
        console.log(`     → ${trueFailures} true failures (5xx / network errors)`);
      }
      if (results.latencyMs.p95 > p95Target) {
        console.log(`     → p95 ${results.latencyMs.p95}ms exceeds ${p95Target}ms target`);
      }
    }
    console.log('');

    process.exit(passed ? 0 : 1);
  } catch (err) {
    console.error('\n❌ Load test failed:', err.message);
    process.exit(1);
  }
}

main();
