import { CONFIG } from "./config.js";

async function sendMessage(text) {
  await fetch(`https://api.telegram.org/bot${CONFIG.TELEGRAM_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CONFIG.CHAT_ID,
      text
    })
  });
}

async function triggerGitHub(event) {
  await fetch(`https://api.github.com/repos/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}/dispatches`, {
    method: "POST",
    headers: {
      "Authorization": `token ${CONFIG.GITHUB_TOKEN}`,
      "Accept": "application/vnd.github+json"
    },
    body: JSON.stringify({
      event_type: event
    })
  });
}

export async function handleCommand(cmd) {

  cmd = cmd.toLowerCase();

  if (cmd === "generate") {
    await sendMessage("🚀 Generating SaaS factory...");
    await triggerGitHub("generate-saas");
  }

  if (cmd === "deploy") {
    await sendMessage("🌐 Deploying system...");
    await triggerGitHub("deploy");
  }

  if (cmd === "status") {
    await sendMessage("🧠 BudE Tech V14 online.");
  }

  if (cmd.startsWith("build ")) {
    const name = cmd.replace("build ", "");
    await sendMessage(`🏗 Building: ${name}`);
    await triggerGitHub("build-custom");
  }
}
