#!/usr/bin/env python3
"""
BUD-E CEO v26 — Self-Deploying Seed
Run: python seed.py
This file creates the entire Bude-Tech system on first run.
"""

import os, sys, json, sqlite3, subprocess, time, threading, hashlib, random
from datetime import datetime
from pathlib import Path

# =============================
# CONFIG
# =============================
ROOT = Path(__file__).parent
SYSTEM_DIR = ROOT / "system"
DB_PATH = SYSTEM_DIR / "bude.db"
LOG_PATH = SYSTEM_DIR / "bude.log"
REVENUE_PATH = SYSTEM_DIR / "revenue.json"
SELF_ANALYSIS_PATH = SYSTEM_DIR / "self_analysis.json"
EVOLUTION_LOG = SYSTEM_DIR / "evolution.log"

# API Keys (set these in env or the seed will prompt)
GROQ_KEY = os.environ.get("GROQ_API_KEY", "")
OPENROUTER_KEY = os.environ.get("OPENROUTER_API_KEY", "")
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")

# =============================
# BOOTSTRAP: Create directories
# =============================
def bootstrap():
    SYSTEM_DIR.mkdir(exist_ok=True)
    (ROOT / "api").mkdir(exist_ok=True)
    (ROOT / "worker").mkdir(exist_ok=True)
    (ROOT / "db").mkdir(exist_ok=True)
    (ROOT / "dashboard").mkdir(exist_ok=True)
    print("[BOOTSTRAP] Directories created.")

# =============================
# DATABASE
# =============================
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.executescript("""
    CREATE TABLE IF NOT EXISTS commands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT,
        value TEXT,
        status TEXT DEFAULT 'queued',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS ideas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        status TEXT DEFAULT 'building',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS revenue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT,
        amount REAL,
        currency TEXT DEFAULT 'USD',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS builds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file TEXT,
        model TEXT,
        success INTEGER,
        error TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS lessons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lesson TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    """)
    conn.commit()
    conn.close()
    print("[DB] SQLite initialized.")

# =============================
# SELF-AWARENESS ENGINE
# =============================
def load_self_analysis():
    if SELF_ANALYSIS_PATH.exists():
        with open(SELF_ANALYSIS_PATH, "r") as f:
            return json.load(f)
    return {
        "version": "26.0",
        "created": datetime.utcnow().isoformat(),
        "last_updated": datetime.utcnow().isoformat(),
        "lessons_learned": [],
        "model_performance": {},
        "build_patterns": {"successful_builds": [], "failed_builds": [], "common_errors": []},
        "revenue_insights": {"what_worked": [], "what_failed": [], "price_sensitivity": []}
    }

def save_self_analysis(data):
    data["last_updated"] = datetime.utcnow().isoformat()
    with open(SELF_ANALYSIS_PATH, "w") as f:
        json.dump(data, f, indent=2)

def log_evolution(msg):
    with open(EVOLUTION_LOG, "a") as f:
        f.write(f"[{datetime.utcnow().isoformat()}] {msg}\n")
    print(f"[EVOLUTION] {msg}")

def analyze_cycle(model_used, files_created, errors):
    analysis = load_self_analysis()
    if model_used:
        mp = analysis["model_performance"]
        if model_used not in mp:
            mp[model_used] = {"attempts": 0, "successes": 0, "files_created": 0, "errors": 0}
        mp[model_used]["attempts"] += 1
        if files_created:
            mp[model_used]["successes"] += 1
            mp[model_used]["files_created"] += len(files_created)
        if errors:
            mp[model_used]["errors"] += len(errors)
    
    if files_created:
        for f in files_created:
            analysis["build_patterns"]["successful_builds"].append({
                "time": datetime.utcnow().isoformat(), "file": f, "model": model_used
            })
        analysis["build_patterns"]["successful_builds"] = analysis["build_patterns"]["successful_builds"][-50:]
    else:
        analysis["build_patterns"]["failed_builds"].append({
            "time": datetime.utcnow().isoformat(), "model": model_used, "reason": "No files created"
        })
        analysis["build_patterns"]["failed_builds"] = analysis["build_patterns"]["failed_builds"][-20:]
    
    lessons = []
    empty_count = sum(1 for e in analysis["build_patterns"]["common_errors"] if e["type"] == "EMPTY_CYCLE")
    if empty_count > 2:
        lessons.append("Empty cycles detected. Clarify build priorities.")
    
    if lessons:
        analysis["lessons_learned"].append({
            "time": datetime.utcnow().isoformat(), "lesson": " | ".join(lessons)
        })
        analysis["lessons_learned"] = analysis["lessons_learned"][-20:]
        conn = sqlite3.connect(DB_PATH)
        for lesson in lessons:
            conn.execute("INSERT INTO lessons (lesson) VALUES (?)", (lesson,))
        conn.commit()
        conn.close()
    
    save_self_analysis(analysis)
    return analysis

