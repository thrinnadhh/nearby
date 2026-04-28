const appStartTimeMs = Date.now();

const requestCounters = new Map();
const requestDurationTotals = new Map();

function escapeLabel(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/"/g, '\\"');
}

function formatLabels(labels) {
  const entries = Object.entries(labels);
  if (!entries.length) {
    return '';
  }

  return `{${entries
    .map(([key, value]) => `${key}="${escapeLabel(value)}"`)
    .join(',')}}`;
}

function incrementMetric(map, key, amount = 1) {
  map.set(key, (map.get(key) || 0) + amount);
}

function getRouteLabel(req) {
  if (req.route?.path) {
    const baseUrl = req.baseUrl || '';
    return `${baseUrl}${req.route.path}`;
  }

  return 'unmatched';
}

export function metricsMiddleware(req, res, next) {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const method = req.method;
    const route = getRouteLabel(req);
    const statusClass = `${Math.floor(res.statusCode / 100)}xx`;

    incrementMetric(requestCounters, JSON.stringify({ method, route, statusClass }));
    incrementMetric(requestDurationTotals, JSON.stringify({ method, route, unit: 'sum' }), durationMs);
    incrementMetric(requestDurationTotals, JSON.stringify({ method, route, unit: 'count' }), 1);
  });

  next();
}

function renderCounterSeries(metricName, map) {
  const lines = [];

  for (const [serializedLabels, value] of [...map.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const labels = JSON.parse(serializedLabels);
    lines.push(`${metricName}${formatLabels(labels)} ${value}`);
  }

  return lines;
}

export function renderMetrics({ environment, version }) {
  const memoryUsage = process.memoryUsage();
  const uptimeSeconds = ((Date.now() - appStartTimeMs) / 1000).toFixed(3);

  const lines = [
    '# HELP nearby_build_info Static build metadata.',
    '# TYPE nearby_build_info gauge',
    `nearby_build_info${formatLabels({ environment, version })} 1`,
    '# HELP nearby_process_uptime_seconds Process uptime in seconds.',
    '# TYPE nearby_process_uptime_seconds gauge',
    `nearby_process_uptime_seconds ${uptimeSeconds}`,
    '# HELP nearby_nodejs_heap_used_bytes Heap memory currently used.',
    '# TYPE nearby_nodejs_heap_used_bytes gauge',
    `nearby_nodejs_heap_used_bytes ${memoryUsage.heapUsed}`,
    '# HELP nearby_nodejs_heap_total_bytes Total heap allocated.',
    '# TYPE nearby_nodejs_heap_total_bytes gauge',
    `nearby_nodejs_heap_total_bytes ${memoryUsage.heapTotal}`,
    '# HELP nearby_nodejs_rss_bytes Resident set size in bytes.',
    '# TYPE nearby_nodejs_rss_bytes gauge',
    `nearby_nodejs_rss_bytes ${memoryUsage.rss}`,
    '# HELP nearby_http_requests_total Total HTTP requests by method, normalized route, and status class.',
    '# TYPE nearby_http_requests_total counter',
    ...renderCounterSeries('nearby_http_requests_total', requestCounters),
    '# HELP nearby_http_request_duration_ms_total Total HTTP request duration in milliseconds.',
    '# TYPE nearby_http_request_duration_ms_total counter',
    ...renderCounterSeries('nearby_http_request_duration_ms_total', requestDurationTotals).filter(line => line.includes('unit="sum"')),
    '# HELP nearby_http_request_duration_ms_count Total sampled HTTP requests for latency calculations.',
    '# TYPE nearby_http_request_duration_ms_count counter',
    ...renderCounterSeries('nearby_http_request_duration_ms_count', requestDurationTotals)
      .filter(line => line.includes('unit="count"'))
      .map(line => line.replace('nearby_http_request_duration_ms_total', 'nearby_http_request_duration_ms_count')),
  ];

  return `${lines.join('\n')}\n`;
}
