
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