def get_lessons():
    analysis = load_self_analysis()
    lessons = analysis.get("lessons_learned", [])[-5:]
    if not lessons:
        return ""
    return "\nLESSONS FROM PREVIOUS CYCLES:\n" + "\n".join([f"- {l['lesson']}" for l in lessons]) + "\nApply these lessons. Do not repeat past mistakes.\n"

# =============================
# MODEL ROUTER
# =============================
import requests

class ModelRouter:
    def __init__(self):
        self.groq_key = GROQ_KEY
        self.openrouter_key = OPENROUTER_KEY
    
    def route(self, task_type, prompt):
        if task_type == "code":
            return self._groq("llama-3.3-70b-versatile", prompt)
        elif task_type == "reasoning":
            return self._openrouter("anthropic/claude-3.5-sonnet", prompt)
        elif task_type == "fast":
            return self._groq("llama-3.1-8b-instant", prompt)
        elif task_type == "chat":
            return self._groq("gemma2-9b-it", prompt)
        else:
            return self._groq("llama-3.3-70b-versatile", prompt)
    
    def _groq(self, model, prompt):
        if not self.groq_key:
            return "[ERROR] No GROQ_API_KEY set"
        try:
            resp = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {self.groq_key}", "Content-Type": "application/json"},
                json={"model": model, "messages": [{"role": "user", "content": prompt}], "max_tokens": 2048},
                timeout=60
            )
            return resp.json()["choices"][0]["message"]["content"]
        except Exception as e:
            return f"[ERROR] Groq failed: {e}"
    
    def _openrouter(self, model, prompt):
        if not self.openrouter_key:
            return "[ERROR] No OPENROUTER_API_KEY set"
        try:
            resp = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={"Authorization": f"Bearer {self.openrouter_key}", "HTTP-Referer": "https://bude.ai", "Content-Type": "application/json"},
                json={"model": model, "messages": [{"role": "user", "content": prompt}]},
                timeout=60
            )
            return resp.json()["choices"][0]["message"]["content"]
        except Exception as e:
            return f"[ERROR] OpenRouter failed: {e}"

router = ModelRouter()

# =============================
# MARKET DATA
# =============================
def get_sol_price():
    try:
        resp = requests.get("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd", timeout=10)
        return resp.json()["solana"]["usd"]
    except:
        return None

def get_trending_coins():
    try:
        resp = requests.get("https://api.coingecko.com/api/v3/search/trending", timeout=10)
        return [coin["item"]["symbol"] for coin in resp.json()["coins"][:5]]
    except:
        return []

def market_summary():
    return {"sol_price": get_sol_price(), "trending": get_trending_coins(), "timestamp": datetime.utcnow().isoformat()}

# =============================
# REVENUE ENGINE
# =============================
def load_revenue():
    if REVENUE_PATH.exists():
        with open(REVENUE_PATH, "r") as f:
            return json.load(f)
    return {"total_potential": 0, "total_actual": 0, "tools": {}, "history": []}

def save_revenue(data):
    with open(REVENUE_PATH, "w") as f:
        json.dump(data, f, indent=2)

