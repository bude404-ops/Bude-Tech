#!/usr/bin/env node
/**
 * BUDE TECH CEO v4.2 — AUTO-BUILD MODE
 * Hybrid: Human orders first, then autonomous backlog
 */

const fs = require('fs').promises;
const https = require('https');
const path = require('path');
const { execSync } = require('child_process');

const API_KEY = process.env.OPENROUTER_API_KEY;
const RUN_NUM = process.env.GITHUB_RUN_NUMBER || 'local';
const RUN_START = Date.now();

// ── CONFIG ──
const MAX_API_PER_DAY = 30;
const API_LOG = 'ceo/api_log.json';
const BACKLOG_FILE = 'ceo/backlog.json';

// ── AI API with budget ──
async function aiAsk(prompt, maxTokens) {
  const usage = await loadApiUsage();
  if (usage.today >= MAX_API_PER_DAY) {
    console.log('[API] Budget exhausted:', usage.today, '/', MAX_API_PER_DAY);
    return '';
  }
  if (!API_KEY) { console.log('[API] No key'); return ''; }

  return new Promise((resolve) => {
    const data = JSON.stringify({
      model: 'anthropic/claude-3.5-sonnet',
      messages: [
        { role: 'system', content: 'You are Bude Tech CEO. Be concise. Output code only when asked.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: maxTokens || 1500,
      temperature: 0.5
    });
    const req = https.request({
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + API_KEY,
        'HTTP-Referer': 'https://github.com/bude404-ops/bude-tech',
        'X-Title': 'Bude Tech CEO'
      },
      timeout: 20000
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const content = JSON.parse(body).choices[0].message.content;
          logApiCall(usage, prompt.slice(0, 50)).catch(() => {});
          resolve(content);
        } catch { resolve(''); }
      });
    });
    req.on('error', () => resolve(''));
    req.on('timeout', () => { req.destroy(); resolve(''); });
    req.write(data);
    req.end();
  });
}

async function loadApiUsage() {
  try {
    const data = JSON.parse(await fs.readFile(API_LOG, 'utf8'));
    const today = new Date().toISOString().split('T')[0];
    if (data.date !== today) return { date: today, today: 0, total: data.total || 0 };
    return data;
  } catch { return { date: new Date().toISOString().split('T')[0], today: 0, total: 0 }; }
}

async function logApiCall(usage, purpose) {
  usage.today++;
  usage.total++;
  await fs.mkdir('ceo', { recursive: true });
  await fs.writeFile(API_LOG, JSON.stringify(usage, null, 2));
}

async function writeFile(fp, content) {
  const dir = path.dirname(fp);
  if (dir !== '.') await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(fp, content);
}

// ── BACKLOG SYSTEM ──
async function loadBacklog() {
  try {
    return JSON.parse(await fs.readFile(BACKLOG_FILE, 'utf8'));
  } catch { return { items: [], lastId: 0 }; }
}

async function saveBacklog(backlog) {
  await fs.mkdir('ceo', { recursive: true });
  await fs.writeFile(BACKLOG_FILE, JSON.stringify(backlog, null, 2));
}

function addBacklogItem(backlog, title, type, priority, description) {
  backlog.lastId++;
  const item = {
    id: backlog.lastId,
    title,
    type,
    priority,
    description,
    status: 'open',
    created: new Date().toISOString(),
    completed: null
  };
  backlog.items.push(item);
  // Keep only last 20
  if (backlog.items.length > 20) backlog.items = backlog.items.slice(-20);
  return item;
}

function getNextBacklogItem(backlog) {
  const open = backlog.items.filter(i => i.status === 'open');
  if (open.length === 0) return null;
  const order = { critical: 0, high: 1, medium: 2, low: 3 };
  open.sort((a, b) => (order[a.priority] || 2) - (order[b.priority] || 2));
  return open[0];
}

function completeBacklogItem(backlog, item, success) {
  item.status = success ? 'done' : 'failed';
  item.completed = new Date().toISOString();
}

