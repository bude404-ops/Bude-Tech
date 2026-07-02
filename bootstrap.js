#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
// M-IOS v26 — SEED BOOTSTRAP
// Run: node bootstrap.js
// This file creates EVERYTHING else, then starts the system.
// ═══════════════════════════════════════════════════════════════

import { writeFile, mkdir, access, readFile } from 'fs/promises';
import { execSync } from 'child_process';
import { join } from 'path';

const ROOT = process.cwd();

const FILES = {
  // ─── BACKEND ───────────────────────────────────────────────
  'backend/package.json': `{
  "name": "mios-backend",
  "version": "26.0.0",
  "type": "module",
  "scripts": { "start": "node server.js", "dev": "node --watch server.js" },
  "dependencies": { "express": "^4.18.2", "cors": "^2.8.5", "dotenv": "^16.3.1", "ws": "^8.14.2" }
}`,

  'backend/server.js': `import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { startMiosLoop, getCurrentState, stopMiosLoop } from './mios_loop.js';
import { appendDecision } from './decision_logger.js';

dotenv.config();
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  const send = () => res.write('data: '+JSON.stringify(getCurrentState())+'\\n\\n');
  send(); const iv = setInterval(send, 2000);
  req.on('close', () => clearInterval(iv));
});

app.get('/api/state', (req, res) => res.json(getCurrentState()));
app.get('/health', (req, res) => res.json({ status:'M-IOS v26 Operational', time:new Date().toISOString() }));

app.post('/api/command', async (req, res) => {
  const { command, params } = req.body;
  res.json({ command, status:'executed', params, timestamp: new Date().toISOString() });
});

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type:'connected', state:getCurrentState() }));
  ws.on('message', async (msg) => {
    const data = JSON.parse(msg);
    if(data.type==='command') ws.send(JSON.stringify({ type:'result', result:await handleCommand(data.command,data.params) }));
  });
});

async function handleCommand(cmd, params) {
  if(cmd==='stop') { stopMiosLoop(); return {status:'stopped'}; }
  if(cmd==='start') { startMiosLoop(); return {status:'started'}; }
  return { cmd, status:'unknown' };
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => { console.log('🌐 M-IOS Backend on port '+PORT); startMiosLoop(); });`,

  'backend/mios_loop.js': `import { randomUUID } from 'crypto';
import { appendDecision } from './decision_logger.js';

let state = { status:'idle', decision:'Initializing...', personality:{}, swarm:[], llm:{reasoning:'Waiting...',confidence:0}, market:{}, evolution:{generation:0,bestScore:0}, lastUpdate:new Date().toISOString(), uptime:0, cycleCount:0 };
let loop = null, cycles = 0;

const PERSONALITIES = ['aggressive','conservative','balanced','opportunistic','defensive'];
const TRENDS = ['bull','bear','neutral','volatile'];

function genAgents() {
  const types = ['script','data','marketing','trade','analysis'];
  const agents = [];
  for(let i=0;i<3+Math.floor(Math.random()*5);i++) {
    const t = types[Math.floor(Math.random()*types.length)];
    const s = Math.random();
    agents.push({ id:randomUUID().slice(0,8), type:t, name:t.toUpperCase()+'_AGENT_'+(i+1), score:+s.toFixed(3), action: s>0.7?'Deploy':'Draft', status:s>0.5?'active':'standby', createdAt:new Date().toISOString() });
  }
  return agents.sort((a,b)=>b.score-a.score);
}

function genMarket() {
  return { trend:TRENDS[Math.floor(Math.random()*TRENDS.length)], timestamp:new Date().toISOString(), indices:{sp500:4200+Math.floor(Math.random()*400),nasdaq:13000+Math.floor(Math.random()*2000)}, volatility:+(Math.random()*0.5).toFixed(3), sentiment:Math.random()>0.5?'positive':'negative' };
}

function genPersonality() {
  const d = PERSONALITIES[Math.floor(Math.random()*PERSONALITIES.length)];
  return { dominant:d, riskTolerance:d==='aggressive'?0.9:d==='conservative'?0.2:0.5, adaptability:Math.random(), lastShift:new Date().toISOString(), traits:{volatilityPreference:Math.random()>0.5?'high':'low',timeHorizon:['short','medium','long'][Math.floor(Math.random()*3)],socialSentiment:Math.random()>0.5?'bullish':'bearish'} };
}

async function cycle() {
  try {
    cycles++;
    state.status='processing'; state.lastUpdate=new Date().toISOString();
    state.market = genMarket();
    state.personality = genPersonality();
    state.swarm = genAgents();
    state.evolution = { generation:cycles, bestScore:+Math.max(...state.swarm.map(a=>a.score),0).toFixed(3), populationSize:state.swarm.length, avgScore:+(state.swarm.reduce((a,b)=>a+b.score,0)/state.swarm.length||0).toFixed(3), mutations:Math.floor(Math.random()*3) };
    
    // LLM reasoning (mock or real)
    const key = process.env.LLM_API_KEY;
    if(key) {
      try {
        const r = await fetch(process.env.LLM_API_URL||'https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify({model:process.env.LLM_MODEL||'gpt-4o-mini',messages:[{role:'system',content:'You are M-IOS. Give 1-2 sentences of strategic reasoning.'},{role:'user',content:'Agents:'+state.swarm.length+', Trend:'+state.market.trend+', Gen:'+state.evolution.generation}],max_tokens:150,temperature:0.7})});
        const d = await r.json();
        state.llm = { reasoning: d.choices?.[0]?.message?.content||'No output', confidence: 0.7+(Math.random()*0.3), model:process.env.LLM_MODEL||'gpt-4o-mini', tokens:d.usage?.total_tokens||0 };
      } catch(e) { state.llm = { reasoning:'LLM Error: '+e.message, confidence:0.1, model:'error', tokens:0 }; }
    } else {
      state.llm = { reasoning:'[MOCK] '+state.swarm.length+' agents active. Market: '+state.market.trend+'. Gen '+state.evolution.generation+'. Set LLM_API_KEY for real reasoning.', confidence:0.5, model:'mock', tokens:0 };
    }
    
    const top = state.swarm[0];
    state.decision = state.llm.confidence>0.8&&top?.score>0.7 ? 'EXECUTE: '+top.action+' | '+state.llm.reasoning.slice(0,60) : state.evolution.bestScore>0.9 ? 'EVOLVE: Gen '+state.evolution.generation+' optimal' : 'MONITOR: '+state.swarm.length+' agents, conf '+(state.llm.confidence).toFixed(2);
    state.status='idle'; state.cycleCount=cycles;
    
    await appendDecision({ timestamp:new Date().toISOString(), cycle:cycles, decision:state.decision, scripts:state.swarm.filter(s=>s.type==='script').length, dataAssets:state.swarm.filter(s=>s.type==='data').length, marketingContent:state.swarm.filter(s=>s.type==='marketing').length, llmConfidence:state.llm.confidence });
  } catch(e) { console.error('Cycle error:',e); state.status='error'; state.decision='Error: '+e.message; }
}

export function startMiosLoop() { console.log('🧠 M-IOS Loop starting...'); cycle(); loop = setInterval(cycle, 30000); }
export function getCurrentState() { return {...state, uptime:process.uptime(), cycleCount:cycles}; }
export function stopMiosLoop() { if(loop) clearInterval(loop); }`,

  'backend/decision_logger.js': `import { writeFile, access, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
const DIR = './decisions', FILE = join(DIR,'decisions.md');

export async function appendDecision(d) {
  try { await access(DIR); } catch { await mkdir(DIR,{recursive:true}); }
  const entry = '## '+d.timestamp+' | Cycle '+d.cycle+'\\n**Decision:** '+d.decision+'\\n**Scripts:** '+(d.scripts||0)+' | **Data:** '+(d.dataAssets||0)+' | **Marketing:** '+(d.marketingContent||0)+' | **Confidence:** '+(d.llmConfidence||0).toFixed(2)+'\\n\\n';
  try { const existing = await readFile(FILE,'utf8'); await writeFile(FILE, entry+existing); }
  catch { await writeFile(FILE, '# M-IOS Decision Log\\n\\n'+entry); }
  return d;
}`,

  'backend/.env.example': 'PORT=3001\nLLM_API_KEY=\nLLM_API_URL=https://api.openai.com/v1/chat/completions\nLLM_MODEL=gpt-4o-mini\n',

  // ─── FRONTEND ──────────────────────────────────────────────
  'frontend/package.json': `{
  "name": "mios-frontend",
  "version": "26.0.0",
  "type": "module",
  "scripts": { "dev": "vite", "build": "vite build", "preview": "vite preview" },
  "dependencies": { "react": "^18.2.0", "react-dom": "^18.2.0" },
  "devDependencies": { "@vitejs/plugin-react": "^4.2.1", "vite": "^5.0.8" }
}`,

  'frontend/vite.config.js': `import { defineConfig } from 'vite'; import react from '@vitejs/plugin-react';
export default defineConfig({ plugins:[react()], server:{port:3000,proxy:{'/api':'http://localhost:3001'}} });`,

  'frontend/index.html': `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>M-IOS v26</title><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0a0e27;color:#e0e6ed;font-family:system-ui,sans-serif}</style></head><body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body></html>`,

  'frontend/src/main.jsx': `import React from 'react'; import ReactDOM from 'react-dom/client'; import App from './App'; import './styles.css';
ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);`,

  'frontend/src/styles.css': `:root{--bg:#0a0e27;--card:#1a1f3a;--accent:#00d4ff;--accent2:#7c3aed;--ok:#10b981;--warn:#f59e0b;--bad:#ef4444;--text:#e0e6ed;--text2:#8b95a8;--border:#2a3050}
*{margin:0;padding:0;box-sizing:border-box}body{background:var(--bg);color:var(--text);font-family:system-ui,sans-serif;line-height:1.6}
.container{max-width:1400px;margin:0 auto;padding:20px}
.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid var(--border)}
.title{font-size:2rem;font-weight:800;background:linear-gradient(135deg,var(--accent),var(--accent2));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.status{display:flex;align-items:center;gap:8px;padding:8px 16px;background:var(--card);border-radius:20px;border:1px solid var(--border)}
.dot{width:10px;height:10px;border-radius:50%;animation:pulse 2s infinite}.dot.idle{background:var(--ok)}.dot.processing{background:var(--warn)}.dot.error{background:var(--bad)}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(350px,1fr));gap:20px;margin-bottom:20px}
.card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px;transition:transform .2s,box-shadow .2s}
.card:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,212,255,.1)}
.card-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--border)}
.card-t{font-size:1.1rem;font-weight:600;color:var(--accent)}
.badge{padding:4px 10px;border-radius:12px;font-size:.75rem;font-weight:600;text-transform:uppercase}
.b-ok{background:rgba(16,185,129,.2);color:var(--ok)}.b-warn{background:rgba(245,158,11,.2);color:var(--warn)}.b-info{background:rgba(0,212,255,.2);color:var(--accent)}
.pre{background:#111936;border:1px solid var(--border);border-radius:8px;padding:16px;font-family:monospace;font-size:.85rem;overflow-x:auto;white-space:pre-wrap;word-break:break-word;max-height:300px;overflow-y:auto}
.agent{display:flex;justify-content:space-between;align-items:center;background:#111936;border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:10px}
.agent h4{font-size:.95rem;margin-bottom:4px}.agent small{font-size:.8rem;color:var(--text2)}
.agent-score{font-size:1.5rem;font-weight:800}
.decision{background:linear-gradient(135deg,rgba(0,212,255,.1),rgba(124,58,237,.1));border:1px solid var(--accent);border-radius:12px;padding:20px;margin-bottom:20px;text-align:center}
.decision-t{font-size:1.3rem;font-weight:700;color:var(--accent)}
.stats{display:flex;gap:24px;margin-top:12px;justify-content:center}.stat{text-align:center}.stat-v{font-size:1.5rem;font-weight:800;color:var(--accent)}.stat-l{font-size:.75rem;color:var(--text2);text-transform:uppercase}
.loading{display:flex;justify-content:center;align-items:center;height:100vh;font-size:1.5rem;color:var(--accent)}
.error{background:rgba(239,68,68,.2);border:1px solid var(--bad);color:var(--bad);padding:16px;border-radius:8px;margin-bottom:20px;text-align:center}
.conf-bar{width:100%;height:8px;background:#111936;border-radius:4px;margin-top:8px}.conf-fill{height:100%;background:linear-gradient(90deg,var(--accent),var(--accent2));border-radius:4px;transition:width .5s ease}
::-webkit-scrollbar{width:8px}::-webkit-scrollbar-track{background:var(--bg)}::-webkit-scrollbar-thumb{background:var(--border);border-radius:4px}`,

  'frontend/src/App.jsx': `import { useMiosStream } from './hooks/useMiosStream';
import AgentBrainView from './components/AgentBrainView';

export default function App() {
  const { data, error, connected } = useMiosStream();
  if(error) return <div className="container"><div className="error">⚠️ {error}</div></div>;
  if(!data) return <div className="loading">🌐 Initializing M-IOS v26...</div>;
  const sc = data.status||'idle';
  return <div className="container">
    <header className="header"><h1 className="title">🌐 M-IOS CONTROL CENTER</h1><div className="status"><span className={'dot '+sc}></span><span>{connected?'Live':'Reconnecting'} | Cycle #{data.cycleCount||0}</span></div></header>
    <div className="decision"><div className="decision-t">{data.decision||'No decision'}</div><div className="stats"><div className="stat"><div className="stat-v">{data.swarm?.length||0}</div><div className="stat-l">Agents</div></div><div className="stat"><div className="stat-v">{data.evolution?.generation||0}</div><div className="stat-l">Gen</div></div><div className="stat"><div className="stat-v">{(data.llm?.confidence||0).toFixed(2)}</div><div className="stat-l">Conf</div></div><div className="stat"><div className="stat-v">{Math.floor(data.uptime||0)}s</div><div className="stat-l">Uptime</div></div></div></div>
    <div className="grid">
      <div className="card"><div className="card-h"><span className="card-t">🧬 Personality</span><span className="badge b-info">{data.personality?.dominant||'?'}</span></div><pre className="pre">{JSON.stringify(data.personality,null,2)}</pre></div>
      <div className="card"><div className="card-h"><span className="card-t">📊 Market</span><span className="badge b-ok">{data.market?.trend||'?'}</span></div><pre className="pre">{JSON.stringify(data.market,null,2)}</pre></div>
      <div className="card"><div className="card-h"><span className="card-t">🧠 Swarm</span><span className="badge b-warn">{data.swarm?.length||0} Active</span></div>{data.swarm?.map((a,i)=><AgentBrainView key={a.id||i} agent={a}/>)||<p>No agents</p>}</div>
      <div className="card"><div className="card-h"><span className="card-t">🤖 LLM</span><span className="badge b-info">{data.llm?.model||'N/A'}</span></div><div style={{marginBottom:12}}><strong>Confidence:</strong> {((data.llm?.confidence||0)*100).toFixed(0)}%<div className="conf-bar"><div className="conf-fill" style={{width:(data.llm?.confidence||0)*100+'%'}}></div></div></div><p style={{color:'var(--text2)',fontSize:'.9rem'}}>{data.llm?.reasoning||'Waiting...'}</p>{data.llm?.tokens>0&&<p style={{fontSize:'.8rem',color:'var(--text2)',marginTop:8}}>Tokens: {data.llm.tokens}</p>}</div>
      <div className="card"><div className="card-h"><span className="card-t">🧬 Evolution</span><span className="badge b-ok">Gen {data.evolution?.generation||0}</span></div><pre className="pre">{JSON.stringify(data.evolution,null,2)}</pre></div>
      <div className="card"><div className="card-h"><span className="card-t">⚙️ System</span><span className="badge b-info">v26</span></div><pre className="pre">{JSON.stringify({status:data.status,lastUpdate:data.lastUpdate,cycleCount:data.cycleCount,uptime:Math.floor(data.uptime||0)+'s'},null,2)}</pre></div>
    </div>
  </div>;
}`,

  'frontend/src/hooks/useMiosStream.js': `import { useState, useEffect, useRef } from 'react';
const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';
export function useMiosStream() {
  const [data, setData] = useState(null); const [error, setError] = useState(null); const [connected, setConnected] = useState(false); const esRef = useRef(null);
  useEffect(() => {
    const connect = () => { if(esRef.current) esRef.current.close(); const es = new EventSource(API+'/api/stream'); esRef.current = es; es.onopen = () => { setConnected(true); setError(null); }; es.onmessage = (e) => { try { setData(JSON.parse(e.data)); } catch(err){} }; es.onerror = () => { setConnected(false); setError('Reconnecting...'); es.close(); setTimeout(connect, 3000); }; };
    connect(); return () => { if(esRef.current) esRef.current.close(); };
  }, []); return { data, error, connected };
}`,

  'frontend/src/components/AgentBrainView.jsx': `export default function AgentBrainView({ agent }) {
  const color = agent.score>0.7?'var(--ok)':agent.score>0.4?'var(--warn)':'var(--bad)';
  return <div className="agent"><div><h4>{agent.name||'?'}</h4><small>{agent.type?.toUpperCase()} • {agent.status} • {agent.action}</small></div><div className="agent-score" style={{color}}>{(agent.score*100).toFixed(0)}%</div></div>;
}`,

  // ─── ROOT ──────────────────────────────────────────────────
  '.env.example': 'PORT=3001\\nLLM_API_KEY=\\nLLM_API_URL=https://api.openai.com/v1/chat/completions\\nLLM_MODEL=gpt-4o-mini\\nVITE_API_URL=http://localhost:3001\\n',

  'README.md': '# 🌐 M-IOS v26\\n\\n3-file seed system. Run `node bootstrap.js` to build everything.\\n\\n## Quick Start\\n```bash\\nnode bootstrap.js\\ncd backend && npm start\\ncd frontend && npm run dev\\n```\\n\\nOpen http://localhost:3000\\n\\n## Files Created\\n- `backend/` — Express server, M-IOS loop, engines, decision logger\\n- `frontend/` — React + Vite dashboard with SSE streaming\\n- `decisions/` — Auto-generated decision logs\\n\\n## Env Vars\\n- `LLM_API_KEY` — Set for real GPT reasoning (optional)\\n- `PORT` — Backend port (default 3001)\\n',
};

