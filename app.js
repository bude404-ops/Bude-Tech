const logBox = document.getElementById("log");
const statusBox = document.getElementById("status");

function log(msg) {
  logBox.innerText += msg + "\n";
}

function setStatus(s) {
  statusBox.innerText = s;
}

// =========================
// 🧠 COMMAND ENGINE
// =========================

function runCommand(cmd) {

  log("CMD > " + cmd);

  cmd = cmd.toLowerCase();

  if (cmd === "generate") {
    setStatus("GENERATING SAAS...");
    log("🚀 SaaS factory triggered");

    simulateBuild("Generated SaaS Project");
  }

  else if (cmd === "deploy") {
    setStatus("DEPLOYING...");
    log("🌐 Deploy process started");

    setTimeout(() => {
      setStatus("DEPLOYED");
      log("✅ Deployment complete (simulated)");
    }, 1500);
  }

  else if (cmd.startsWith("build")) {
    const name = cmd.replace("build", "").trim();
    setStatus("BUILDING " + name);

    log("🏗 Building SaaS: " + name);
    simulateBuild(name);
  }

  else if (cmd === "status") {
    setStatus("ONLINE");
    log("🧠 System operational");
  }

  else {
    log("❌ Unknown command");
  }
}

// =========================
// 🏗 SAAS GENERATOR SIMULATION
// =========================

function simulateBuild(name) {

  log("📦 Creating project: " + name);

  const project = {
    name,
    files: [
      "index.html",
      "app.js",
      "styles.css",
      "config.json"
    ]
  };

  log(JSON.stringify(project, null, 2));

  setTimeout(() => {
    setStatus("READY");
    log("✅ SaaS build complete");
  }, 1200);
}