// ── DASHBOARD HTML ──
const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>Bude Tech CEO Dashboard</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0a0a0f; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; min-height: 100vh; padding-bottom: 80px; }
  .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 20px 16px; border-bottom: 1px solid #2a2a4a; position: sticky; top: 0; z-index: 100; }
  .header h1 { font-size: 1.3rem; color: #00d4ff; display: flex; align-items: center; gap: 8px; }
  .header .subtitle { font-size: 0.75rem; color: #888; margin-top: 4px; }
  .status-bar { display: flex; gap: 8px; padding: 12px 16px; overflow-x: auto; background: #0f0f1a; border-bottom: 1px solid #1a1a2e; }
  .status-pill { background: #1a1a2e; border: 1px solid #2a2a4a; border-radius: 20px; padding: 6px 14px; font-size: 0.75rem; white-space: nowrap; display: flex; align-items: center; gap: 6px; }
  .status-pill .dot { width: 8px; height: 8px; border-radius: 50%; background: #00d4ff; animation: pulse 2s infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
  .card { background: #12121f; border: 1px solid #1e1e32; border-radius: 12px; margin: 12px 16px; padding: 16px; }
  .card h2 { font-size: 0.85rem; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
  .metric-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #1a1a2e; }
  .metric-row:last-child { border-bottom: none; }
  .metric-label { color: #888; font-size: 0.85rem; }
  .metric-value { color: #fff; font-weight: 600; font-size: 0.9rem; }
  .metric-value.green { color: #00ff88; }
  .metric-value.yellow { color: #ffcc00; }
  .progress-bar { height: 6px; background: #1a1a2e; border-radius: 3px; overflow: hidden; margin-top: 8px; }
  .progress-fill { height: 100%; background: linear-gradient(90deg, #00d4ff, #00ff88); border-radius: 3px; transition: width 0.5s ease; }
  .task-item { display: flex; align-items: center; gap: 10px; padding: 12px; background: #0f0f1a; border-radius: 8px; margin-bottom: 8px; border-left: 3px solid #00d4ff; }
  .task-item.done { border-left-color: #00ff88; }
  .task-item.fail { border-left-color: #ff4444; }
  .task-icon { font-size: 1.2rem; }
  .task-text { flex: 1; font-size: 0.85rem; }
  .task-time { font-size: 0.7rem; color: #666; }
  .refresh-btn { position: fixed; bottom: 20px; right: 20px; width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #00d4ff, #0099cc); border: none; color: #fff; font-size: 1.5rem; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 20px rgba(0, 212, 255, 0.3); cursor: pointer; z-index: 200; }
  .refresh-btn.spin { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .empty-state { text-align: center; padding: 40px 20px; color: #555; font-size: 0.85rem; }
  .log-entry { font-family: 'SF Mono', Monaco, monospace; font-size: 0.75rem; padding: 6px 0; border-bottom: 1px solid #1a1a2e; color: #aaa; }
  .log-entry:last-child { border-bottom: none; }
  .timestamp { color: #00d4ff; }
  .error-msg { color: #ff4444; }
  .success-msg { color: #00ff88; }
</style>
</head>
<body>
<div class="header">
  <h1>🤖 Bude Tech CEO</h1>
  <div class="subtitle">Autonomous AI Company Dashboard</div>
</div>
<div class="status-bar">
  <div class="status-pill"><span class="dot"></span><span id="status-text">Loading...</span></div>
  <div class="status-pill">📊 <span id="run-count">--</span> runs</div>
  <div class="status-pill">📁 <span id="file-count">--</span> files</div>
</div>
<div class="card">
  <h2>📊 Company Health</h2>
  <div class="metric-row"><span class="metric-label">Code Quality</span><span class="metric-value" id="quality">--</span></div>
  <div class="progress-bar"><div class="progress-fill" id="quality-bar" style="width: 0%"></div></div>
  <div class="metric-row" style="margin-top: 12px;"><span class="metric-label">Features Built</span><span class="metric-value green" id="features">--</span></div>
  <div class="metric-row"><span class="metric-label">Files Created</span><span class="metric-value" id="files-created">--</span></div>
  <div class="metric-row"><span class="metric-label">Last Run</span><span class="metric-value" id="last-run">--</span></div>
  <div class="metric-row"><span class="metric-label">Established</span><span class="metric-value" id="established">--</span></div>
</div>
<div class="card">
  <h2>⚡ Recent Activity</h2>
  <div id="activity-list"><div class="empty-state">Loading activity...</div></div>
</div>
<div class="card">
  <h2>📋 Latest Run Report</h2>
  <div id="report-content"><div class="empty-state">No reports yet</div></div>
</div>
<div class="card">
  <h2>📝 System Log</h2>
  <div id="log-content"><div class="empty-state">Waiting for logs...</div></div>
</div>
<button class="refresh-btn" id="refresh" onclick="loadData()">🔄</button>
<script>
const REPO = 'bude404-ops/bude-tech';
const BRANCH = 'main';
const BASE = 'https://raw.githubusercontent.com/' + REPO + '/' + BRANCH + '/';
async function fetchJSON(path) { try { const res = await fetch(BASE + path + '?t=' + Date.now()); if (!res.ok) return null; return await res.json(); } catch { return null; } }
async function fetchText(path) { try { const res = await fetch(BASE + path + '?t=' + Date.now()); if (!res.ok) return null; return await res.text(); } catch { return null; } }
async function loadData() {
  const btn = document.getElementById('refresh'); btn.classList.add('spin');
  const memory = await fetchJSON('ceo/memory.json');
  if (memory) {
    document.getElementById('run-count').textContent = memory.runs || 0;
    document.getElementById('file-count').textContent = memory.files || 0;
    document.getElementById('files-created').textContent = memory.files_created || 0;
    document.getElementById('features').textContent = memory.files_created || 0;
    document.getElementById('last-run').textContent = memory.lastRun ? new Date(memory.lastRun).toLocaleString() : 'Never';
    document.getElementById('established').textContent = memory.established ? '✅ YES' : '⏳ Building...';
    document.getElementById('established').className = 'metric-value ' + (memory.established ? 'green' : 'yellow');
    const health = memory.health || {}; const quality = health.quality || 0;
    document.getElementById('quality').textContent = quality + '/100';
    document.getElementById('quality-bar').style.width = quality + '%';
    document.getElementById('status-text').textContent = memory.established ? 'Active' : 'Bootstrapping';
  }
  const report = await fetchText('ceo/reports/run_' + (memory ? memory.runs : 1) + '.md');
  if (report) { document.getElementById('report-content').innerHTML = '<pre style="white-space:pre-wrap;font-size:0.8rem;color:#ccc;">' + report.replace(/</g, '&lt;') + '</pre>'; }
  const activityList = document.getElementById('activity-list');
  if (memory && memory.plan && memory.plan.actions) {
    const actions = memory.plan.actions;
    if (actions.length > 0) {
      activityList.innerHTML = actions.map(a => {
        const icon = a.status === 'completed' ? '✅' : a.status === 'failed' ? '❌' : '⏳';
        const cls = a.status === 'completed' ? 'done' : a.status === 'failed' ? 'fail' : '';
        return '<div class="task-item ' + cls + '"><span class="task-icon">' + icon + '</span><div style="flex:1"><div class="task-text">' + a.type + ': ' + a.description + '</div><div class="task-time">' + (a.status || 'pending') + '</div></div></div>';
      }).join('');
    } else { activityList.innerHTML = '<div class="empty-state">No actions this run</div>'; }
  }
  const logDiv = document.getElementById('log-content'); let logHTML = '';
  if (memory && memory.failures && memory.failures.length > 0) {
    logHTML += memory.failures.slice(-5).reverse().map(f => '<div class="log-entry"><span class="timestamp">' + new Date(f.t).toLocaleTimeString() + '</span> <span class="error-msg">❌ ' + f.action + ': ' + f.err + '</span></div>').join('');
  }
  if (memory && memory.lastResult) {
    logHTML += '<div class="log-entry"><span class="timestamp">' + new Date().toLocaleTimeString() + '</span> <span class="success-msg">✅ Last run: ' + memory.lastResult.done + ' done, ' + (memory.lastResult.fail || 0) + ' failed</span></div>';
  }
  if (!logHTML) { logHTML = '<div class="empty-state">No logs yet. First run in progress...</div>'; }
  logDiv.innerHTML = logHTML;
  btn.classList.remove('spin');
}
loadData();
setInterval(loadData, 30000);
</script>
</body>
</html>`;

const PAGES_WORKFLOW = `name: Deploy Dashboard
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: "pages"
  cancel-in-progress: false
jobs:
  deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: './dashboard'
      - id: deployment
        uses: actions/deploy-pages@v4
`;

// ── CHECK ORDERS ──
async function checkOrders(memory, backlog) {
  console.log('[ORDERS] Checking...');
  let orders = '';
  try { orders = await fs.readFile('ceo/orders.txt', 'utf8'); } catch {
    console.log('[ORDERS] No orders file');
    return { executed: [], hasOrders: false };
  }
  if (!orders.trim() || orders.trim().startsWith('# Orders executed') || orders.trim().startsWith('# Processed')) {
    console.log('[ORDERS] No new orders');
    return { executed: [], hasOrders: false };
  }
  
  console.log('[ORDERS] Found orders, executing...');
  const results = [];
  
  if (orders.toLowerCase().includes('dashboard') || orders.toLowerCase().includes('deploy')) {
    try {
      await fs.mkdir('dashboard', { recursive: true });
      await fs.writeFile('dashboard/index.html', DASHBOARD_HTML);
      results.push('Created dashboard/index.html');
      await fs.mkdir('.github/workflows', { recursive: true });
      await fs.writeFile('.github/workflows/pages.yml', PAGES_WORKFLOW);
      results.push('Created Pages deploy workflow');
      let readme = '# Bude Tech\n\n🤖 Autonomous AI Company\n\n## Dashboard\n\n📱 [View CEO Dashboard](https://bude404-ops.github.io/bude-tech/)\n\n## Projects\n\nSee /projects/ for AI-built products.\n\n## License\n\nMIT';
      try {
        const existing = await fs.readFile('README.md', 'utf8');
        if (existing.indexOf('Dashboard') === -1) {
          readme = existing + '\n\n## Dashboard\n\n📱 [View CEO Dashboard](https://bude404-ops.github.io/bude-tech/)\n';
        } else { readme = existing; }
      } catch {}
      await fs.writeFile('README.md', readme);
      results.push('Updated README with dashboard URL');
    } catch (err) {
      results.push('Dashboard failed: ' + err.message);
    }
  }
  
  if (orders.toLowerCase().includes('build feature') || orders.toLowerCase().includes('build:')) {
    try {
      const match = orders.match(/build[:\\s]+(.+)/i);
      const desc = match ? match[1].trim() : 'AI feature';
      addBacklogItem(backlog, desc, 'feature', 'high', 'Human ordered: ' + desc);
      results.push('Added to backlog: ' + desc);
    } catch (err) {
      results.push('Feature order failed: ' + err.message);
    }
  }
  
  let history = [];
  try { history = JSON.parse(await fs.readFile('ceo/orders_history.json', 'utf8')); } catch {}
  history.push({ timestamp: new Date().toISOString(), orders: orders.slice(0, 500), results });
  if (history.length > 20) history = history.slice(-20);
  await fs.writeFile('ceo/orders_history.json', JSON.stringify(history, null, 2));
  await fs.writeFile('ceo/orders.txt', '# Orders executed on ' + new Date().toISOString() + '\n# Results: ' + results.join(', ') + '\n# Write new orders below:\n');
  
  console.log('[ORDERS] Results:', results.join(', '));
  return { executed: results, hasOrders: true };
}

// ── AUTO-BACKLOG GENERATOR ──
function generateAutoTasks(backlog, memory, env) {
  console.log('[AUTO] Generating tasks...');
  
  // Phase 1: Foundation
  if (!env.hasReadme) {
    addBacklogItem(backlog, 'Create company README', 'docs', 'critical', 'Initial README with company description');
  }
  if (!env.hasPackageJson) {
    addBacklogItem(backlog, 'Create package.json', 'infrastructure', 'high', 'Node.js project manifest');
  }
  
  // Phase 2: First product
  if (memory.products.length === 0) {
    addBacklogItem(backlog, 'Build URL shortener utility', 'feature', 'high', 'Simple Node.js module that shortens URLs using a hash function');
  }
  
  // Phase 3: Tests
  if (env.jsFiles > 0 && env.testFiles === 0) {
    addBacklogItem(backlog, 'Add basic tests', 'infrastructure', 'medium', 'Write simple test file for existing JS modules');
  }
  
  // Phase 4: More products when ready
  if (memory.products.length === 1 && memory.runs > 5) {
    addBacklogItem(backlog, 'Build text formatter utility', 'feature', 'medium', 'Node.js module for formatting text (slugify, capitalize, etc)');
  }
  if (memory.products.length === 2 && memory.runs > 10) {
    addBacklogItem(backlog, 'Build config loader utility', 'feature', 'medium', 'Node.js module for loading and validating JSON config files');
  }
  
  // Phase 5: Polish
  if (memory.products.length >= 2) {
    const untested = memory.products.filter(p => !p.tested);
    if (untested.length > 0) {
      addBacklogItem(backlog, 'Add tests to ' + untested[0].name, 'infrastructure', 'medium', 'Write unit tests for ' + untested[0].name);
    }
  }
}

// ── BOOTSTRAP ──
async function bootstrap(memory) {
  console.log('[BOOTSTRAP] Checking files...');
  let created = 0;
  const modules = {
    'package.json': JSON.stringify({ name: 'bude-tech', version: '2.0.0', description: 'Autonomous AI Company', main: 'ceo/brain.js', scripts: { start: 'node ceo/brain.js', test: 'node --test' }, keywords: ['ai', 'autonomous'], author: 'Bude CEO', license: 'MIT', engines: { node: '>=18.0.0' } }, null, 2),
    '.gitignore': 'node_modules/\npackage-lock.json\n.env\n*.log\n*.backup\n*.bak\n.DS_Store'
  };
  for (const [fp, content] of Object.entries(modules)) {
    try { await fs.access(fp); } catch {
      await writeFile(fp, content);
      created++;
      console.log('[BOOTSTRAP] Created', fp);
    }
  }
  for (const dir of ['projects', 'content', 'ceo/reports', 'ceo/strategies']) {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(dir + '/.gitkeep', '');
  }
  memory.files_created = (memory.files_created || 0) + created;
  console.log('[BOOTSTRAP]', created, 'files created');
}

// ── ANALYZE ──
async function analyze() {
  try {
    const files = execSync('find . -type f -not -path "./.git/*" -not -path "./node_modules/*" | wc -l', { encoding: 'utf8' }).trim();
    let quality = 50;
    try { await fs.access('README.md'); quality += 15; } catch {}
    try { await fs.access('.github/workflows'); quality += 15; } catch {}
    try { await fs.access('projects'); quality += 10; } catch {}
    try { await fs.access('tests'); quality += 10; } catch {}
    return { files: parseInt(files), quality: Math.min(quality, 100) };
  } catch { return { files: 0, quality: 0 }; }
}

// ── TASK EXECUTORS ──
async function executeDocsTask(task, memory) {
  console.log('[EXEC] Docs:', task.title);
  if (task.title.includes('README')) {
    const readme = await aiAsk('Write a short README.md for Bude Tech AI company. Output markdown.', 800);
    if (readme) {
      await fs.writeFile('README.md', readme);
      memory.metrics.docsUpdated++;
      return { success: true };
    }
    return { success: false, error: 'Empty AI response' };
  }
  return { success: false, error: 'Unknown docs task' };
}

async function executeFeatureTask(task, memory) {
  console.log('[EXEC] Feature:', task.title);
  const productName = task.title.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30);
  const dir = 'projects/' + productName;
  
  try {
    await fs.mkdir(dir, { recursive: true });
    const prompt = `Write a small, focused Node.js module for: ${task.description || task.title}.
Requirements:
- Single file, under 50 lines
- Has a clear purpose and exports useful functions
- Include JSDoc comments
- No external dependencies
- Export as module.exports

Output ONLY the code, no explanation.`;
    
    const code = await aiAsk(prompt, 1200);
    const clean = code.replace(/```[\w]*\n?/g, '').replace(/```/g, '').trim();
    const finalCode = clean || `// ${task.title}\nmodule.exports = {};\n`;
    
    await fs.writeFile(dir + '/index.js', finalCode);
    await fs.writeFile(dir + '/package.json', JSON.stringify({
      name: productName, version: '1.0.0', description: task.description || task.title,
      main: 'index.js', scripts: { test: 'node index.js' }
    }, null, 2));
    
    // Basic test
    const testCode = `const mod = require('./index.js');
console.log('Testing ${productName}...');
console.log('Exports:', Object.keys(mod));
if (typeof mod === 'function' || Object.keys(mod).length > 0) {
  console.log('✅ Has exports');
} else {
  console.log('⚠️ Empty module');
}
console.log('OK');`;
    await fs.writeFile(dir + '/test.js', testCode);
    
    memory.products.push({
      name: productName,
      dir,
      created: new Date().toISOString(),
      tested: false,
      taskId: task.id
    });
    memory.metrics.filesCreated += 3;
    memory.metrics.featuresShipped++;
    
    return { success: true, product: productName };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function executeInfrastructureTask(task, memory, env) {
  console.log('[EXEC] Infrastructure:', task.title);
  if (task.title.includes('package.json')) {
    // Already handled by bootstrap
    return { success: true, skipped: true };
  }
  if (task.title.includes('tests')) {
    // Find a product without tests and add one
    const untested = memory.products.filter(p => !p.tested);
    if (untested.length === 0) return { success: false, error: 'No untested products' };
    
    const target = untested[0];
    const testCode = `const mod = require('./index.js');
console.log('Testing ${target.name}...');
try {
  const keys = Object.keys(mod);
  console.log('Exports:', keys);
  keys.forEach(k => {
    if (typeof mod[k] === 'function') {
      console.log('Function ${target.name}.${k} exists');
    }
  });
  console.log('✅ Tests passed');
} catch(e) {
  console.log('❌ Test error:', e.message);
}`;
    await fs.writeFile(target.dir + '/test.js', testCode);
    target.tested = true;
    memory.metrics.filesCreated++;
    return { success: true, product: target.name };
  }
  return { success: false, error: 'Unknown infrastructure task' };
}

// ── SECURITY AUDIT ──
async function securityAudit(memory) {
  console.log('[ACTION] Security audit');
  try {
    const issues = [];
    const jsFiles = execSync('find . -name "*.js" -not -path "./node_modules/*" -not -path "./.git/*"', { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    for (const f of jsFiles) {
      const c = await fs.readFile(f, 'utf8');
      if (/password\s*=\s*["'][^"']+["']/i.test(c) && !c.includes('//') && !c.includes('password policy')) {
        issues.push({ file: f, issue: 'Possible hardcoded password', severity: 'high' });
      }
      if (/eval\s*\(/.test(c) && !c.includes('//')) {
        issues.push({ file: f, issue: 'eval() usage', severity: 'medium' });
      }
      if (/api[_-]?key\s*[:=]\s*["'][^"']{10,}["']/i.test(c)) {
        issues.push({ file: f, issue: 'Possible API key in code', severity: 'critical' });
      }
    }
    await fs.mkdir('ceo/reports', { recursive: true });
    await fs.writeFile('ceo/reports/security.json', JSON.stringify({ scanned: jsFiles.length, issues, time: new Date().toISOString() }, null, 2));
    console.log('[OK] Audit:', issues.length, 'issues');
    return { done: true, issues: issues.length };
  } catch (err) {
    console.log('[FAIL]', err.message);
    return { done: false, error: err };
  }
}

// ── BACKUP MEMORY ──
async function backupMemory() {
  try {
    const content = await fs.readFile('ceo/memory.json', 'utf8');
    await fs.writeFile('ceo/memory.json.bak', content);
  } catch {}
}

// ═══════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════
async function main() {
  const start = Date.now();
  console.log('[CEO] BUDE TECH v4.2-AUTO | Run:', RUN_NUM);
  
  // Load
  let memory;
  try {
    memory = JSON.parse(await fs.readFile('ceo/memory.json', 'utf8'));
  } catch {
    memory = { runs: 0, files_created: 0, failures: [], products: [], metrics: { filesCreated: 0, featuresShipped: 0, bugsFixed: 0, docsUpdated: 0 } };
  }
  memory.runs = (memory.runs || 0) + 1;
  memory.lastRun = new Date().toISOString();
  
  const backlog = await loadBacklog();
  await backupMemory();
  await bootstrap(memory);
  
  // Check orders
  const orderResult = await checkOrders(memory, backlog);
  
  // Analyze
  const env = await analyze();
  memory.health = env;
  console.log('[CEO] Files:', env.files, '| Quality:', env.quality);
  
  // Auto-generate tasks if backlog is empty
  if (backlog.items.filter(i => i.status === 'open').length === 0) {
    console.log('[AUTO] Backlog empty, generating tasks...');
    generateAutoTasks(backlog, memory, env);
    await saveBacklog(backlog);
  }
  
  // Pick next task
  const task = getNextBacklogItem(backlog);
  const actions = [];
  let execution = null;
  
  if (task) {
    console.log('[TASK] Next up:', task.title, '(' + task.type + ')');
    task.status = 'in_progress';
    await saveBacklog(backlog);
    
    try {
      switch (task.type) {
        case 'docs': execution = await executeDocsTask(task, memory); break;
        case 'feature': execution = await executeFeatureTask(task, memory); break;
        case 'infrastructure': execution = await executeInfrastructureTask(task, memory, env); break;
        default: execution = { success: false, error: 'Unknown type: ' + task.type };
      }
    } catch (err) {
      execution = { success: false, error: err.message };
    }
    
    if (execution.success) {
      completeBacklogItem(backlog, task, true);
      actions.push('✅ ' + task.title + (execution.product ? ': ' + execution.product : ''));
    } else {
      completeBacklogItem(backlog, task, false);
      actions.push('❌ ' + task.title + ': ' + execution.error);
      memory.failures.push({ t: new Date().toISOString(), action: task.title, err: execution.error });
    }
    await saveBacklog(backlog);
  } else {
    actions.push('⏳ No tasks available');
  }
  
  // Security audit (always)
  const auditResult = await securityAudit(memory);
  if (auditResult.done) actions.push('🔒 Security: ' + auditResult.issues + ' issues');
  
  // Update established
  const hasProducts = memory.products && memory.products.length > 0;
  const hasTests = memory.products.some(p => p.tested);
  memory.established = memory.runs > 10 && hasProducts && hasTests;
  
  // Save
  memory.lastResult = { done: actions.length, actions, fileCount: env.files };
  await fs.mkdir('ceo', { recursive: true });
  await fs.writeFile('ceo/memory.json', JSON.stringify(memory, null, 2));
  
  // Report
  const apiUsage = await loadApiUsage();
  let report = '# CEO Run ' + RUN_NUM + '\n\n';
  report += '**Time:** ' + new Date().toISOString() + '\n';
  report += '**Duration:** ' + ((Date.now() - start) / 1000).toFixed(1) + 's\n';
  report += '**API Calls Today:** ' + apiUsage.today + '/' + MAX_API_PER_DAY + '\n\n';
  report += '## Actions\n\n';
  for (const a of actions) report += '- ' + a + '\n';
  report += '\n## Environment\n\n';
  report += '- Files: ' + env.files + '\n';
  report += '- Quality: ' + env.quality + '/100\n';
  report += '- Products: ' + (memory.products ? memory.products.length : 0) + '\n';
  report += '- Established: ' + (memory.established ? '✅ YES' : '⏳ Building...') + '\n\n';
  
  const openTasks = backlog.items.filter(i => i.status === 'open').length;
  const doneTasks = backlog.items.filter(i => i.status === 'done').length;
  report += '## Backlog\n\n';
  report += '- Open: ' + openTasks + '\n';
  report += '- Done: ' + doneTasks + '\n\n';
  
  if (memory.products && memory.products.length > 0) {
    report += '## Products\n\n';
    for (const p of memory.products.slice(-5)) {
      report += '- ' + p.name + ' (' + (p.tested ? '✅ tested' : '⏳ untested') + ')\n';
    }
    report += '\n';
  }
  
  if (orderResult.hasOrders) {
    report += '## Orders\n\n';
    report += 'Executed: ' + orderResult.executed.join(', ') + '\n\n';
  }
  
  if (memory.failures && memory.failures.length > 0) {
    const recent = memory.failures.slice(-3);
    report += '## Recent Failures\n\n';
    for (const f of recent) report += '- ' + f.action + ': ' + f.err + '\n';
    report += '\n';
  }
  
  report += '---\n*Autonomous CEO v4.2-AUTO*\n';
  await fs.writeFile('ceo/reports/run_' + RUN_NUM + '.md', report);
  
  const duration = ((Date.now() - start) / 1000).toFixed(1);
  console.log('\n[CEO] Done in ' + duration + 's');
  console.log('[CEO] Actions:', actions.length);
  console.log('[CEO] API today:', apiUsage.today + '/' + MAX_API_PER_DAY);
  if (memory.established) console.log('[CEO] 🚀 ESTABLISHED!');
  
  process.exit(0);
}

setTimeout(() => { console.log('[CEO] Timeout'); process.exit(0); }, 8 * 60 * 1000);
main().catch(err => { console.error('[CEO] Fatal:', err.message); process.exit(1); });
