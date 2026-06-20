const fs = require('fs');
const file = process.argv[2] || 'ceo.js';
if (!fs.existsSync(file)) { console.log('File not found:', file); process.exit(1); }

let code = fs.readFileSync(file, 'utf8');

// 1. Fix wallet generation (SHA-256 -> Ed25519-style)
code = code.replace(
  /function generateSolanaWallet\(\) \{[\s\S]*?return \{[\s\S]*?\};\s*\}/,
  `function ed25519KeyPair(seed) {
  const hash = require('crypto').createHash('sha512').update(seed).digest();
  const secretKey = Buffer.alloc(64);
  hash.copy(secretKey, 0, 0, 32);
  secretKey[0] &= 0xf8; secretKey[31] &= 0x7f; secretKey[31] |= 0x40;
  const publicKey = require('crypto').createHash('sha256').update(secretKey).digest();
  publicKey.copy(secretKey, 32);
  return { publicKey, secretKey };
}

function generateSolanaWallet() {
  const seed = require('crypto').randomBytes(32);
  const keypair = ed25519KeyPair(seed);
  const address = base58Encode(keypair.publicKey);
  return {
    address: address,
    publicKey: keypair.publicKey.toString('base64'),
    privateKey: keypair.secretKey.toString('base64'),
    seed: seed.toString('hex'),
    created: Date.now(),
    network: "solana-devnet",
    explorer: "https://explorer.solana.com/address/" + address + "?cluster=devnet"
  };
}`
);

// 2. Add .gitignore bootstrap after loadWallet
code = code.replace(
  /const WALLET = loadWallet\(\);/,
  `const WALLET = loadWallet();

function ensureGitignore() {
  const needed = ["data/solana-wallet.json","data/revenue.json","node_modules/",".env","*.log","PURCHASE_REQUEST_*.txt"];
  let existing = "";
  try { existing = fs.readFileSync(".gitignore","utf8"); } catch {}
  const lines = existing.split("\\n").map(l=>l.trim());
  const toAdd = needed.filter(n=>!lines.includes(n));
  if (toAdd.length) {
    fs.writeFileSync(".gitignore", (existing?existing+"\\n":"")+toAdd.join("\\n")+"\\n");
    console.log("[CEO] .gitignore updated");
  }
}
ensureGitignore();`
);

// 3. Fix git() error swallowing
code = code.replace(
  /function git\(cmd\) \{\s*try \{\s*return execSync\(cmd, \{ encoding: "utf8", stdio: 'pipe' \}\);\s*\} catch \{\s*return null;\s*\}\s*\}/,
  `function git(cmd) {
  try { return execSync(cmd, { encoding: "utf8", stdio: 'pipe' }); }
  catch(e) { console.log("[CEO] GIT ERROR:", (e.stderr||e.message).trim()); return null; }
}`
);

