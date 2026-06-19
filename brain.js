#!/usr/bin/env node

/**
 * BUDE TECH CEO v10.2 — AUTONOMOUS SWARM CORE
 * Self-healing, auto-resets stale state, keeps building forever
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");
const http = require("http");

/* =========================
   CONFIG
========================= */

const CONFIG = {
  repoUrl: "https://github.com/bude404-ops/Bude-Tech.git",
  port: 3000,
  cycleDelay: 1200,
  maxCycles: 15,
  maxFeatures: 3,
  staleThreshold: 300000  // 5 min — reset if state older than this
};

/* =========================
   STATE — Auto-detects stale/corrupt state
========================= */

const STATE_PATH = "data/state.json";

function freshState() {
  return {
    cycle: 0,
    phase: "init",
    backlog: [],
    completed: [],
    logs: [],
    memory: {
      builtFeatures: {},
      scoreHistory: {}
    },
    started: Date.now()
  };
}

function isStale(state) {
  if (!state || typeof state !== "object") return true;
  if (!state.started) return true;
  const age = Date.now() - state.started;
  if (age > CONFIG.staleThreshold) return true;
  // Detect corrupt/incompatible state structures
  if (!Array.isArray(state.backlog)) return true;
  if (!Array.isArray(state.completed)) return true;
  if (!Array.isArray(state.logs)) return true;
  if (typeof state.memory !== "object") return true;
  return false;
}

function loadState() {
  try {
    const raw = fs.readFileSync(STATE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (isStale(parsed)) {
      console.log("[CEO] Stale state detected — resetting");
      return freshState();
    }
    return parsed;
  } catch {
    return freshState();
  }
}

let STATE = loadState();

function saveState() {
  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(STATE, null, 2));
}

function log(msg) {
  console.log("[CEO]", msg);
  STATE.logs.push({ t: Date.now(), msg });
}

/* =========================
   GIT
========================= */

function git(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8" });
  } catch {
    return null;
  }
}

function gitSetup() {
  if (!fs.existsSync(".git")) {
    git("git init");
    git("git branch -M main");
  }
  if (!git("git remote get-url origin")) {
    git(`git remote add origin ${CONFIG.repoUrl}`);
  }
  git('git config user.email "bot@local"');
  git('git config user.name "CEO BOT"');
}

function commitPush(msg) {
  git("git add .");
  const r = git(`git commit -m "${msg}"`);
  if (!r || r.includes("nothing to commit")) return false;
  git("git push origin main");
  log("pushed");
  return true;
}

/* =========================
   DASHBOARD
========================= */

function dashboard() {
  http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/html" });

    res.end(`
    <html>
    <body style="background:#111;color:#fff;font-family:Arial">
      <h1>BUDE CEO v10.2</h1>
      <p>Phase: ${STATE.phase}</p>
      <p>Cycle: ${STATE.cycle}</p>

      <h3>Backlog</h3>
      <pre>${JSON.stringify(STATE.backlog, null, 2)}</pre>

      <h3>Completed</h3>
      <pre>${JSON.stringify(STATE.completed.slice(-5), null, 2)}</pre>

      <h3>Memory</h3>
      <pre>${JSON.stringify(STATE.memory, null, 2)}</pre>
    </body>
    </html>
    `);
  }).listen(CONFIG.port);

  log("dashboard running http://localhost:" + CONFIG.port);
}

/* =========================
   TEMPLATES — No nested backticks
========================= */

function tplExpress() {
  return [
    "const express = require('express');",
    "const app = express();",
    "",
    "app.get('/', (req, res) => res.json({ ok: true, time: Date.now() }));",
    "app.get('/health', (req, res) => res.json({ status: 'up' }));",
    "",
    "const PORT = process.env.PORT || 3000;",
    "app.listen(PORT, () => console.log('Server on port', PORT));"
  ].join("\n");
}

function tplAuth() {
  return [
    "const crypto = require('crypto');",
    "const users = new Map();",
    "",
    "function hash(p) { return crypto.createHash('sha256').update(p).digest('hex'); }",
    "",
    "module.exports = {",
    "  login: (u, p) => { const user = users.get(u); return user && user.pw === hash(p); },",
    "  register: (u, p) => { if (users.has(u)) return false; users.set(u, { pw: hash(p), created: Date.now() }); return true; }",
    "};"
  ].join("\n");
}

function tplFrontend() {
  return [
    "<!DOCTYPE html>",
    "<html lang=\"en\">",
    "<head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"><title>BUDE</title></head>",
    "<body><h1>BUDE APP</h1><div id=\"status\">Loading...</div><script src=\"app.js\"></script></body>",
    "</html>"
  ].join("\n");
}

function tplAppJS() {
  return [
    "document.addEventListener('DOMContentLoaded', () => {",
    "  const status = document.getElementById('status');",
    "  fetch('/health').then(r => r.json()).then(d => { status.textContent = 'Server: ' + d.status; status.style.color = '#4caf50'; })",
    "    .catch(() => { status.textContent = 'Server: offline'; status.style.color = '#ff9800'; });",
    "});"
  ].join("\n");
}