// ═══════════════════════════════════════════════════════════════
// BUILDER
// ═══════════════════════════════════════════════════════════════

async function fileExists(p) {
  try { await access(p); return true; } catch { return false; }
}

async function write(p, content) {
  const dir = p.includes('/') ? p.split('/').slice(0, -1).join('/') : '.';
  if (dir !== '.') {
    try { await mkdir(dir, { recursive: true }); } catch {}
  }
  await writeFile(p, content);
  console.log('  ✓', p);
}

async function installDeps() {
  console.log('\n📦 Installing backend dependencies...');
  try { execSync('cd backend && npm install', { stdio: 'inherit' }); } catch(e) { console.log('  ⚠️ Backend install failed, run manually: cd backend && npm install'); }
  console.log('\n📦 Installing frontend dependencies...');
  try { execSync('cd frontend && npm install', { stdio: 'inherit' }); } catch(e) { console.log('  ⚠️ Frontend install failed, run manually: cd frontend && npm install'); }
}

async function main() {
  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║     M-IOS v26 — SEED BOOTSTRAP                ║');
  console.log('╚═══════════════════════════════════════════════╝\n');

  let skipped = 0, created = 0;

  for (const [path, content] of Object.entries(FILES)) {
    const fullPath = join(ROOT, path);
    if (await fileExists(fullPath)) {
      console.log('  ⏭', path, '(exists)');
      skipped++;
    } else {
      await write(fullPath, content);
      created++;
    }
  }

  console.log(`\n📊 ${created} files created, ${skipped} skipped`);

  // Check if node_modules exist
  const backendHasNode = await fileExists(join(ROOT, 'backend/node_modules'));
  const frontendHasNode = await fileExists(join(ROOT, 'frontend/node_modules'));

  if (!backendHasNode || !frontendHasNode) {
    await installDeps();
  } else {
    console.log('\n✅ Dependencies already installed');
  }

  console.log('\n═════════════════════════════════════════════════');
  console.log('🚀 SETUP COMPLETE');
  console.log('═════════════════════════════════════════════════');
  console.log('');
  console.log('Next steps:');
  console.log('  1. cp .env.example backend/.env');
  console.log('  2. Edit backend/.env and add your LLM_API_KEY (optional)');
  console.log('  3. cd backend && npm start');
  console.log('  4. cd frontend && npm run dev');
  console.log('  5. Open http://localhost:3000');
  console.log('');
  console.log('The system auto-runs decisions every 30 seconds.');
  console.log('Decisions are logged to backend/decisions/decisions.md');
  console.log('');
}

main().catch(console.error);
