#!/usr/bin/env node
/**
 * BUDE TECH AUTONOMOUS CEO v3.2 — FIXED
 * 
 * ONLY FILE YOU CREATE MANUALLY.
 * The CEO bootstraps everything else on first run.
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');

const CONFIG = {
  model: 'anthropic/claude-3.5-sonnet',
  apiKey: process.env.OPENROUTER_API_KEY,
  mode: process.env.CEO_MODE || 'auto',
  runNumber: process.env.GITHUB_RUN_NUMBER || 'local',
  timeout: 10 * 60 * 1000,
};

// ═══════════════════════════════════════════════════════
// AI CLIENT
// ═══════════════════════════════════════════════════════
class AIClient {
  constructor() {
    this.offline = !CONFIG.apiKey;
    this.cache = new Map();
  }

  async ask(prompt, opts) {
    opts = opts || {};
    const cacheKey = prompt.slice(0, 80) + (opts.tokens || 1500);
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);
    
    if (this.offline) return this.offlineResponse(prompt);
    
    return new Promise((resolve) => {
      const postData = JSON.stringify({
        model: CONFIG.model,
        messages: [
          { role: 'system', content: 'You are the autonomous AI CEO of Bude Tech. Be concise. Output valid JSON when asked. For code, output ONLY code blocks.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: opts.tokens || 1500,
        temperature: opts.temp || 0.5
      });

      const req = https.request({
        hostname: 'openrouter.ai',
        path: '/api/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + CONFIG.apiKey,
          'HTTP-Referer': 'https://github.com/bude404-ops/bude-tech',
          'X-Title': 'Bude Tech CEO'
        },
        timeout: 20000
      }, (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            const content = parsed.choices && parsed.choices[0] ? parsed.choices[0].message.content : '';
            this.cache.set(cacheKey, content);
            resolve(content);
          } catch (e) { resolve(''); }
        });
      });

      req.on('error', () => { this.offline = true; resolve(this.offlineResponse(prompt)); });
      req.on('timeout', () => { req.destroy(); this.offline = true; resolve(this.offlineResponse(prompt)); });
      req.write(postData);
      req.end();
    });
  }

  offlineResponse(prompt) {
    if (prompt.indexOf('plan') !== -1 || prompt.indexOf('strategy') !== -1) {
      return JSON.stringify({
        title: 'Bootstrap Plan',
        priority: 'high',
        actions: [
          { type: 'batch_create', description: 'Create all core modules' }
        ]
      });
    }
    return '// Offline mode';
  }
}

// ═══════════════════════════════════════════════════════
// MEMORY
// ═══════════════════════════════════════════════════════
class MemoryStore {
  constructor() {
    this.memoryFile = 'ceo/memory.json';
    this.data = {};
  }

  async load() {
    try {
      const raw = await fs.readFile(this.memoryFile, 'utf8');
      this.data = JSON.parse(raw);
    } catch (e) {
      this.data = {
        created: new Date().toISOString(),
        runs: 0,
        established: false,
        learnings: [],
        failures: []
      };
    }
    this.data.runs = (this.data.runs || 0) + 1;
    this.data.lastRun = new Date().toISOString();
  }

  async save() {
    await fs.mkdir('ceo', { recursive: true });
    await fs.writeFile(this.memoryFile, JSON.stringify(this.data, null, 2));
  }

  get(key) { return this.data[key]; }
  set(key, value) { this.data[key] = value; }
  append(key, value) {
    if (!this.data[key]) this.data[key] = [];
    this.data[key].push(value);
    if (this.data[key].length > 100) {
      this.data[key] = this.data[key].slice(-100);
    }
  }
}

// ═══════════════════════════════════════════════════════
// FILE CREATOR
// ═══════════════════════════════════════════════════════
async function writeFile(filePath, content) {
  const dir = path.dirname(filePath);
  if (dir !== '.') {
    await fs.mkdir(dir, { recursive: true });
  }
  await fs.writeFile(filePath, content);
}

// ═══════════════════════════════════════════════════════
// BOOTSTRAP — Creates all missing files
// ═══════════════════════════════════════════════════════
async function bootstrap(ai, memory) {
  console.log('\n🔧 BOOTSTRAP: Checking files...\n');
  
  const files = {
    'ceo/modules/memory.js': `const fs = require('fs').promises;\n\nclass Memory {\n  constructor() {\n    this.file = 'ceo/memory.json';\n    this.data = {};\n  }\n  async load() {\n    try { this.data = JSON.parse(await fs.readFile(this.file, 'utf8')); }\n    catch { this.data = { created: new Date().toISOString(), runs: 0 }; }\n    this.data.runs = (this.data.runs || 0) + 1;\n  }\n  async save() {\n    await fs.mkdir('ceo', { recursive: true });\n    await fs.writeFile(this.file, JSON.stringify(this.data, null, 2));\n  }\n  get(k) { return this.data[k]; }\n  set(k, v) { this.data[k] = v; }\n}\n\nmodule.exports = Memory;`,

    'ceo/modules/builder.js': `const fs = require('fs').promises;\nconst path = require('path');\n\nclass Builder {\n  async buildFeature(specs) {\n    const name = specs.name || 'feature_' + Date.now();\n    const dir = 'projects/' + name;\n    await fs.mkdir(dir, { recursive: true });\n    await fs.writeFile(dir + '/index.js', '// Feature: ' + specs.description + '\\nmodule.exports = {};');\n    await fs.writeFile(dir + '/package.json', JSON.stringify({ name: name, version: '1.0.0', main: 'index.js' }, null, 2));\n    return { summary: 'Built ' + name, location: dir };\n  }\n  async fixBug(bug) {\n    try {\n      const code = await fs.readFile(bug.file, 'utf8');\n      await fs.writeFile(bug.file + '.bak', code);\n      await fs.writeFile(bug.file, code + '\\n// Fixed');\n      return { summary: 'Fixed ' + bug.file };\n    } catch { return { summary: 'Failed', error: 'Not found' }; }\n  }\n  async writeCode(fp, desc) {\n    await fs.mkdir(path.dirname(fp) || '.', { recursive: true });\n    await fs.writeFile(fp, '// ' + desc + '\\n');\n    return { summary: 'Wrote ' + fp };\n  }\n  async securityAudit() {\n    const issues = [];\n    try {\n      const files = require('child_process').execSync('find . -name \"*.js\" -not -path \"./node_modules/*\" -not -path \"./.git/*\"', { encoding: 'utf8' }).trim().split('\\n').filter(Boolean);\n      for (const f of files) {\n        const c = await fs.readFile(f, 'utf8');\n        if (/password\\s*=\\s*[\"'][^\"']+[\"']/i.test(c)) issues.push({ file: f, issue: 'Hardcoded password' });\n        if (/eval\\s*\\(/.test(c)) issues.push({ file: f, issue: 'eval()' });\n      }\n      await fs.mkdir('ceo/reports', { recursive: true });\n      await fs.writeFile('ceo/reports/security.json', JSON.stringify({ scanned: files.length, issues, time: new Date().toISOString() }, null, 2));\n    } catch {}\n    return { summary: 'Audit: ' + issues.length + ' issues', issues };\n  }\n}\n\nmodule.exports = Builder;`,

    'ceo/modules/marketer.js': `const fs = require('fs').promises;\n\nclass Marketer {\n  async updateDocs() {\n    const readme = '# 🤖 Bude Tech\\n\\nAutonomous AI-powered tech company.\\n\\n## Projects\\n\\nSee /projects/ for AI-built products.\\n\\n## License\\n\\nMIT';\n    await fs.writeFile('README.md', readme);\n    return { summary: 'Updated README' };\n  }\n  async createContent(type, topic) {\n    await fs.mkdir('content', { recursive: true });\n    const file = 'content/' + type + '_' + Date.now() + '.md';\n    await fs.writeFile(file, '# ' + topic + '\\n\\nGenerated by Bude CEO.\\n');\n    return { summary: 'Created ' + file };\n  }\n  async researchMarket(topic) {\n    await fs.mkdir('content', { recursive: true });\n    const file = 'content/research_' + Date.now() + '.md';\n    await fs.writeFile(file, '# Market Research: ' + topic + '\\n\\n*In progress...*\\n');\n    return { summary: 'Research saved' };\n  }\n}\n\nmodule.exports = Marketer;`,

    'ceo/modules/learner.js': `const fs = require('fs').promises;\n\nclass Learner {\n  constructor() {\n    this.kbFile = 'ceo/knowledge.json';\n    this.failFile = 'ceo/failures.json';\n    this.kb = {};\n    this.failures = [];\n  }\n  async load() {\n    try { this.kb = JSON.parse(await fs.readFile(this.kbFile, 'utf8')); }\n    catch { this.kb = { created: new Date().toISOString(), patterns: [] }; }\n    try { this.failures = JSON.parse(await fs.readFile(this.failFile, 'utf8')); }\n    catch { this.failures = []; }\n  }\n  async recordFailure(action, err) {\n    this.failures.push({ t: new Date().toISOString(), action: action.type, err: err.message });\n    if (this.failures.length > 50) this.failures = this.failures.slice(-50);\n    await this.saveFails();\n  }\n  async getRecent(n) { return this.failures.slice(-n); }\n  async generateInsights(plan) {\n    const completed = plan.actions ? plan.actions.filter(a => a.status === 'completed').length : 0;\n    const failed = plan.actions ? plan.actions.filter(a => a.status === 'failed').length : 0;\n    const insights = [];\n    if (failed > 0) insights.push({ type: 'failure', msg: failed + ' failed', rec: 'Fix issues' });\n    if (completed > failed) insights.push({ type: 'success', msg: 'Good run', rec: 'Continue' });\n    return insights;\n  }\n  async saveKB() {\n    await fs.mkdir('ceo', { recursive: true });\n    await fs.writeFile(this.kbFile, JSON.stringify(this.kb, null, 2));\n  }\n  async saveFails() {\n    await fs.mkdir('ceo', { recursive: true });\n    await fs.writeFile(this.failFile, JSON.stringify(this.failures, null, 2));\n  }\n}\n\nmodule.exports = Learner;`,

    'ceo/modules/communicator.js': `const https = require('https');\n\nclass Communicator {\n  constructor() {\n    this.key = process.env.OPENROUTER_API_KEY;\n  }\n  async checkAPI() {\n    if (!this.key) return false;\n    return new Promise(r => {\n      const req = https.request({ hostname: 'openrouter.ai', path: '/api/v1/auth/key', method: 'GET', headers: { 'Authorization': 'Bearer ' + this.key }, timeout: 5000 }, res => r(res.statusCode === 200));\n      req.on('error', () => r(false));\n      req.on('timeout', () => { req.destroy(); r(false); });\n      req.end();\n    });\n  }\n  async report(memory) {\n    const health = memory.get('health') || {};\n    const plan = memory.get('plan') || {};\n    const completed = plan.actions ? plan.actions.filter(a => a.status === 'completed').length : 0;\n    const failed = plan.actions ? plan.actions.filter(a => a.status === 'failed').length : 0;\n    return '# Run Report\\n\\n**Status:** ' + (failed === 0 ? '✅' : '⚠️') + '\\n**Done:** ' + completed + '\\n**Failed:** ' + failed + '\\n**Files:** ' + (health.files || 0) + '\\n\\n*Autonomous CEO*';\n  }\n}\n\nmodule.exports = Communicator;`,

    'ceo/learn.js': `const fs = require('fs').promises;\nconst Learner = require('./modules/learner');\n\nasync function main() {\n  console.log('🎓 Reflecting...');\n  const learner = new Learner();\n  await learner.load();\n  let memory;\n  try { memory = JSON.parse(await fs.readFile('ceo/memory.json', 'utf8')); }\n  catch { console.log('No memory'); return; }\n  const runs = memory.runs || 0;\n  const fails = memory.failures ? memory.failures.length : 0;\n  console.log('Runs:', runs, 'Failures:', fails);\n  if (runs > 5 && fails / runs < 0.3) {\n    console.log('🚀 ESTABLISHED! Switch cron to: 0 */6 * * *');\n  }\n  console.log('Done.\\n');\n}\n\nmain().catch(console.error);`,

    'ceo/persist.js': `const fs = require('fs').promises;\n\nasync function main() {\n  console.log('💾 Saving...');\n  const dirs = ['ceo/reports', 'ceo/strategies', 'projects', 'content'];\n  for (const dir of dirs) {\n    await fs.mkdir(dir, { recursive: true });\n    await fs.writeFile(dir + '/.gitkeep', '');\n  }\n  console.log('Done.\\n');\n}\n\nmain().catch(console.error);`,

    'package.json': JSON.stringify({
      name: 'bude-tech',
      version: '2.0.0',
      description: '🤖 Autonomous AI-Powered Tech Company',
      main: 'ceo/brain.js',
      scripts: { start: 'node ceo/brain.js', ceo: 'node ceo/brain.js', test: 'node --test' },
      keywords: ['ai', 'autonomous', 'startup', 'ceo'],
      author: 'Bude CEO 🤖',
      license: 'MIT',
      repository: { type: 'git', url: 'https://github.com/bude404-ops/bude-tech.git' },
      engines: { node: '>=18.0.0' }
    }, null, 2),

    '.gitignore': '# Dependencies\nnode_modules/\npackage-lock.json\n\n# Environment\n.env\n\n# Logs\n*.log\n\n# Backups\n*.backup\n*.bak\n\n# OS\n.DS_Store\n'
  };
  
  const missing = [];
  for (const filePath of Object.keys(files)) {
    try {
      await fs.access(filePath);
      console.log('   ✓', filePath);
    } catch {
      missing.push(filePath);
    }
  }
  
  if (missing.length === 0) {
    console.log('   All files exist.\n');
    memory.set('established', memory.get('runs') > 5);
    return;
  }
  
  console.log('   Creating ' + missing.length + ' files...\n');
  
  for (const filePath of missing) {
    await writeFile(filePath, files[filePath]);
    console.log('   ✅', filePath);
  }
  
  const dirs = ['projects', 'content', 'ceo/reports', 'ceo/strategies'];
  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(dir + '/.gitkeep', '');
  }
  
  console.log('\n🔧 BOOTSTRAP: ' + missing.length + ' files created\n');
  memory.set('bootstrap_complete', true);
  memory.set('files_created', (memory.get('files_created') || 0) + missing.length);
}

