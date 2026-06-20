#!/usr/bin/env node

/**
 * BUDE TECH OS v13 — SAAS BOOTSTRAP GENERATOR
 * Creates full Next.js SaaS starter + AI CTO engine + GitHub-ready repo
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const PROJECT = "bude-tech-os-v13";

function run(cmd) {
  console.log("\n> " + cmd);
  execSync(cmd, { stdio: "inherit" });
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

console.log("\n🧠 BUDE TECH OS v13 BOOTSTRAP STARTING...\n");

/**
 * 1. CREATE NEXT APP
 */
if (!fs.existsSync(PROJECT)) {
  run(`npx create-next-app@latest ${PROJECT} --yes`);
}

process.chdir(PROJECT);

/**
 * 2. AI BRAIN ENGINE
 */
fs.mkdirSync("engine", { recursive: true });

write("engine/brain.js", `
export function brain(input, workspace){

  return {
    plan: {
      goal: input,
      steps: [
        "analyze request",
        "design architecture",
        "generate diff",
        "await approval"
      ]
    },

    diff: [
      {
        file: "app/page.tsx",
        content: "<h1>BUDE TECH OS v13 ACTIVE</h1>"
      }
    ],

    requiresApproval: true
  };
}
`);

/**
 * 3. API ROUTE
 */
write("app/api/chat/route.js", `
import { brain } from "@/engine/brain";

export async function POST(req){
  const body = await req.json();
  return Response.json(brain(body.message));
}
`);

/**
 * 4. FRONTEND UI
 */
write("app/page.jsx", `
"use client";

import { useState } from "react";

export default function Page(){

  const [input, setInput] = useState("");
  const [out, setOut] = useState(null);

  async function run(){
    const res = await fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: input })
    });

    setOut(await res.json());
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>🧠 BUDE TECH OS v13</h1>

      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        style={{ width: "100%", padding: 10 }}
      />

      <button onClick={run}>Run Brain</button>

      <pre>{out && JSON.stringify(out, null, 2)}</pre>
    </div>
  );
}
`);

/**
 * 5. BASIC STATE
 */
write("state.json", JSON.stringify({
  projects: [],
  logs: []
}, null, 2));

/**
 * 6. GIT INIT
 */
try {
  run("git init");
  run("git add .");
  run('git commit -m "BUDE TECH OS v13 bootstrap"');
} catch (e) {
  console.log("Git init skipped");
}

/**
 * 7. DONE
 */
console.log("\n✅ BOOTSTRAP COMPLETE\n");

console.log(`
NEXT STEPS:

1. cd ${PROJECT}
2. npm install
3. npm run dev

OPTIONAL:
- Push to GitHub
- Deploy to Vercel
- Add Stripe billing
- Add database (Supabase / Neon)

🧠 BUDE TECH OS READY
`);