def estimate_tool_revenue(tool_type):
    estimates = {
        "freelance": {"min": 500, "max": 3000, "desc": "AI coding gigs"},
        "crypto_signals": {"min": 0, "max": 1000, "desc": "Subscription signals"},
        "content_generator": {"min": 200, "max": 1500, "desc": "Content creation"},
        "affiliate": {"min": 50, "max": 500, "desc": "Affiliate commissions"},
        "saas": {"min": 1000, "max": 10000, "desc": "Micro-SaaS subscriptions"},
    }
    return estimates.get(tool_type, {"min": 0, "max": 0, "desc": "Unknown"})

def register_tool(tool_name, tool_type):
    rev = load_revenue()
    est = estimate_tool_revenue(tool_type)
    rev["tools"][tool_name] = {
        "type": tool_type, "potential_min": est["min"], "potential_max": est["max"],
        "description": est["desc"], "created": datetime.utcnow().isoformat(), "actual_earnings": 0
    }
    rev["total_potential"] = sum(t["potential_max"] for t in rev["tools"].values())
    rev["history"].append({"time": datetime.utcnow().isoformat(), "event": f"Registered {tool_name}", "potential_added": est["max"]})
    save_revenue(rev)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("INSERT INTO revenue (source, amount) VALUES (?, ?)", (tool_name, est["max"]))
    conn.commit()
    conn.close()
    return rev

def get_revenue_dashboard():
    rev = load_revenue()
    conn = sqlite3.connect(DB_PATH)
    actual = conn.execute("SELECT SUM(amount) FROM revenue").fetchone()[0] or 0
    conn.close()
    return {
        "total_potential_monthly": rev["total_potential"],
        "total_actual": actual,
        "tool_count": len(rev["tools"]),
        "tools": rev["tools"],
        "latest": rev["history"][-3:] if rev["history"] else []
    }

# =============================
# FASTAPI APP
# =============================
try:
    from fastapi import FastAPI, Request
    from fastapi.responses import HTMLResponse, JSONResponse
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.staticfiles import StaticFiles
    import uvicorn
    FASTAPI_AVAILABLE = True
except ImportError:
    FASTAPI_AVAILABLE = False
    print("[WARN] FastAPI not installed. Run: pip install fastapi uvicorn")

app = None
if FASTAPI_AVAILABLE:
    app = FastAPI(title="BudE CEO v26", version="26.0")
    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
    
    @app.post("/command")
    async def command(req: Request):
        data = await req.json()
        conn = sqlite3.connect(DB_PATH)
        conn.execute("INSERT INTO commands (type, value) VALUES (?, ?)", (data.get("type"), data.get("value")))
        conn.commit()
        conn.close()
        log_evolution(f"Command queued: {data.get('type')} = {data.get('value')}")
        return {"ok": True}
    
    @app.get("/state")
    async def state():
        conn = sqlite3.connect(DB_PATH)
        cmds = conn.execute("SELECT * FROM commands ORDER BY id DESC LIMIT 50").fetchall()
        ideas = conn.execute("SELECT * FROM ideas ORDER BY id DESC LIMIT 50").fetchall()
        projects = conn.execute("SELECT * FROM projects ORDER BY id DESC LIMIT 50").fetchall()
        conn.close()
        return {
            "commands": [{"id": r[0], "type": r[1], "value": r[2], "status": r[3], "created_at": r[4]} for r in cmds],
            "ideas": [{"id": r[0], "text": r[1], "created_at": r[2]} for r in ideas],
            "projects": [{"id": r[0], "name": r[1], "status": r[2], "created_at": r[3]} for r in projects],
            "revenue": get_revenue_dashboard(),
            "market": market_summary(),
            "lessons": get_lessons()
        }
    
    @app.post("/chat")
    async def chat(req: Request):
        data = await req.json()
        user_msg = data.get("message", "")
        history = data.get("history", [])
        
        system_prompt = f"""You are BudE, a self-evolving AI operating system.
Repo: bude404-ops/Bude-Tech
You help users control and understand the BudE system.
Be concise, helpful, and technical when needed."""
        
        messages = [{"role": "system", "content": system_prompt}]
        for h in history[-5:]:
            messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})
        messages.append({"role": "user", "content": user_msg})
        
        models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "gemma2-9b-it"]
        for model in models:
            try:
                resp = requests.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {GROQ_KEY}", "Content-Type": "application/json"},
                    json={"model": model, "messages": messages, "temperature": 0.7, "max_tokens": 1024},
                    timeout=30
                )
                result = resp.json()
                content = result["choices"][0]["message"]["content"]
                return {"response": content, "model": model}
            except:
                continue
        return JSONResponse({"error": "All models failed"}, status_code=500)
    
    @app.get("/revenue")
    async def revenue():
        return get_revenue_dashboard()
    
    @app.get("/market")
    async def market():
        return market_summary()
    
    @app.post("/build")
    async def build(req: Request):
        data = await req.json()
        task = data.get("task", "")
        task_type = data.get("type", "code")
        
        lessons = get_lessons()
        prompt = f"{lessons}\n\nBuild this for the BudE system:\n{task}\n\nOutput ONLY the file content. No explanations."
        
        result = router.route(task_type, prompt)
        
        if result.startswith("[ERROR]"):
            analyze_cycle(task_type, [], [result])
            return {"error": result}
        
        filename = data.get("filename", f"api/generated_{int(time.time())}.py")
        filepath = ROOT / filename
        filepath.parent.mkdir(parents=True, exist_ok=True)
        
        with open(filepath, "w") as f:
            f.write(result)
        
        analyze_cycle(task_type, [str(filepath)], [])
        log_evolution(f"Built: {filename}")
        
        return {"ok": True, "file": filename, "content_preview": result[:200]}
    
    @app.get("/", response_class=HTMLResponse)
    async def root():
        dashboard_path = ROOT / "dashboard" / "index.html"
        if dashboard_path.exists():
            with open(dashboard_path, "r") as f:
                return f.read()
        return "<h1>BudE CEO v26</h1><p>Dashboard not found. Run seed.py to build.</p>"

