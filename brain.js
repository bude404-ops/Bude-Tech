#!/usr/bin/env node

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const https = require("https");

const CONFIG = {
  useAI: true,
  aiEndpoint: process.env.AI_ENDPOINT || "",
  aiKey: process.env.AI_KEY || "",
  githubToken: process.env.GITHUB_TOKEN || "",
  repo: process.env.GITHUB_REPO || ""
};

const STATE_FILE = "data/state.json";

let STATE = {
  tasks: [],
  logs: [],
  lastRun: null,
  buildPhase: "idle" // idle | bootstrapped | planned | core | frontend | done
};

function log(msg) {
  console.log(`[CEO] ${msg}`);
  STATE.logs.push({ t: Date.now(), msg });
}

function saveState() {
  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(STATE, null, 2));
}

// Clean up done/failed tasks so state doesn't bloat
function clearCompleted() {
  const before = STATE.tasks.length;
  STATE.tasks = STATE.tasks.filter(t => t.status === "pending");
  const cleared = before - STATE.tasks.length;
  if (cleared > 0) log(`Cleared ${cleared} completed/failed tasks`);
}

async function askAI(prompt) {
  if (!CONFIG.aiEndpoint) {
    return `// AI OFFLINE MODE\n// Task: ${prompt}\nmodule.exports = {};`;
  }
  const payload = JSON.stringify({ prompt });
  return new Promise((resolve, reject) => {
    const req = https.request(CONFIG.aiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${CONFIG.aiKey}`
      }
    }, res => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(data));
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

class TaskEngine {
  add(task) {
    STATE.tasks.push({
      id: crypto.randomUUID(),
      status: "pending",
      created: Date.now(),
      ...task
    });
  }

  async run() {
    const pending = STATE.tasks.filter(t => t.status === "pending");

    for (const task of pending) {
      log(`Executing: ${task.type} (${task.path || task.goal || ""})`);

      try {
        if (task.type === "plan_project") {
          const plan = await askAI("Create file structure + modules for: " + task.goal);
          fs.mkdirSync("core", { recursive: true });
          fs.writeFileSync("core/plan.txt", plan);
          STATE.buildPhase = "planned";
        }

        if (task.type === "generate_file") {
          fs.mkdirSync(path.dirname(task.path), { recursive: true });
          fs.writeFileSync(task.path, task.content);
        }

        if (task.type === "generate_code_ai") {
          const code = await askAI("Write production Node.js module: " + task.spec);
          fs.mkdirSync(path.dirname(task.path), { recursive: true });
          fs.writeFileSync(task.path, code);
        }

        if (task.type === "create_folder") {
          fs.mkdirSync(task.path, { recursive: true });
        }

        task.status = "done";
      } catch (e) {
        task.status = "failed";
        task.error = e.message;
        log(`FAILED: ${task.type} — ${e.message}`);
      }
    }

    saveState();
  }
}

const ENGINE = new TaskEngine();

function bootstrap() {
  log("Bootstrapping AI CEO v8...");

  ["core", "backend", "frontend", "data"].forEach(f => fs.mkdirSync(f, { recursive: true }));

  ENGINE.add({
    type: "generate_file",
    path: "frontend/index.html",
    content: `<!DOCTYPE html>
<html>
<head><title>BUDE AI FACTORY</title></head>
<body><h1>BUDE AI FACTORY ONLINE</h1></body>
</html>`
  });

  ENGINE.add({
    type: "plan_project",
    goal: "Build a farm management SaaS with offline-first mobile UI and finance tracking"
  });

  STATE.buildPhase = "bootstrapped";
}

// The actual build pipeline — each phase queues the next
async function buildPipeline() {
  while (STATE.buildPhase !== "done") {
    STATE.lastRun = new Date().toISOString();

    const pendingCount = STATE.tasks.filter(t => t.status === "pending").length;

    // Only advance phase when current work is clear
    if (pendingCount === 0) {
      switch (STATE.buildPhase) {
        case "idle":
          bootstrap();
          break;

        case "planned":
          // Core backend modules
          ENGINE.add({
            type: "generate_code_ai",
            path: "backend/server.js",
            spec: "Express server with routes for farms, crops, and finance. Include error handling and logging middleware."
          });
          ENGINE.add({
            type: "generate_code_ai",
            path: "backend/models/farm.js",
            spec: "Mongoose schema for Farm with fields: name, location, owner, crops[], createdAt."
          });
          ENGINE.add({
            type: "generate_code_ai",
            path: "backend/routes/finance.js",
            spec: "REST API routes for income/expense tracking with validation."
          });
          STATE.buildPhase = "core";
          break;

        case "core":
          // Frontend modules
          ENGINE.add({
            type: "generate_code_ai",
            path: "frontend/app.js",
            spec: "Vanilla JS SPA with service worker for offline-first. Router, farm list view, finance dashboard."
          });
          ENGINE.add({
            type: "generate_code_ai",
            path: "frontend/sw.js",
            spec: "Service worker that caches static assets and API responses for offline use."
          });
          ENGINE.add({
            type: "generate_file",
            path: "frontend/style.css",
            content: "/* Mobile-first responsive styles */\\nbody{font-family:sans-serif;margin:0;padding:1rem;}\\n.card{background:#fff;border-radius:8px;padding:1rem;margin-bottom:1rem;box-shadow:0 2px 4px rgba(0,0,0,0.1);}"
          });
          STATE.buildPhase = "frontend";
          break;

        case "frontend":
          // Final package and config
          ENGINE.add({
            type: "generate_file",
            path: "package.json",
            content: JSON.stringify({
              name: "bude-farm-saas",
              version: "1.0.0",
              main: "backend/server.js",
              scripts: { start: "node backend/server.js", dev: "nodemon backend/server.js" },
              dependencies: { express: "^4.18.0", mongoose: "^7.0.0", dotenv: "^16.0.0" }
            }, null, 2)
          });
          ENGINE.add({
            type: "generate_file",
            path: ".env.example",
            content: "PORT=3000\\nMONGODB_URI=mongodb://localhost:27017/bude\\nAI_ENDPOINT=\\nAI_KEY="
          });
          STATE.buildPhase = "done";
          break;

        case "done":
          // Exit loop
          break;
      }
    }

    await ENGINE.run();
    clearCompleted();
    saveState();

    if (STATE.buildPhase === "done") {
      log("BUILD COMPLETE. Run: npm install && npm start");
      break;
    }

    await new Promise(r => setTimeout(r, 2000)); // Small delay between phases
  }
}

// Start
buildPipeline();
