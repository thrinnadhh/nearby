// Test Runner Dashboard Script
const API_BASE = 'http://localhost:3000/api/v1/test-runner';
let scenarios = [];
let testResults = new Map();

async function init() {
  await checkHealth();
  await loadScenarios();
}

async function checkHealth() {
  try {
    const response = await fetch(`${API_BASE}/health`);
    const data = await response.json();

    // Safely update status items
    try {
      updateStatusItem('backend-status', data.data.backend.status === 'ok', 'Backend API');
    } catch (e) { console.error('Failed to update backend status:', e); }
    
    try {
      updateStatusItem('database-status', data.data.database.status === 'ok', 'Database');
    } catch (e) { console.error('Failed to update database status:', e); }
    
    try {
      updateStatusItem('redis-status', data.data.redis.status === 'ok', 'Redis');
    } catch (e) { console.error('Failed to update redis status:', e); }

    const allReady = data.data.overall === 'READY';
    try {
      updateStatusItem('overall-status', allReady, allReady ? 'Ready' : 'Check Config');
    } catch (e) { console.error('Failed to update overall status:', e); }

    if (!allReady) {
      console.warn('⚠️ System not fully ready. Missing config:');
      if (data.data.database.status !== 'ok') console.warn('  • Database:', data.data.database.message);
      if (data.data.redis.status !== 'ok') console.warn('  • Redis:', data.data.redis.message);
    }
  } catch (error) {
    console.error('Health check failed:', error);
  }
}

function updateStatusItem(id, isReady) {
  try {
    const item = document.getElementById(id);
    if (!item) {
      console.debug(`Status item not found: ${id}`);
      return;
    }
    
    const indicator = item.querySelector('.status-indicator');
    const value = item.querySelector('.status-value');

    if (indicator) {
      indicator.classList.toggle('ok', isReady);
      indicator.classList.toggle('error', !isReady);
    }
    
    if (value) {
      value.textContent = isReady ? '✅ Ready' : '❌ Check';
    }
    
    item.classList.toggle('ready', isReady);
    item.classList.toggle('error', !isReady);
  } catch (e) {
    console.debug(`Error updating status item ${id}:`, e);
  }
}

async function loadScenarios() {
  try {
    const response = await fetch(`${API_BASE}/scenarios`);
    const data = await response.json();
    scenarios = data.data;

    renderScenarios();
    updateSummary();
    document.getElementById('summary-section').style.display = 'block';
  } catch (error) {
    console.error('Failed to load scenarios:', error);
  }
}

function renderScenarios() {
  const container = document.getElementById('scenarios-container');
  container.innerHTML = '';

  const groupedByCategory = {};
  scenarios.forEach(s => {
    if (!groupedByCategory[s.category]) {
      groupedByCategory[s.category] = [];
    }
    groupedByCategory[s.category].push(s);
  });

  Object.keys(groupedByCategory).forEach(category => {
    const categoryScenarios = groupedByCategory[category];
    categoryScenarios.forEach(scenario => {
      const card = createScenarioCard(scenario);
      container.appendChild(card);
    });
  });
}

function createScenarioCard(scenario) {
  const card = document.createElement('div');
  card.className = `card ${scenario.status}`;
  card.id = `card-${scenario.id}`;

  const difficultyClass = `badge-difficulty-${scenario.difficulty.toLowerCase()}`;
  const result = scenario.result ? `
    <div class="card-result">
      <div class="result-message">✓ ${scenario.result.message}</div>
      ${scenario.result.duration ? `<div class="result-details">Duration: ${scenario.result.duration}ms</div>` : ''}
    </div>
  ` : '';

  card.innerHTML = `
    <div class="card-header">
      <div>
        <div class="card-title">${scenario.id}</div>
        <div class="card-id">${scenario.name}</div>
      </div>
      <div id="status-${scenario.id}" style="font-size: 1.5em;">
        ${scenario.status === 'pending' ? '⏳' : scenario.status === 'passed' ? '✅' : scenario.status === 'failed' ? '❌' : '⚙️'}
      </div>
    </div>
    <div class="card-meta">
      <span class="badge badge-category">${scenario.category}</span>
      <span class="badge ${difficultyClass}">${scenario.difficulty}</span>
      <span class="badge" style="background: #f3f4f6; color: #6b7280;">${scenario.estimatedTime} min</span>
    </div>
    <div class="card-description">${scenario.description}</div>
    ${result}
    <div class="card-footer">
      <button class="btn-run" data-scenario-id="${scenario.id}">Run Test</button>
      <span class="execution-time" id="time-${scenario.id}"></span>
    </div>
  `;

  return card;
}

