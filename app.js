const logBox = document.getElementById("log");

function log(msg) {
  logBox.innerText += msg + "\n";
}

// Simulates triggering GitHub Actions
function runSwarm() {
  log("🚀 Swarm cycle triggered...");

  const ideas = generateIdeas();

  log("🧠 Generated Ideas:");
  ideas.forEach(i => log("- " + i));

  const scored = scoreIdeas(ideas);

  log("\n📊 Scores:");
  scored.forEach(s => log(`${s.name}: ${s.score}`));

  const best = scored.filter(s => s.score >= 70);

  log("\n🏆 Best Candidates:");
  best.forEach(b => log("✔ " + b.name));

  log("\n📦 Sending to build engine (GitHub Actions)");
}

// ----------------------
// 🧠 IDEA GENERATION
// ----------------------

function generateIdeas() {
  return [
    "Farm Tracker SaaS",
    "Inventory Manager",
    "Finance Dashboard",
    "Simple CRM Tool"
  ];
}

// ----------------------
// 📊 SCORING ENGINE
// ----------------------

function scoreIdeas(ideas) {
  return ideas.map(i => {
    const score =
      (i.includes("Farm") ? 85 : 60) +
      (i.includes("Dashboard") ? 10 : 0);

    return {
      name: i,
      score
    };
  });
}
