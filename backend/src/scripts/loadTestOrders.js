import crypto from 'node:crypto';

function parseIntegerEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}

function percentile(values, ratio) {
  if (!values.length) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * ratio));
  return sorted[index];
}

function ensureEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function printUsage() {
  console.log(`
Usage:
  LOAD_TEST_BASE_URL=http://localhost:3000 \\
  LOAD_TEST_TOKEN=eyJ... \\
  LOAD_TEST_SHOP_ID=shop-uuid \\
  LOAD_TEST_PRODUCT_ID=product-uuid \\
  npm run loadtest:orders

Optional:
  LOAD_TEST_TOKENS=token1,token2,token3
  LOAD_TEST_REQUESTS=100
  LOAD_TEST_CONCURRENCY=20
  LOAD_TEST_TIMEOUT_MS=10000
  LOAD_TEST_PRODUCT_QTY=1
  LOAD_TEST_PAYMENT_METHOD=cod
  LOAD_TEST_ENDPOINT=/api/v1/orders
`);
}

const requestCount = parseIntegerEnv('LOAD_TEST_REQUESTS', 100);
const concurrency = parseIntegerEnv('LOAD_TEST_CONCURRENCY', 20);
const timeoutMs = parseIntegerEnv('LOAD_TEST_TIMEOUT_MS', 10000);
const quantity = parseIntegerEnv('LOAD_TEST_PRODUCT_QTY', 1);

const baseUrl = process.env.LOAD_TEST_BASE_URL;
const primaryToken = process.env.LOAD_TEST_TOKEN;
const tokenList = process.env.LOAD_TEST_TOKENS
  ? process.env.LOAD_TEST_TOKENS.split(',').map(token => token.trim()).filter(Boolean)
  : [];

if (!baseUrl || (!primaryToken && !tokenList.length)) {
  printUsage();
  process.exit(1);
}

const orderEndpoint = `${baseUrl.replace(/\/$/, '')}${process.env.LOAD_TEST_ENDPOINT || '/api/v1/orders'}`;
const tokens = tokenList.length ? tokenList : [primaryToken];
const shopId = ensureEnv('LOAD_TEST_SHOP_ID');
const productId = ensureEnv('LOAD_TEST_PRODUCT_ID');
const paymentMethod = process.env.LOAD_TEST_PAYMENT_METHOD || 'cod';

let nextRequestIndex = 0;
const durations = [];
const statusCounts = new Map();
let successCount = 0;
let failureCount = 0;

async function runSingleRequest(requestIndex) {
  const startedAt = Date.now();
  const token = tokens[requestIndex % tokens.length];
  const response = await fetch(orderEndpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
      'idempotency-key': crypto.randomUUID(),
    },
    body: JSON.stringify({
      shop_id: shopId,
      payment_method: paymentMethod,
      items: [
        {
          product_id: productId,
          qty: quantity,
        },
      ],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  const durationMs = Date.now() - startedAt;
  durations.push(durationMs);
  statusCounts.set(response.status, (statusCounts.get(response.status) || 0) + 1);

  if (response.ok) {
    successCount += 1;
  } else {
    failureCount += 1;
  }

  return response;
}

async function runWorker() {
  while (nextRequestIndex < requestCount) {
    const requestIndex = nextRequestIndex;
    nextRequestIndex += 1;

    try {
      await runSingleRequest(requestIndex);
    } catch (error) {
      failureCount += 1;
      statusCounts.set('network_error', (statusCounts.get('network_error') || 0) + 1);
      durations.push(timeoutMs);
      console.error(`Request ${requestIndex + 1} failed: ${error.message}`);
    }
  }
}

async function main() {
  console.log(`Starting order load test: ${requestCount} requests, concurrency ${Math.min(concurrency, requestCount)}`);
  const startedAt = Date.now();
  await Promise.all(Array.from({ length: Math.min(concurrency, requestCount) }, () => runWorker()));
  const totalDurationMs = Date.now() - startedAt;

  const summary = {
    endpoint: orderEndpoint,
    requestCount,
    concurrency: Math.min(concurrency, requestCount),
    totalDurationMs,
    requestsPerSecond: Number((requestCount / Math.max(totalDurationMs / 1000, 1)).toFixed(2)),
    successCount,
    failureCount,
    statusCounts: Object.fromEntries(statusCounts),
    latencyMs: {
      min: durations.length ? Math.min(...durations) : 0,
      p50: percentile(durations, 0.5),
      p95: percentile(durations, 0.95),
      p99: percentile(durations, 0.99),
      max: durations.length ? Math.max(...durations) : 0,
    },
  };

  console.log(JSON.stringify(summary, null, 2));

  if (failureCount > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
