#!/usr/bin/env node

/**
 * BUDE TECH CEO v14.1 — GOVERNED AGENT CIVILIZATION ENGINE
 * Multi-agent voting + dependency graph + self-healing builds
 * FIXED: Clean exit, port cleanup, stale state reset
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const http = require("http");
const { execSync, spawn } = require("child_process");

/* =========================
   CONFIG
========================= */

const CONFIG = {
  port: 3000,
  testPort: 3999,  // separate port for testing to avoid conflict with dashboard
  cycleDelay: 1200,
  maxCycles: 15,
  minSuccesses: 3  // need 3 successful builds to finish
};

/* =========================
   STATE — Auto-reset stale
========================= */

const STATE_PATH = "data/state.json";

function freshState() {
  return {
    cycle: 0,
    phase: "init",
    goal: "build stable evolving web system",
    graph: {},
    reputation: {
      alpha: 1,
      beta: 1,
      gamma: 1
    },
    history: [],
    logs: [],
    memory: {
      failures: {},
      successes: {}
    },
    started: Date.now()
  };
}

function isStale(state) {
  if (!state || typeof state !== "object") return true;
  if (!state.started) return true;
  if (Date.now() - state.started > 300000) return true;
  if (!Array.isArray(state.history)) return true;
  if (typeof state.reputation !== "object") return true;
  return false;
}

function loadState() {
  try {
    const parsed = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    if (isStale(parsed)) {
      console.log("[CEO] Stale state — resetting");
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
    git("git remote add origin https://github.com/bude404-ops/Bude-Tech.git");
  }
  git('git config user.name "CEO BOT"');
  git('git config user.email "bot@local"');
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

    const successCount = Object.values(STATE.memory.successes).reduce((a, b) => a + b, 0);

    res.end(`
      <html>
      <body style="background:#111;color:#fff;font-family:Arial">
        <h1>BUDE CEO v14.1</h1>
        <p>Cycle: ${STATE.cycle} / ${CONFIG.maxCycles}</p>
        <p>Successes: ${successCount} / ${CONFIG.minSuccesses}</p>
        <p>Goal: ${STATE.goal}</p>

        <h3>Reputation</h3>
        <pre>${JSON.stringify(STATE.reputation, null, 2)}</pre>

        <h3>History</h3>
        <pre>${JSON.stringify(STATE.history.slice(-5), null, 2)}</pre>

        <h3>Memory</h3>
        <pre>${JSON.stringify(STATE.memory, null, 2)}</pre>
      </body>
      </html>
    `);
  }).listen(CONFIG.port);

  log("dashboard http://localhost:" + CONFIG.port);
}

/* =========================
   AGENTS
========================= */

function agentAlpha() {
  return { name: "api expansion", score: 8, agent: "alpha" };
}

function agentBeta() {
  return { name: "frontend upgrade", score: 7, agent: "beta" };
}

function agentGamma() {
  return { name: "system stability hardening", score: 9, agent: "gamma" };
}

/* =========================
   GOVERNANCE
========================= */

function vote(agents) {
  const scored = agents.map(a => {
    const weight = STATE.reputation[a.agent] || 1;
    return {
      ...a,
      final: a.score * weight
    };
  });

  scored.sort((a, b) => b.final - a.final);
  return scored[0];
}

/* =========================
   ARCHITECTURE
========================= */

function buildPlan(choice) {
  const plan = {};

  if (choice.name.includes("api")) {
    plan["backend/server.js"] = [
      "const http = require('http');",
      "",
      "http.createServer((req, res) => {",
      "  res.writeHead(200, { 'Content-Type': 'application/json' });",
      "  res.end(JSON.stringify({ ok: true, version: 'v14.1', time: Date.now() }));",
      "}).listen(process.env.PORT || 3999);",
      "",
      "console.log('API v14.1 running');"
    ].join("\n");
  }

  if (choice.name.includes("frontend")) {
    plan["frontend/index.html"] = [
      "<!DOCTYPE html>",
      "<html lang=\"en\">",
      "<head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"><title>BUDE v14</title></head>",
      "<body><h1>BUDE v14 UI</h1><p>Built by " + choice.agent + "</p></body>",
      "</html>"
    ].join("\n");
  }

  if (choice.name.includes("stability")) {
    plan["backend/health.js"] = [
      "module.exports = () => ({ status: 'OK', uptime: process.uptime() });"
    ].join("\n");
  }

  return plan;
}