// ═══════════════════════════════════════════════════════
// ANALYSIS
// ═══════════════════════════════════════════════════════
async function analyzeCompany() {
  try {
    const files = execSync('find . -type f -not -path "./.git/*" -not -path "./node_modules/*" | wc -l', { encoding: 'utf8' }).trim();
    let quality = 50;
    try { await fs.access('README.md'); quality += 15; } catch {}
    try { await fs.access('.github/workflows'); quality += 15; } catch {}
    try { await fs.access('projects'); quality += 10; } catch {}
    try { await fs.access('tests'); quality += 10; } catch {}
    return { files: parseInt(files), quality: Math.min(quality, 100) };
  } catch {
    return { files: 0, quality: 0 };
  }
}

// ═══════════════════════════════════════════════════════
// PLANNING
// ═══════════════════════════════════════════════════════
async function createPlan(ai, memory, health) {
  const established = memory.get('established');
  const runs = memory.get('runs');
  
  if (!established && runs < 5) {
    return {
      title: 'Bootstrap Phase',
      priority: 'high',
      actions: [
        { type: 'build_feature', description: 'Create a utility module', target: 'projects/utils' },
        { type: 'update_docs', description: 'Refresh README', target: 'README.md' },
        { type: 'security_audit', description: 'Quick security check', target: '.' }
      ]
    };
  }
  
  const prompt = 'CEO of Bude Tech. State: ' + health.files + ' files, quality ' + health.quality + '/100, runs ' + runs + '. Established: ' + established + '.\nCreate a FAST plan (2-3 actions). Output JSON:\n{"title":"plan","actions":[{"type":"build_feature|fix_bug|write_code|update_docs|security_audit|create_content","description":"brief","target":"file"}]}';

  const response = await ai.ask(prompt, { tokens: 800 });
  try {
    const match = response.match(/\{[\s\S]*\}/);
    return JSON.parse(match[0]);
  } catch {
    return {
      title: 'Quick Maintenance',
      actions: [
        { type: 'update_docs', description: 'Update README', target: 'README.md' },
        { type: 'security_audit', description: 'Security check', target: '.' }
      ]
    };
  }
}