async function runTest(scenarioId) {
  const button = document.getElementById(`btn-${scenarioId}`);
  button.disabled = true;
  button.innerHTML = '<span class="spinner"></span> Running...';

  const card = document.getElementById(`card-${scenarioId}`);
  card.classList.remove('pending', 'passed', 'failed');
  card.classList.add('running');

  try {
    const response = await fetch(`${API_BASE}/execute/${scenarioId}`, { method: 'POST' });
    const data = await response.json();

    if (data.success) {
      const result = data.data;
      testResults.set(scenarioId, result);

      card.classList.remove('running');
      card.classList.add(result.pass ? 'passed' : 'failed');
      document.getElementById(`status-${scenarioId}`).textContent = result.pass ? '✅' : '❌';
      document.getElementById(`time-${scenarioId}`).textContent = `${result.duration}ms`;

      const resultDiv = card.querySelector('.card-result') || document.createElement('div');
      resultDiv.className = 'card-result';
      resultDiv.innerHTML = `
        <div class="result-message">${result.pass ? '✓' : '✗'} ${result.message}</div>
        ${result.details ? `<div class="result-details">${JSON.stringify(result.details)}</div>` : ''}
        <div class="result-details">Duration: ${result.duration}ms</div>
      `;

      if (!card.querySelector('.card-result')) {
        card.insertBefore(resultDiv, card.querySelector('.card-footer'));
      } else {
        card.querySelector('.card-result').replaceWith(resultDiv);
      }
    }
  } catch (error) {
    console.error(`Test ${scenarioId} failed:`, error);
    card.classList.remove('running');
    card.classList.add('failed');
    document.getElementById(`status-${scenarioId}`).textContent = '❌';
  } finally {
    button.disabled = false;
    button.textContent = 'Run Test';
    updateSummary();
  }
}

async function runAllTests() {
  const btn = document.getElementById('run-all-btn');
  btn.disabled = true;

  for (const scenario of scenarios) {
    await runTest(scenario.id);
    await new Promise(r => setTimeout(r, 500)); // Delay between tests
  }

  btn.disabled = false;
  updateSummary();
}

function updateSummary() {
  const total = scenarios.length;
  const passed = scenarios.filter(s => s.status === 'passed').length;
  const failed = scenarios.filter(s => s.status === 'failed').length;
  const pending = total - passed - failed;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

  document.getElementById('passed-count').textContent = passed;
  document.getElementById('failed-count').textContent = failed;
  document.getElementById('pending-count').textContent = pending;
  document.getElementById('pass-rate').textContent = `${passRate}%`;
  document.getElementById('progress').style.width = `${passRate}%`;
}

function refreshStatus() {
  checkHealth();
  loadScenarios();
}

function clearResults() {
  testResults.clear();
  loadScenarios();
}

function exportResults() {
  const results = { timestamp: new Date().toISOString(), scenarios: scenarios.map(s => ({ ...s, result: testResults.get(s.id) || null })) };
  const json = JSON.stringify(results, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sprint15.6-results-${Date.now()}.json`;
  a.click();
}

// Initialize on load
window.addEventListener('load', init);
setInterval(refreshStatus, 30000); // Refresh status every 30 seconds

// Event delegation for dynamically added buttons
document.addEventListener('click', (e) => {
  const target = e.target.closest('button');
  if (!target) return;

  if (target.id === 'run-all-btn') {
    runAllTests();
  } else if (target.id === 'refresh-btn') {
    refreshStatus();
  } else if (target.id === 'clear-btn') {
    clearResults();
  } else if (target.id === 'export-btn') {
    exportResults();
  } else if (target.classList.contains('btn-run')) {
    const scenarioId = target.getAttribute('data-scenario-id');
    if (scenarioId) {
      runTest(scenarioId);
    }
  }
});