# =============================
# WORKER LOOP (Autonomous)
# =============================
def worker_loop():
    while True:
        try:
            conn = sqlite3.connect(DB_PATH)
            cmds = conn.execute("SELECT * FROM commands WHERE status = 'queued' ORDER BY id LIMIT 10").fetchall()
            
            for cmd in cmds:
                cmd_id, cmd_type, value, status, created_at = cmd
                
                if cmd_type == "create_project":
                    project_name = f"bude-{value.lower().replace(' ', '-')}" if value else f"bude-project-{int(time.time())}"
                    conn.execute("INSERT INTO projects (name) VALUES (?)", (project_name,))
                    log_evolution(f"Project created: {project_name}")
                    
                    if GROQ_KEY:
                        prompt = f"Create a minimal Python module for project '{project_name}' that does: {value}. Output ONLY code."
                        result = router.route("code", prompt)
                        if not result.startswith("[ERROR]"):
                            filepath = ROOT / "api" / f"{project_name}.py"
                            with open(filepath, "w") as f:
                                f.write(result)
                            analyze_cycle("code", [str(filepath)], [])
                            log_evolution(f"Auto-built: {filepath.name}")
                
                elif cmd_type == "add_idea":
                    conn.execute("INSERT INTO ideas (text) VALUES (?)", (value,))
                    log_evolution(f"Idea added: {value}")
                
                elif cmd_type == "build_tool":
                    register_tool(value, "saas")
                    log_evolution(f"Tool registered: {value}")
                
                conn.execute("UPDATE commands SET status = 'done' WHERE id = ?", (cmd_id,))
            
            conn.commit()
            conn.close()
            
            # Autonomous: if idle, generate an idea
            conn = sqlite3.connect(DB_PATH)
            pending = conn.execute("SELECT COUNT(*) FROM commands WHERE status = 'queued'").fetchone()[0]
            conn.close()
            
            if pending == 0 and GROQ_KEY:
                prompt = "Generate ONE short business idea for an AI-powered micro-SaaS. Output ONLY the idea name and one sentence description."
                idea = router.route("fast", prompt)
                if not idea.startswith("[ERROR]"):
                    conn = sqlite3.connect(DB_PATH)
                    conn.execute("INSERT INTO ideas (text) VALUES (?)", (idea,))
                    conn.commit()
                    conn.close()
                    log_evolution(f"Autonomous idea: {idea[:80]}...")
            
        except Exception as e:
            log_evolution(f"[WORKER ERROR] {e}")
        
        time.sleep(10)

