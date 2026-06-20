const fs = require("fs");
const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * ─────────────────────────────────────────
 * LOAD / SAVE PRODUCT MEMORY (ROADMAP STATE)
 * ─────────────────────────────────────────
 */
function loadMemory() {
  try {
    return JSON.parse(fs.readFileSync("cto-memory.json", "utf8"));
  } catch {
    return {
      roadmap: [],
      backlog: [],
      completed: [],
      decisions: []
    };
  }
}

function saveMemory(m) {
  fs.writeFileSync("cto-memory.json", JSON.stringify(m, null, 2));
}

/**
 * ─────────────────────────────────────────
 * 1. CTO ANALYZER (UNDERSTANDS IDEA → PRODUCT FEATURE)
 * ─────────────────────────────────────────
 */
async function analyzeIdea(issue) {
  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a startup CTO. Convert user ideas into structured product features."
      },
      {
        role: "user",
        content: `Issue: ${issue}`
      }
    ]
  });

  return res.choices[0].message.content;
}

/**
 * ─────────────────────────────────────────
 * 2. ROADMAP PLANNER (PRIORITIZATION ENGINE)
 * ─────────────────────────────────────────
 */
async function roadmapPlanner(feature, memory) {
  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a CTO. Prioritize features into a roadmap with urgency and dependencies."
      },
      {
        role: "user",
        content: JSON.stringify({
          feature,
          roadmap: memory.roadmap
        })
      }
    ]
  });

  return res.choices[0].message.content;
}

/**
 * ─────────────────────────────────────────
 * 3. TASK BREAKDOWN (ENGINEERING TICKETS)
 * ─────────────────────────────────────────
 */
async function taskBreakdown(roadmapItem) {
  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Break features into engineering tasks suitable for a coding agent."
      },
      {
        role: "user",
        content: roadmapItem
      }
    ]
  });

  return res.choices[0].message.content;
}

/**
 * ─────────────────────────────────────────
 * MAIN CTO LOOP
 * ─────────────────────────────────────────
 */
async function run(issue) {
  let memory = loadMemory();

  console.log("ISSUE:", issue);

  // 1. ANALYZE IDEA
  const feature = await analyzeIdea(issue);
  console.log("FEATURE:", feature);

  // 2. UPDATE ROADMAP
  const roadmap = await roadmapPlanner(feature, memory);
  console.log("ROADMAP:", roadmap);

  // 3. BREAK INTO TASKS
  const tasks = await taskBreakdown(roadmap);
  console.log("TASKS:", tasks);

  // 4. STORE IN MEMORY
  memory.roadmap.push({
    feature,
    roadmap,
    tasks,
    time: new Date().toISOString()
  });

  memory.backlog.push(feature);

  saveMemory(memory);

  // 5. EXPORT FOR ENGINE AGENT
  fs.writeFileSync(
    "cto-output.json",
    JSON.stringify({ feature, roadmap, tasks }, null, 2)
  );

  console.log("CTO OUTPUT READY");
}

const issue = process.argv.slice(2).join(" ");
run(issue);
