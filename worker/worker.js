
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