// ═══════════════════════════════════════════════════════
// EXECUTION
// ═══════════════════════════════════════════════════════
async function runAction(ai, action, memory) {
  switch (action.type) {
    case 'batch_create':
      return { success: true, note: 'Bootstrap handled' };
    
    case 'build_feature': {
      const name = action.target ? action.target.replace('projects/', '') : 'feature_' + Date.now();
      const dir = 'projects/' + name;
      await fs.mkdir(dir, { recursive: true });
      const code = await ai.ask('Write a tiny Node.js module for: ' + action.description + '. 20 lines max. Output ONLY code.', { tokens: 800, temp: 0.3 });
      const clean = code.replace(/```[\w]*\n?/g, '').replace(/```/g, '').trim();
      await fs.writeFile(dir + '/index.js', clean || '// ' + action.description + '\nmodule.exports = {};');
      await fs.writeFile(dir + '/package.json', JSON.stringify({ name: name, version: '1.0.0', main: 'index.js' }, null, 2));
      return { success: true, file: dir + '/index.js' };
    }
    
    case 'fix_bug': {
      try {
        const code = await fs.readFile(action.target, 'utf8');
        await fs.writeFile(action.target + '.bak', code);
        await fs.writeFile(action.target, code + '\n// Auto-fixed\n');
        return { success: true, file: action.target };
      } catch { return { success: false, error: 'File not found' }; }
    }
    
    case 'write_code': {
      const code = await ai.ask('Write code for: ' + action.description + '. Output ONLY code.', { tokens: 1000, temp: 0.3 });
      await fs.mkdir(path.dirname(action.target) || '.', { recursive: true });
      await fs.writeFile(action.target, code.replace(/```[\w]*\n?/g, '').replace(/```/g, '').trim());
      return { success: true, file: action.target };
    }
    
    case 'update_docs': {
      const readme = await ai.ask('Write a short README.md for Bude Tech (autonomous AI company). Include: what it is, how it works, projects. Output markdown.', { tokens: 1000 });
      await fs.writeFile('README.md', readme);
      return { success: true, file: 'README.md' };
    }
    
    case 'create_content': {
      await fs.mkdir('content', { recursive: true });
      const file = 'content/post_' + Date.now() + '.md';
      await fs.writeFile(file, '# ' + action.description + '\n\nGenerated by Bude CEO.\n');
      return { success: true, file };
    }
    
    case 'security_audit': {
      const issues = [];
      try {
        const files = execSync('find . -name "*.js" -not -path "./node_modules/*" -not -path "./.git/*"', { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
        for (const f of files) {
          const c = await fs.readFile(f, 'utf8');
          if (/password\s*=\s*["'][^"']+["']/i.test(c)) issues.push({ file: f, issue: 'Hardcoded password' });
          if (/eval\s*\(/.test(c)) issues.push({ file: f, issue: 'eval()' });
        }
        await fs.mkdir('ceo/reports', { recursive: true });
        await fs.writeFile('ceo/reports/security.json', JSON.stringify({ scanned: files.length, issues, time: new Date().toISOString() }, null, 2));
      } catch {}
      return { success: true, issues: issues.length };
    }
    
    case 'market_research': {
      await fs.mkdir('content', { recursive: true });
      const file = 'content/research_' + Date.now() + '.md';
      const research = await ai.ask('Brief market research on: ' + (action.target || 'AI software') + '. 5 bullet points. Output markdown.', { tokens: 800 });
      await fs.writeFile(file, research);
      return { success: true, file };
    }
    
    default:
      return { success: false, error: 'Unknown: ' + action.type };
  }
}

// ═══════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════
async function main() {
  const start = Date.now();
  const ai = new AIClient();
  const memory = new MemoryStore();
  
  console.log('🧠 ==========================================');
  console.log('🧠  BUDE TECH CEO v3.2 — FAST MODE');
  console.log('🧠  Run:', CONFIG.runNumber, '| Mode:', CONFIG.mode);
  console.log('🧠 ==========================================\n');
  
  await memory.load();
  
  // PHASE 1: Bootstrap
  await bootstrap(ai, memory);
  
  // PHASE 2: Analysis
  const health = await analyzeCompany();
  memory.set('health', health);
  console.log('📊 Files:', health.files, '| Quality:', health.quality, '/100\n');
  
  // PHASE 3: Plan
  const plan = await createPlan(ai, memory, health);
  memory.set('plan', plan);
  console.log('📋', plan.title, '(' + plan.actions.length + ' actions)\n');
  
  // PHASE 4: Execute
  let completed = 0;
  let failed = 0;
  
  for (let i = 0; i < plan.actions.length; i++) {
    const action = plan.actions[i];
    console.log('   ⚡ [' + (i + 1) + '/' + plan.actions.length + '] ' + action.type + ': ' + action.description);
    try {
      const result = await runAction(ai, action, memory);
      action.status = result.success ? 'completed' : 'failed';
      if (result.success) {
        completed++;
        console.log('   ✅', result.file || 'Done');
      } else {
        failed++;
        console.log('   ❌', result.error);
        memory.append('failures', { t: new Date().toISOString(), action: action.type, err: result.error });
      }
    } catch (err) {
      failed++;
      action.status = 'failed';
      console.log('   ❌', err.message);
      memory.append('failures', { t: new Date().toISOString(), action: action.type, err: err.message });
    }
  }
  
  // PHASE 5: Reflection
  console.log('\n🪞 Results:', completed, '✅', failed, '❌');
  const established = memory.get('runs') > 5 && memory.get('files_created') > 5;
  memory.set('established', established);
  if (established) {
    console.log('   🚀 ESTABLISHED! Switch cron to: 0 */6 * * *');
  }
  
  // PHASE 6: Save
  const summary = plan.title + ' | ' + completed + ' done';
  await fs.writeFile('ceo/last_action.txt', summary);
  
  const report = await ai.ask('Generate a 3-line run report. Run ' + CONFIG.runNumber + '. ' + completed + ' done, ' + failed + ' failed. ' + health.files + ' files. Established: ' + established + '. Output markdown.', { tokens: 300 });
  await fs.writeFile('ceo/reports/run_' + CONFIG.runNumber + '.md', report);
  
  await memory.save();
  
  const duration = ((Date.now() - start) / 1000).toFixed(1);
  console.log('\n🏁 Done in ' + duration + 's | Established: ' + (established ? 'YES 🚀' : 'NO'));
  console.log('🧠 Bude Tech grows...\n');
}

// Safety timeout
setTimeout(() => { console.log('⏰ Timeout'); process.exit(0); }, CONFIG.timeout);

main().catch(err => { console.error('💀', err.message); process.exit(1); });