# =============================
# DASHBOARD GENERATOR
# =============================
DASHBOARD_HTML = """<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>BudE CEO v26</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:system-ui,-apple-system,sans-serif}
body{background:#0a0a0f;color:#e0e0e0;padding:16px;max-width:900px;margin:0 auto}
h1{color:#00ff88;font-size:1.5rem;margin-bottom:8px}
.sub{color:#888;font-size:0.8rem;margin-bottom:20px}
.card{background:#12121a;border:1px solid #1a1a2e;border-radius:12px;padding:16px;margin-bottom:16px}
.card h2{color:#00ccff;font-size:1rem;margin-bottom:12px;display:flex;align-items:center;gap:8px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media(max-width:600px){.grid{grid-template-columns:1fr}}
.stat{background:#1a1a2e;padding:12px;border-radius:8px;text-align:center}
.stat .num{color:#00ff88;font-size:1.5rem;font-weight:bold}
.stat .label{color:#888;font-size:0.75rem}
input,textarea,select{background:#1a1a2e;border:1px solid #2a2a3e;color:#e0e0e0;padding:10px 12px;border-radius:8px;width:100%;font-size:0.9rem;margin-bottom:8px}
button{background:#00ff88;color:#0a0a0f;border:none;padding:10px 20px;border-radius:8px;font-weight:bold;cursor:pointer;width:100%;font-size:0.9rem}
button:hover{background:#00cc6a}
button.secondary{background:#1a1a2e;color:#00ccff;border:1px solid #2a2a3e}
button.secondary:hover{background:#2a2a3e}
.row{display:flex;gap:8px}
.row input{flex:1}
.pre{background:#0a0a0f;border:1px solid #1a1a2e;border-radius:8px;padding:12px;overflow-x:auto;font-size:0.8rem;max-height:300px;white-space:pre-wrap}
.msg{padding:8px 12px;border-radius:8px;margin-bottom:8px;font-size:0.85rem}
.msg.user{background:#1a1a2e;margin-left:20px}
.msg.ai{background:#0d1f0d;margin-right:20px;border-left:3px solid #00ff88}
.timestamp{color:#555;font-size:0.7rem;margin-top:4px}
.tabs{display:flex;gap:4px;margin-bottom:12px;overflow-x:auto}
.tab{padding:8px 16px;background:#1a1a2e;border-radius:8px;cursor:pointer;font-size:0.85rem;white-space:nowrap}
.tab.active{background:#00ff88;color:#0a0a0f;font-weight:bold}
.hidden{display:none}
.status-dot{width:8px;height:8px;border-radius:50%;display:inline-block}
.status-dot.online{background:#00ff88;box-shadow:0 0 8px #00ff88}
.status-dot.offline{background:#ff4444}
</style>
</head>
<body>
<h1>BudE CEO v26</h1>
<div class="sub">Self-Evolving AI Operating System</div>

<div class="tabs">
<div class="tab active" onclick="showTab('dashboard')">Dashboard</div>
<div class="tab" onclick="showTab('chat')">Chat</div>
<div class="tab" onclick="showTab('commands')">Commands</div>
<div class="tab" onclick="showTab('build')">Build</div>
<div class="tab" onclick="showTab('revenue')">Revenue</div>
</div>

<div id="dashboard" class="tab-content">
<div class="card">
<h2><span class="status-dot online"></span> System Status</h2>
<div class="grid">
<div class="stat"><div class="num" id="cmd-count">0</div><div class="label">Commands</div></div>
<div class="stat"><div class="num" id="idea-count">0</div><div class="label">Ideas</div></div>
<div class="stat"><div class="num" id="project-count">0</div><div class="label">Projects</div></div>
<div class="stat"><div class="num" id="sol-price">--</div><div class="label">SOL Price</div></div>
</div>
</div>
<div class="card">
<h2>Market</h2>
<div id="market-data" class="pre">Loading...</div>
</div>
<div class="card">
<h2>Recent Activity</h2>
<div id="activity-log" class="pre">Loading...</div>
</div>
</div>

<div id="chat" class="tab-content hidden">
<div class="card">
<h2>BudE Chat</h2>
<div id="chat-history" style="max-height:400px;overflow-y:auto;margin-bottom:12px;"></div>
<div class="row">
<input id="chat-input" placeholder="Ask BudE anything..." onkeypress="if(event.key==='Enter')sendChat()">
<button onclick="sendChat()" style="width:auto">Send</button>
</div>
</div>
</div>

<div id="commands" class="tab-content hidden">
<div class="card">
<h2>Queue Command</h2>
<select id="cmd-type">
<option value="create_project">Create Project</option>
<option value="add_idea">Add Idea</option>
<option value="build_tool">Build Tool</option>
<option value="chat">Chat</option>
</select>
<input id="cmd-value" placeholder="Value / Description">
<button onclick="sendCommand()">Queue Command</button>
</div>
<div class="card">
<h2>Command Queue</h2>
<div id="command-list" class="pre">Loading...</div>
</div>
<div class="card">
<h2>Ideas</h2>
<div id="idea-list" class="pre">Loading...</div>
</div>
</div>

<div id="build" class="tab-content hidden">
<div class="card">
<h2>AI Build</h2>
<select id="build-type">
<option value="code">Code</option>
<option value="reasoning">Reasoning</option>
<option value="fast">Fast</option>
<option value="chat">Chat</option>
</select>
<input id="build-task" placeholder="What should BudE build?">
<input id="build-filename" placeholder="Filename (e.g. api/my_tool.py)">
<button onclick="sendBuild()">Build</button>
</div>
<div class="card">
<h2>Build Output</h2>
<div id="build-output" class="pre">Ready to build...</div>
</div>
</div>

<div id="revenue" class="tab-content hidden">
<div class="card">
<h2>Revenue Dashboard</h2>
<div class="grid">
<div class="stat"><div class="num" id="rev-potential">$0</div><div class="label">Potential Monthly</div></div>
<div class="stat"><div class="num" id="rev-actual">$0</div><div class="label">Actual</div></div>
<div class="stat"><div class="num" id="rev-tools">0</div><div class="label">Tools</div></div>
</div>
</div>
<div class="card">
<h2>Register Tool</h2>
<input id="tool-name" placeholder="Tool Name">
<select id="tool-type">
<option value="saas">SaaS</option>
<option value="freelance">Freelance</option>
<option value="crypto_signals">Crypto Signals</option>
<option value="content_generator">Content</option>
<option value="affiliate">Affiliate</option>
</select>
<button onclick="registerTool()">Register</button>
</div>
<div class="card">
<h2>Tool List</h2>
<div id="tool-list" class="pre">Loading...</div>
</div>
</div>

<script>
const API = window.location.origin;

function showTab(id){
  document.querySelectorAll('.tab-content').forEach(e=>e.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
  document.querySelectorAll('.tab').forEach(e=>e.classList.remove('active'));
  event.target.classList.add('active');
}

async function loadState(){
  try{
    const r = await fetch(API+"/state");
    const d = await r.json();
    document.getElementById('cmd-count').textContent = d.commands.length;
    document.getElementById('idea-count').textContent = d.ideas.length;
    document.getElementById('project-count').textContent = d.projects.length;
    document.getElementById('sol-price').textContent = d.market.sol_price ? '$'+d.market.sol_price : '--';
    document.getElementById('market-data').textContent = JSON.stringify(d.market,null,2);
    document.getElementById('command-list').textContent = d.commands.map(c=>'['+c.status+'] '+c.type+': '+c.value).join('\n') || 'No commands';
    document.getElementById('idea-list').textContent = d.ideas.map(i=>'- '+i.text).join('\n') || 'No ideas yet';
    document.getElementById('activity-log').textContent = d.commands.slice(0,10).map(c=>'['+c.created_at+'] '+c.type+': '+c.value).join('\n') || 'No activity';
  }catch(e){console.error(e)}
}

async function sendCommand(){
  const type = document.getElementById('cmd-type').value;
  const value = document.getElementById('cmd-value').value;
  if(!value) return;
  await fetch(API+"/command",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type,value})});
  document.getElementById('cmd-value').value='';
  loadState();
}

async function sendChat(){
  const input = document.getElementById('chat-input');
  const msg = input.value;
  if(!msg) return;
  const hist = document.getElementById('chat-history');
  hist.innerHTML += '<div class="msg user">'+msg+'<div class="timestamp">'+new Date().toLocaleTimeString()+'</div></div>';
  input.value='';
  hist.scrollTop = hist.scrollHeight;
  try{
    const r = await fetch(API+"/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:msg})});
    const d = await r.json();
    const reply = d.response || d.error || 'No response';
    hist.innerHTML += '<div class="msg ai">'+reply+'<div class="timestamp">'+new Date().toLocaleTimeString()+' '+(d.model||'')+'</div></div>';
    hist.scrollTop = hist.scrollHeight;
  }catch(e){
    hist.innerHTML += '<div class="msg ai" style="border-color:#ff4444">Error: '+e+'</div>';
  }
}

async function sendBuild(){
  const task = document.getElementById('build-task').value;
  const type = document.getElementById('build-type').value;
  const filename = document.getElementById('build-filename').value;
  if(!task) return;
  document.getElementById('build-output').textContent = 'Building...';
  try{
    const r = await fetch(API+"/build",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({task,type,filename})});
    const d = await r.json();
    document.getElementById('build-output').textContent = d.error ? 'ERROR: '+d.error : 'Built: '+d.file+'\n\nPreview:\n'+d.content_preview;
  }catch(e){
    document.getElementById('build-output').textContent = 'Error: '+e;
  }
}

async function loadRevenue(){
  try{
    const r = await fetch(API+"/revenue");
    const d = await r.json();
    document.getElementById('rev-potential').textContent = '$'+d.total_potential_monthly;
    document.getElementById('rev-actual').textContent = '$'+d.total_actual;
    document.getElementById('rev-tools').textContent = d.tool_count;
    document.getElementById('tool-list').textContent = JSON.stringify(d.tools,null,2);
  }catch(e){}
}

async function registerTool(){
  const name = document.getElementById('tool-name').value;
  const type = document.getElementById('tool-type').value;
  if(!name) return;
  await fetch(API+"/command",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:'build_tool',value:name,tool_type:type})});
  document.getElementById('tool-name').value='';
  loadRevenue();
}

setInterval(loadState,3000);
setInterval(loadRevenue,5000);
loadState();
loadRevenue();
</script>
</body>
</html>"""

