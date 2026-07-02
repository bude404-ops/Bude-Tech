import fs from "fs";

function write(path, content) {
  const parts = path.split("/");
  const dir = parts.slice(0, -1).join("/");

  if (dir && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(path, content);
}

// =============================
// BUD-E AUTO SAAS FACTORY
// =============================

const files = {

  "api/server.js": `
import express from "express";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(express.json());

const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

app.post("/command", async (req, res) => {
  await db.from("commands").insert({
    type: req.body.type,
    value: req.body.value,
    status: "queued",
    created_at: Date.now()
  });

  res.json({ ok: true });
});

app.get("/state", async (req, res) => {
  const commands = await db.from("commands").select("*");
  const ideas = await db.from("ideas").select("*");

  res.json({
    commands: commands.data,
    ideas: ideas.data
  });
});

app.listen(3000, () => console.log("API running"));
`,

  "worker/worker.js": `
import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";

const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

async function createRepo(name) {
  if (!GITHUB_TOKEN) return;

  await fetch("https://api.github.com/user/repos", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + GITHUB_TOKEN,
      "User-Agent": "bude",
      Accept: "application/vnd.github+json"
    },
    body: JSON.stringify({ name, private: false })
  });
}

async function loop() {
  const { data: cmds } = await db
    .from("commands")
    .select("*")
    .eq("status", "queued");

  for (const cmd of cmds || []) {

    if (cmd.type === "create_project") {
      await createRepo("bude-" + cmd.value.toLowerCase());
    }

    if (cmd.type === "add_idea") {
      await db.from("ideas").insert({ text: cmd.value });
    }

    await db
      .from("commands")
      .update({ status: "done" })
      .eq("id", cmd.id);
  }
}

setInterval(loop, 5000);
`,

  "dashboard/index.html": `
<!doctype html>
<html>
<body>
<h1>BudE SaaS Dashboard</h1>

<input id="t" placeholder="type">
<input id="v" placeholder="value">
<button onclick="send()">Send</button>

<pre id="out"></pre>

<script>
const API = "http://localhost:3000";

async function send(){
  await fetch(API + "/command", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({
      type: document.getElementById("t").value,
      value: document.getElementById("v").value
    })
  });
}

async function load(){
  const r = await fetch(API + "/state");
  const d = await r.json();
  document.getElementById("out").innerText = JSON.stringify(d,null,2);
}

setInterval(load,3000);
load();
</script>

</body>
</html>
`,

  "db/schema.sql": `
create table commands (
  id uuid primary key default gen_random_uuid(),
  type text,
  value text,
  status text,
  created_at bigint
);

create table ideas (
  id uuid primary key default gen_random_uuid(),
  text text,
  created_at bigint default extract(epoch from now())
);
`,

  "package.json": `
{
  "type": "module",
  "dependencies": {
    "express": "^4.18.2",
    "@supabase/supabase-js": "^2.0.0",
    "node-fetch": "^3.3.2"
  }
}
`
};

// write everything
for (const [path, content] of Object.entries(files)) {
  write(path, content);
}

console.log("BudE SaaS factory generated complete system");