/* =========================
   GRAPH
========================= */

function addGraph(file, status) {
  STATE.graph[file] = {
    status,
    version: (STATE.graph[file]?.version || 0) + 1,
    time: Date.now()
  };
}

/* =========================
   SAFE WRITE
========================= */

function writeSafe(file, content) {
  const backup = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;

  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
    addGraph(file, "written");
    log("write " + file);
  } catch (e) {
    log("write failed " + file + ": " + e.message);
    if (backup) fs.writeFileSync(file, backup);
  }
}

/* =========================
   QA — Fixed port conflict
========================= */

function testRuntime() {
  return new Promise((resolve) => {
    let child;
    try {
      // Test on separate port to avoid dashboard conflict
      const env = { ...process.env, PORT: CONFIG.testPort };
      child = spawn("node", ["backend/server.js"], { env, detached: true, stdio: "ignore" });

      setTimeout(() => {
        http.get("http://localhost:" + CONFIG.testPort, (res) => {
          const ok = res.statusCode === 200;
          if (child) process.kill(-child.pid, "SIGTERM");
          resolve(ok);
        }).on("error", () => {
          if (child) process.kill(-child.pid, "SIGTERM");
          resolve(false);
        });
      }, 1000);
    } catch {
      if (child) process.kill(-child.pid, "SIGTERM");
      resolve(false);
    }

    // Kill test server after 3s no matter what
    setTimeout(() => {
      if (child) process.kill(-child.pid, "SIGTERM");
    }, 3000);
  });
}

/* =========================
   LEARNING
========================= */

function learn(choice, success) {
  if (!success) {
    STATE.memory.failures[choice.name] = (STATE.memory.failures[choice.name] || 0) + 1;
    STATE.reputation[choice.agent] *= 0.95;
    log(choice.agent + " reputation down: " + STATE.reputation[choice.agent].toFixed(3));
  } else {
    STATE.memory.successes[choice.name] = (STATE.memory.successes[choice.name] || 0) + 1;
    STATE.reputation[choice.agent] *= 1.01;
    log(choice.agent + " reputation up: " + STATE.reputation[choice.agent].toFixed(3));
  }
}

/* =========================
   LOOP — Fixed exit logic
========================= */

function totalSuccesses() {
  return Object.values(STATE.memory.successes).reduce((a, b) => a + b, 0);
}

async function loop() {
  while (STATE.cycle < CONFIG.maxCycles) {
    STATE.cycle++;
    gitSetup();

    log("cycle " + STATE.cycle);

    // Check if we've built enough successfully
    if (totalSuccesses() >= CONFIG.minSuccesses) {
      log("Minimum successes reached (" + CONFIG.minSuccesses + "). Finishing.");
      break;
    }

    const agents = [agentAlpha(), agentBeta(), agentGamma()];
    const choice = vote(agents);
    log("chosen: " + choice.name + " by " + choice.agent);

    const plan = buildPlan(choice);
    for (const [file, content] of Object.entries(plan)) {
      writeSafe(file, content);
    }

    const ok = await testRuntime();
    learn(choice, ok);

    STATE.history.push({
      cycle: STATE.cycle,
      choice: choice.name,
      agent: choice.agent,
      success: ok
    });

    if (ok) {
      commitPush("v14.1 success cycle " + STATE.cycle);
    } else {
      log("failure — system adapts next cycle");
    }

    saveState();

    if (STATE.cycle < CONFIG.maxCycles && totalSuccesses() < CONFIG.minSuccesses) {
      await new Promise(r => setTimeout(r, CONFIG.cycleDelay));
    }
  }

  log("BUILD COMPLETE");
  log("Total successes: " + totalSuccesses());
  log("Final reputation: " + JSON.stringify(STATE.reputation));
  saveState();
}

/* =========================
   START
========================= */

function start() {
  log("Starting BUDE CEO v14.1");
  dashboard();
  loop();
}

start();