function tplCSS() {
  return [
    "* { margin: 0; padding: 0; box-sizing: border-box; }",
    "body { font-family: sans-serif; background: #0a0a0a; color: #fff; min-height: 100vh; display: flex; align-items: center; justify-content: center; }",
    "#status { padding: 1rem; background: #1a1a1a; border-radius: 8px; }"
  ].join("\n");
}

function tplSW() {
  return [
    "const CACHE = 'bude-v1';",
    "const URLS = ['/', '/app.js', '/style.css'];",
    "self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(URLS))));",
    "self.addEventListener('fetch', e => e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))));"
  ].join("\n");
}

/* =========================
   FEATURE ENGINE
========================= */

const FEATURE_CATALOG = [
  {
    name: "auth system",
    impact: 9,
    complexity: 6,
    files: {
      "backend/auth.js": tplAuth(),
      "backend/server.js": tplExpress()
    }
  },
  {
    name: "frontend shell",
    impact: 6,
    complexity: 4,
    files: {
      "frontend/index.html": tplFrontend(),
      "frontend/app.js": tplAppJS(),
      "frontend/style.css": tplCSS(),
      "frontend/sw.js": tplSW()
    }
  },
  {
    name: "api core",
    impact: 8,
    complexity: 5,
    files: {
      "backend/server.js": tplExpress()
    }
  }
];

/* =========================
   SCORING ENGINE
========================= */

function score(feature) {
  const memoryPenalty = STATE.memory.builtFeatures[feature.name] ? 5 : 0;
  return feature.impact * 2 - feature.complexity - memoryPenalty;
}

/* =========================
   PLANNER
========================= */

function planner() {
  if (STATE.completed.length >= CONFIG.maxFeatures) {
    log("Built " + STATE.completed.length + " features. Finishing.");
    STATE.phase = "done";
    return;
  }

  const scored = FEATURE_CATALOG
    .map(f => ({ ...f, score: score(f) }))
    .sort((a, b) => b.score - a.score);

  const chosen = scored[0];
  log("selected feature: " + chosen.name + " (score " + chosen.score + ")");

  STATE.backlog.push({
    id: crypto.randomUUID(),
    name: chosen.name,
    impact: chosen.impact,
    complexity: chosen.complexity,
    files: chosen.files,
    status: "pending"
  });

  STATE.phase = "architect";
}

/* =========================
   ARCHITECT
========================= */

function architect() {
  for (const item of STATE.backlog) {
    if (item.status !== "pending") continue;

    item.tasks = Object.entries(item.files).map(([file, content]) => ({
      file,
      content
    }));

    item.status = "built";
  }

  STATE.phase = "builder";
}

/* =========================
   BUILDER
========================= */

function writeFile(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function builder() {
  for (const item of STATE.backlog) {
    if (item.status !== "built") continue;

    for (const t of item.tasks) {
      writeFile(t.file, t.content);
      log("write " + t.file);
    }

    item.status = "qa";
  }

  STATE.phase = "qa";
}

/* =========================
   QA
========================= */

function qa() {
  for (const item of STATE.backlog) {
    if (item.status !== "qa") continue;

    let ok = true;

    for (const t of item.tasks) {
      if (!fs.existsSync(t.file)) {
        ok = false;
        log("MISSING: " + t.file);
      } else {
        const content = fs.readFileSync(t.file, "utf8");
        if (content.length < 10) {
          ok = false;
          log("EMPTY: " + t.file);
        }
      }
    }

    item.status = ok ? "done" : "failed";
  }

  STATE.phase = "devops";
}

/* =========================
   DEVOPS + LEARNING
========================= */

function devops() {
  const done = STATE.backlog.filter(b => b.status === "done");

  for (const f of done) {
    STATE.completed.push(f.name);
    STATE.memory.builtFeatures[f.name] = true;
    STATE.memory.scoreHistory[f.name] = (STATE.memory.scoreHistory[f.name] || 0) + 1;
  }

  if (done.length > 0) {
    commitPush("v10.2 auto build cycle " + STATE.cycle);
  }

  STATE.backlog = STATE.backlog.filter(b => b.status !== "done");

  if (STATE.completed.length >= CONFIG.maxFeatures) {
    STATE.phase = "done";
  } else {
    STATE.phase = "init";
  }
}

/* =========================
   LOOP — Fixed, exits cleanly
========================= */

async function loop() {
  while (STATE.phase !== "done" && STATE.cycle < CONFIG.maxCycles) {
    STATE.cycle++;
    gitSetup();

    log("cycle " + STATE.cycle + " | phase " + STATE.phase);

    switch (STATE.phase) {
      case "init": planner(); break;
      case "architect": architect(); break;
      case "builder": builder(); break;
      case "qa": qa(); break;
      case "devops": devops(); break;
    }

    saveState();

    if (STATE.phase !== "done") {
      await new Promise(r => setTimeout(r, CONFIG.cycleDelay));
    }
  }

  if (STATE.cycle >= CONFIG.maxCycles && STATE.phase !== "done") {
    log("MAX CYCLES REACHED");
    STATE.phase = "done";
  }

  log("BUILD COMPLETE");
  log("Built: " + STATE.completed.join(", "));
  saveState();
}

/* =========================
   START
========================= */

function start() {
  log("Starting BUDE CEO v10.2");
  dashboard();
  loop();
}

start();