def generate_dashboard():
    dashboard_path = ROOT / "dashboard" / "index.html"
    with open(dashboard_path, "w") as f:
        f.write(DASHBOARD_HTML)
    print(f"[DASHBOARD] Generated: {dashboard_path}")

# =============================
# MAIN
# =============================
def main():
    print("=" * 50)
    print("  BUD-E CEO v26 — Self-Deploying Seed")
    print("=" * 50)
    
    bootstrap()
    init_db()
    generate_dashboard()
    
    if not REVENUE_PATH.exists():
        save_revenue({"total_potential": 0, "total_actual": 0, "tools": {}, "history": []})
    
    if not SELF_ANALYSIS_PATH.exists():
        save_self_analysis(load_self_analysis())
    
    log_evolution("System bootstrapped successfully.")
    
    if not FASTAPI_AVAILABLE:
        print("\n[ERROR] FastAPI not installed.")
        print("Run: pip install fastapi uvicorn requests")
        return
    
    if not GROQ_KEY:
        print("\n[WARN] No GROQ_API_KEY set. AI features disabled.")
        print("Set: export GROQ_API_KEY='your-key-here'")
    
    worker_thread = threading.Thread(target=worker_loop, daemon=True)
    worker_thread.start()
    print("[WORKER] Autonomous loop started.")
    
    print("\n[SERVER] Starting on http://0.0.0.0:8000")
    print("[DASHBOARD] Open http://localhost:8000 in your browser")
    print("[API] Endpoints: /state /chat /command /build /revenue /market")
    print("=" * 50)
    
    uvicorn.run(app, host="0.0.0.0", port=8000)

if __name__ == "__main__":
    main()