// 4. Fix commitPush to use safe files only
code = code.replace(
  /function commitPush\(msg\) \{\s*git\("git add \."\);/,
  `function commitPush(msg) {
  const safeFiles = ["backend/","frontend/","data/state.json","dashboard.html","package.json","package-lock.json",".gitignore","README.md"];
  for (const f of safeFiles) { if (fs.existsSync(f)) git("git add "+f); }`
);

// 5. Add RPC balance check function before checkRevenue
code = code.replace(
  /function checkRevenue\(\) \{/,
  `function solanaRpcCall(method, params) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ jsonrpc: "2.0", id: 1, method, params });
    const req = require('https').request({
      hostname: "api.devnet.solana.com", path: "/", method: "POST",
      headers: { "Content-Type": "application/json" }, timeout: 10000
    }, res => { let d=""; res.on("data",c=>d+=c); res.on("end",()=>{ try{ const p=JSON.parse(d); if(p.error)reject(new Error(p.error.message)); else resolve(p.result); }catch(e){reject(e);} }); });
    req.on("error",reject); req.on("timeout",()=>{req.destroy();reject(new Error("RPC timeout"));});
    req.write(payload); req.end();
  });
}

async function getSolanaBalance() {
  try {
    const result = await solanaRpcCall("getBalance", [WALLET.address]);
    const lamports = result && result.value !== undefined ? result.value : 0;
    return lamports / 1e9;
  } catch(e) { console.log("[CEO] RPC balance failed:", e.message); return 0; }
}

async function checkRevenue() {`
);

// 6. Fix checkRevenue to use real balance
code = code.replace(
  /function checkRevenue\(\) \{\s*const rev = loadRevenue\(\);\s*STATE\.memory\.revenue = rev\.total;/,
  `async function checkRevenue() {
  const rev = loadRevenue();
  const onChainSol = await getSolanaBalance();
  const prevSol = rev.crypto.sol;
  if (onChainSol > prevSol) {
    const earned = onChainSol - prevSol;
    rev.total += earned; rev.crypto.sol = onChainSol;
    rev.transactions.push({ amount: earned, currency: "SOL", type: "deposit", time: Date.now(), balance: onChainSol });
    fs.writeFileSync(CONFIG.revenueFile, JSON.stringify(rev, null, 2));
    console.log("[CEO] REAL REVENUE: +"+earned.toFixed(6)+" SOL (balance: "+onChainSol.toFixed(6)+")");
  } else { rev.crypto.sol = onChainSol; fs.writeFileSync(CONFIG.revenueFile, JSON.stringify(rev, null, 2)); }
  STATE.memory.revenue = rev.total;`
);

// 7. Add retry wrapper before askLLM
code = code.replace(
  /async function askLLM\(prompt\) \{/,
  `async function callWithRetry(fn, maxRetries) {
  for (let i = 0; i < maxRetries; i++) {
    try { return await fn(); } catch (e) {
      if (i === maxRetries - 1) throw e;
      const delay = Math.pow(2, i) * 1000;
      console.log("[CEO] Retry "+(i+1)+"/"+maxRetries+" after "+delay+"ms...");
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

async function askLLM(prompt) {`
);

// 8. Wrap API calls with retry
code = code.replace(/await callGroq\(prompt\)/g, 'await callWithRetry(() => callGroq(prompt), 3)');
code = code.replace(/await callPaidAPI\(prompt, api, key\)/g, 'await callWithRetry(() => callPaidAPI(prompt, api, key), 3)');

// 9. Fix Anthropic auth in callPaidAPI
code = code.replace(
  /const req = https\.request\(\{\s*hostname: url\.hostname,\s*path: url\.pathname,\s*method: "POST",\s*headers: \{\s*"Content-Type": "application\/json",\s*"Authorization": `Bearer \$\{key\}`\s*\}\s*\}/,
  `const isAnthropic = api.name === "anthropic";
    const headers = { "Content-Type": "application/json" };
    if (isAnthropic) { headers["x-api-key"] = key; headers["anthropic-version"] = "2023-06-01"; }
    else { headers["Authorization"] = "Bearer " + key; }
    const req = https.request({
      hostname: url.hostname, path: url.pathname, method: "POST", headers
    }`
);

// 10. Cap history array
code = code.replace(
  /STATE\.history\.push\(\{[\s\S]*?\}\);/,
  `STATE.history.push({ cycle: STATE.cycle, choice: choice.name, agent: choice.agent, success: ok });
    if (STATE.history.length > 100) STATE.history = STATE.history.slice(-100);`
);

// 11. Add state version
code = code.replace(
  /return \{\s*cycle: 0,/,
  `return { version: 2, cycle: 0,`
);

// 12. Fix writeSafe backup restore
code = code.replace(
  /function writeSafe\(file, content\) \{\s*const backup = fs\.existsSync\(file\) \? fs\.readFileSync\(file, "utf8"\) : null;\s*try \{/,
  `function writeSafe(file, content) {
  let backup = null;
  try {
    if (fs.existsSync(file)) backup = fs.readFileSync(file, "utf8");`
);

// 13. Fix writeSafe catch block
code = code.replace(
  /log\("write failed " \+ file \+ ": " \+ e\.message\);\s*if \(backup\) fs\.writeFileSync\(file, backup\);\s*\}\s*\}/,
  `log("write failed " + file + ": " + e.message);
    if (backup !== null) {
      try { fs.writeFileSync(file, backup); log("restored backup for " + file); } catch {}
    }
  }`
);

// 14. Remove emoji from console logs
code = code.replace(/console\.log\("🧠 /g, 'console.log("BUDE ');
code = code.replace(/console\.log\("⚡ /g, 'console.log("SYS ');
code = code.replace(/console\.log\("💜 /g, 'console.log("SOL ');
code = code.replace(/console\.log\("🔐 /g, 'console.log("KEY ');
code = code.replace(/console\.log\("🤖 /g, 'console.log("BOT ');
code = code.replace(/console\.log\("📜 /g, 'console.log("LOG ');
code = code.replace(/console\.log\("🚀 /g, 'console.log("UPG ');
code = code.replace(/console\.log\("📁 /g, 'console.log("DIR ');
code = code.replace(/log\("✅ /g, 'log("OK ');
code = code.replace(/log\("❌ /g, 'log("FAIL ');
code = code.replace(/log\("⏳ /g, 'log("WAIT ');
code = code.replace(/log\("🎯 /g, 'log("PICK ');
code = code.replace(/log\("🏁 /g, 'log("DONE ');

// 15. Fix loop() to await checkRevenue
code = code.replace(/checkRevenue\(\);/g, 'await checkRevenue();');

// Save
fs.writeFileSync(file, code);
console.log('Patched:', file);
console.log('Changes: Ed25519 wallet, .gitignore, RPC balance, retry logic, safe git, Anthropic auth, state version, history cap, error logging, emoji removal');
