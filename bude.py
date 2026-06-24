#!/usr/bin/env python3
"""
BudE OS v19 — Single-file autonomous CEO engine
Run: python bude.py
Then open: http://localhost:8080
"""
import json
import os
import sys
import time
import threading
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

# ─── CONFIG ─────────────────────────────────────────
PORT = int(os.environ.get("PORT", 8080))
CORE_DIR = "core"
AUTO_CYCLE_SEC = 60  # Auto-run CEO cycle every 60s
SAVE_DIR = os.path.dirname(os.path.abspath(__file__))

# ─── DEFAULT DATA ───────────────────────────────────
DEFAULT_STATE = {
    "version": 19,
    "goal": "Production SaaS AI OS",
    "paused": False,
    "last_run": str(datetime.now()),
    "pending_action": None
}

DEFAULT_EMPLOYEES = {
    "builder_1": {"role": "frontend", "tasks": 0},
    "builder_2": {"role": "backend", "tasks": 0},
    "qa_1":      {"role": "tester",  "tasks": 0},
    "analyst_1": {"role": "logic",   "tasks": 0}
}

CEO_IDEAS = [
    "Improve mobile UX system",
    "Enhance Kanban workflow",
    "Optimize task execution engine",
    "Add AI suggestion layer",
    "Build revenue dashboard",
    "Fix critical bugs",
    "Scale infrastructure",
    "Add dark mode toggle",
    "Implement real-time sync",
    "Create onboarding flow"
]

# ─── FILE HELPERS ───────────────────────────────────
def _path(filename):
    return os.path.join(SAVE_DIR, CORE_DIR, filename)

def load(filename, default):
    p = _path(filename)
    try:
        with open(p) as f:
            return json.load(f)
    except:
        if default is not None:
            save(filename, default)
        return default if default is not None else {}

def save(filename, data):
    p = _path(filename)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w") as f:
        json.dump(data, f, indent=2)

def ensure_all():
    load("state.json", DEFAULT_STATE.copy())
    load("employees.json", DEFAULT_EMPLOYEES.copy())
    load("tasks.json", [])
    load("activity.json", [])

# ─── CORE LOGIC ────────────────────────────────────
def create_task(text, assigned="builder_1"):
    return {
        "id": str(datetime.now()),
        "task": text,
        "assigned_to": assigned,
        "status": "backlog",
        "result": None
    }

def execute(task, employees):
    worker = task["assigned_to"]
    if worker in employees:
        employees[worker]["tasks"] += 1
    task["status"] = "done"
    task["result"] = f"Completed: {task['task']}"
    return task, employees

def ceo_idea(state):
    idx = (state.get("version", 19) % len(CEO_IDEAS))
    return CEO_IDEAS[idx]

def log_event(activity, msg):
    activity.append({
        "event": msg,
        "time": str(datetime.now())
    })
    # Keep last 50
    if len(activity) > 50:
        activity[:] = activity[-50:]

def run_cycle():
    state = load("state.json", DEFAULT_STATE.copy())
    employees = load("employees.json", DEFAULT_EMPLOYEES.copy())
    tasks = load("tasks.json", [])
    activity = load("activity.json", [])

    # CEO generates task if not paused
    if not state.get("paused", False):
        new_task = create_task(ceo_idea(state))
        tasks.append(new_task)
        log_event(activity, f"CEO created: {new_task['task']}")

    # Auto-progress system
    for t in tasks:
        if t["status"] == "backlog":
            t["status"] = "progress"
            log_event(activity, f"Started: {t['task']}")
        elif t["status"] == "progress":
            t, employees = execute(t, employees)
            log_event(activity, f"Done: {t['task']}")

    # Handle pending frontend action
    action = state.get("pending_action")
    if action:
        cmd = action.get("command", "")
        parts = cmd.split()
        atype = parts[0] if parts else "unknown"

        if atype in ("add", "create"):
            text = " ".join(parts[1:]) if len(parts) > 1 else "new task"
            assigned = action.get("assigned", "builder_1")
            tasks.append(create_task(text, assigned))
            log_event(activity, f"Added: {text}")

        elif atype == "assign" and len(parts) >= 3:
            worker = parts[1]
            text = " ".join(parts[2:])
            tasks.append(create_task(text, worker))
            log_event(activity, f"Assigned to {worker}: {text}")

        elif atype == "approve":
            for t in tasks:
                if t["status"] == "done":
                    t["status"] = "approved"
                    log_event(activity, f"Approved: {t['task']}")
                    break

        elif atype == "reject":
            for t in tasks:
                if t["status"] == "done":
                    t["status"] = "rejected"
                    log_event(activity, f"Rejected: {t['task']}")
                    break

        elif atype == "start":
            state["paused"] = False
            log_event(activity, "System started")

        elif atype == "pause":
            state["paused"] = True
            log_event(activity, "System paused")

        elif atype == "resume":
            state["paused"] = False
            log_event(activity, "System resumed")

        elif atype == "complete":
            for t in tasks:
                if t["status"] == "progress":
                    t, employees = execute(t, employees)
                    log_event(activity, f"Completed: {t['task']}")
                    break

        state["pending_action"] = None

    state["version"] = state.get("version", 19) + 1
    state["last_run"] = str(datetime.now())

    save("state.json", state)
    save("employees.json", employees)
    save("tasks.json", tasks)
    save("activity.json", activity)

    return {"state": state, "employees": employees, "tasks": tasks, "activity": activity}

# ─── AUTO-CYCLE THREAD ──────────────────────────────
def auto_cycle_loop():
    while True:
        time.sleep(AUTO_CYCLE_SEC)
        try:
            run_cycle()
            print(f"[AUTO] Cycle ran at {datetime.now().strftime('%H:%M:%S')}")
        except Exception as e:
            print(f"[AUTO] Error: {e}")

# ─── HTTP HANDLER ───────────────────────────────────
class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass  # Quiet

    def _send(self, data, status=200, ctype="application/json"):
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS, DELETE")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        if isinstance(data, str):
            self.wfile.write(data.encode())
        else:
            self.wfile.write(json.dumps(data).encode())

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path

        # API: Get all data
        if path == "/api/data":
            self._send({
                "state": load("state.json", DEFAULT_STATE.copy()),
                "employees": load("employees.json", DEFAULT_EMPLOYEES.copy()),
                "tasks": load("tasks.json", []),
                "activity": load("activity.json", [])
            })
            return

        # API: Run cycle and return data
        if path == "/api/cycle":
            self._send(run_cycle())
            return

        # Serve core JSON files
        if path.startswith("/core/"):
            fname = path[6:]  # strip /core/
            try:
                with open(_path(fname)) as f:
                    self._send(json.load(f))
            except:
                self._send({"error": "Not found"}, 404)
            return

        # Serve static files
        if path == "/" or path == "/index.html":
            self._send(HTML_DASHBOARD, 200, "text/html")
            return
        if path == "/app.js":
            self._send(JS_DASHBOARD, 200, "application/javascript")
            return
        if path == "/style.css":
            self._send(CSS_DASHBOARD, 200, "text/css")
            return

        self._send({"error": "Not found"}, 404)

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length).decode() if length else "{}"
        try:
            payload = json.loads(body)
        except:
            payload = {}

        path = urlparse(self.path).path

        if path == "/api/command":
            cmd = payload.get("command", "")
            state = load("state.json", DEFAULT_STATE.copy())
            state["pending_action"] = {
                "type": cmd.split()[0] if cmd.split() else "unknown",
                "command": cmd,
                "assigned": payload.get("assigned")
            }
            save("state.json", state)
            # Run cycle immediately to process
            result = run_cycle()
            self._send({**result, "success": True, "command": cmd})
            return

        if path == "/api/cycle":
            self._send(run_cycle())
            return

        self._send({"error": "Not found"}, 404)

    do_PUT = do_POST  # Backward compat

# ─── EMBEDDED FRONTEND ────────────────────────────
CSS_DASHBOARD = """* { box-sizing: border-box; }
body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0a0c10; color: #eaeaea; -webkit-font-smoothing: antialiased; }
#app { padding: 16px; padding-bottom: 100px; max-width: 600px; margin: 0 auto; }
.card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border-radius: 16px; padding: 16px; margin: 12px 0; box-shadow: 0 6px 20px rgba(0,0,0,0.25); animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.hero { background: linear-gradient(135deg, #2d6cdf, #7c4dff); padding: 20px; border-radius: 18px; color: white; margin-bottom: 16px; }
.hero h2 { margin: 0 0 10px 0; }
.hero p { margin: 6px 0; opacity: 0.95; }
.badge { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; background: rgba(255,255,255,0.15); color: white; }
.badge.backlog { background: rgba(108,117,125,0.3); color: #adb5bd; }
.badge.progress { background: rgba(45,108,223,0.25); color: #6ea8fe; }
.badge.done { background: rgba(40,167,69,0.25); color: #75b798; }
.badge.approved { background: rgba(25,135,84,0.3); color: #20c997; }
.badge.rejected { background: rgba(220,53,69,0.25); color: #ea868f; }
.badge.paused { background: rgba(255,193,7,0.25); color: #ffc107; }
.badge.active { background: rgba(40,167,69,0.25); color: #75b798; }
button { padding: 10px 16px; border-radius: 12px; border: none; background: #2d6cdf; color: white; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
button:hover { background: #1e5bc7; transform: translateY(-1px); }
button:active { transform: translateY(0); }
.btn-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.btn-row button { flex: 1; min-width: 70px; }
.btn-danger { background: #dc3545; }
.btn-danger:hover { background: #c82333; }
.btn-warn { background: #ffc107; color: #000; }
.btn-warn:hover { background: #e0a800; }
.btn-success { background: #28a745; }
.btn-success:hover { background: #218838; }
.btn-purple { background: #7c4dff; }
.btn-purple:hover { background: #6b3fd4; }
input { width: 100%; padding: 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: white; font-size: 14px; margin-top: 10px; }
input::placeholder { color: #888; }
input:focus { outline: none; border-color: #2d6cdf; }
.nav { position: fixed; bottom: 0; left: 0; width: 100%; display: flex; background: rgba(20,20,25,0.95); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border-top: 1px solid rgba(255,255,255,0.1); z-index: 100; }
.nav button { flex: 1; padding: 14px 4px; background: none; border: none; color: #888; font-size: 12px; font-weight: 500; border-radius: 0; transition: all 0.2s; }
.nav button:hover { color: #ccc; background: rgba(255,255,255,0.03); }
.nav button.active { color: #2d6cdf; border-top: 2px solid #2d6cdf; background: rgba(45,108,223,0.08); }
.task-card .task-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.task-card h3 { margin: 0; font-size: 16px; }
.task-card .result { color: #75b798; font-size: 13px; margin: 6px 0; }
.activity-item { display: flex; justify-content: space-between; align-items: center; }
.activity-item p { margin: 0; }
.empty { text-align: center; color: #888; padding: 30px; }
.toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #2d6cdf; color: white; padding: 12px 24px; border-radius: 12px; font-weight: 500; z-index: 200; animation: slideDown 0.3s ease; box-shadow: 0 4px 20px rgba(0,0,0,0.4); }
@keyframes slideDown { from { opacity: 0; transform: translate(-50%, -20px); } to { opacity: 1; transform: translate(-50%, 0); } }
p, h3 { margin: 8px 0; }
h3 { margin: 0 0 10px 0; }
.status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
.status-dot.active { background: #28a745; box-shadow: 0 0 8px #28a745; }
.status-dot.paused { background: #ffc107; box-shadow: 0 0 8px #ffc107; }
"""

JS_DASHBOARD = """let data={state:{},employees:{},tasks:[],activity:[]},currentTab="home",API_BASE="";
if(window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1")API_BASE="http://localhost:8080";
const FB={state:{version:"19",goal:"Production SaaS AI OS",paused:false,last_run:"Never"},employees:{builder_1:{role:"frontend",tasks:1},builder_2:{role:"backend",tasks:0},qa_1:{role:"tester",tasks:0},analyst_1:{role:"logic",tasks:0}},tasks:[{id:"1",task:"Enhance Kanban workflow",assigned_to:"builder_1",status:"done",result:"Completed"},{id:"2",task:"Optimize task execution engine",assigned_to:"builder_1",status:"progress",result:null}],activity:[]};
async function loadData(){try{const r=await fetch(API_BASE+"/api/data");if(!r.ok)throw new Error("x");data=await r.json()}catch(e){console.warn("API down, fallback");data={...FB}}render(currentTab);updateNav()}
function tab(n){currentTab=n;render(n);updateNav()}
function updateNav(){document.querySelectorAll(".nav button").forEach(b=>b.classList.remove("active"));const b=document.getElementById("nav-"+currentTab);if(b)b.classList.add("active")}
function render(t){const a=document.getElementById("app");if(!data.state||!data.state.version){a.innerHTML='<div class="card" style="text-align:center;margin-top:40px"><h2>🔄 Loading...</h2></div>';return}const s=data.state,em=data.employees||{},tk=data.tasks||[],ac=data.activity||[];
if(t==="home"){const st=s.paused?"⏸ Paused":"▶ Active",sc=s.paused?"badge paused":"badge active";a.innerHTML='<div class="hero"><h2>🧠 BudE Control Hub</h2><p><b>Goal:</b> '+(s.goal||"No goal")+'</p><p><b>Status:</b> <span class="'+sc+'"><span class="status-dot '+(s.paused?"paused":"active")+'"></span>'+st+'</span></p><p><b>Version:</b> V'+s.version+' | <b>Last Run:</b> '+fmt(s.last_run)+'</p></div><div class="card"><h3>⚡ Quick Actions</h3><div class="btn-row"><button onclick="sendCmd(\\'add improve system\\')">➕ Add</button><button onclick="sendCmd(\\'assign builder_1 optimize ui\\')">👷 Assign</button><button onclick="sendCmd(\\'start\\')">▶ Start</button><button onclick="sendCmd(\\'complete\\')">✅ Complete</button></div><div class="btn-row" style="margin-top:8px"><button onclick="sendCmd(\\'pause\\')" class="btn-warn">⏸ Pause</button><button onclick="sendCmd(\\'resume\\')" class="btn-success">▶ Resume</button><button onclick="runCycle()" class="btn-purple">🔄 Cycle</button></div></div><div class="card"><h3>📈 Stats</h3><p>👷 Workers: <b>'+Object.keys(em).length+'</b></p><p>📋 Tasks: <b>'+tk.length+'</b></p><p>📊 Activity: <b>'+ac.length+'</b> events</p></div>'}
if(t==="team"){const e=Object.entries(em);a.innerHTML='<div class="card"><h3>👷 Team Overview</h3><p>'+e.length+' members</p></div>'+(e.length===0?'<div class="card empty"><p>No team members.</p></div>':e.map(([n,mp])=>'<div class="card"><h3>👤 '+n+'</h3><p><span class="badge">'+(mp.role||"unknown")+'</span></p><p>Tasks completed: <b>'+(mp.tasks||0)+'</b></p><button onclick="sendCmd(\\'assign '+n+' new task\\')">Assign Task</button></div>').join(""))}
if(t==="tasks"){a.innerHTML='<div class="card"><h3>📋 Task Board</h3><p>'+tk.length+' tasks</p></div>'+(tk.length===0?'<div class="card empty"><p>No tasks yet.</p></div>':tk.map((tp,i)=>'<div class="card task-card"><div class="task-header"><h3>'+(tp.task||"Untitled")+'</h3><span class="badge '+(tp.status||"backlog")+'">'+(tp.status||"backlog")+'</span></div><p>Assigned: <b>'+(tp.assigned_to||"Unassigned")+'</b></p>'+(tp.result?'<p class="result">✓ '+tp.result+'</p>':"")+'<div class="btn-row"><button onclick="sendCmd(\\'approve '+i+'\\')">✅ Approve</button><button onclick="sendCmd(\\'reject '+i+'\\')" class="btn-danger">❌ Reject</button></div></div>').join(""))}
if(t==="activity"){a.innerHTML='<div class="card"><h3>📊 Activity Feed</h3><p>'+ac.length+' events</p></div>'+(ac.length===0?'<div class="card empty"><p>No activity yet.</p></div>':ac.slice().reverse.map(a=>'<div class="card activity-item"><p>• '+(a.event||"Event")+'</p><small>'+fmt(a.time)+'</small></div>').join(""))}
if(t==="chat"){a.innerHTML='<div class="card"><h3>💬 Command Center</h3><p>Type natural commands:</p><input id="cmd" placeholder="e.g. add build dashboard / assign builder_1 task" /><button onclick="send()" style="width:100%;margin-top:10px">Send Command</button></div><div class="card"><h3>⚡ Examples</h3><p>• add optimize system</p><p>• assign builder_1 fix UI</p><p>• start / pause / resume</p><p>• complete / approve / reject</p></div><div class="card"><h3>🔄 Manual Cycle</h3><button onclick="runCycle()" style="width:100%">Run One Cycle</button><p style="font-size:12px;color:#888;margin-top:8px">Runs CEO task gen + auto-progress</p></div>'}}
function send(){const c=document.getElementById("cmd")?.value;sendCmd(c)}
async function sendCmd(c){if(!c)return;toast("📤 "+c);try{const r=await fetch(API_BASE+"/api/command",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({command:c})});if(!r.ok)throw new Error("x");data=await r.json();render(currentTab);toast("✅ Done")}catch(e){console.warn("fail",e);toast("❌ API offline")}const i=document.getElementById("cmd");if(i)i.value=""}
async function runCycle(){toast("🔄 Running cycle...");try{const r=await fetch(API_BASE+"/api/cycle",{method:"POST"});if(!r.ok)throw new Error("x");data=await r.json();render(currentTab);toast("✅ Cycle complete")}catch(e){console.warn("fail",e);toast("❌ API offline")}}
function toast(m){const x=document.querySelector(".toast");if(x)x.remove();const e=document.createElement("div");e.className="toast";e.textContent=m;document.body.appendChild(e);setTimeout(()=>e.remove(),2000)}
function fmt(t){if(!t||t==="Never")return"Never";try{return new Date(t).toLocaleTimeString()}catch{return t}}
loadData();setInterval(loadData,5000);
"""

HTML_DASHBOARD = """<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>BudE OS V19</title>
<style>""" + CSS_DASHBOARD + """</style>
</head>
<body>
<div id="app"><div class="card" style="text-align:center;margin-top:40px"><h2>🔄 Loading BudE OS...</h2></div></div>
<div class="nav">
<button id="nav-home" onclick="tab('home')">Home</button>
<button id="nav-team" onclick="tab('team')">Team</button>
<button id="nav-tasks" onclick="tab('tasks')">Tasks</button>
<button id="nav-chat" onclick="tab('chat')">Chat</button>
<button id="nav-activity" onclick="tab('activity')">Activity</button>
</div>
<script>""" + JS_DASHBOARD + """</script>
</body>
</html>
"""

# ─── MAIN ───────────────────────────────────────────
if __name__ == "__main__":
    ensure_all()
    print("=" * 50)
    print("🧠  BudE OS v19 — Autonomous CEO Engine")
    print("=" * 50)
    print(f"📡 API Server: http://localhost:{PORT}")
    print(f"🌐 Dashboard:  http://localhost:{PORT}/")
    print(f"📁 Data dir:   {os.path.join(SAVE_DIR, CORE_DIR)}")
    print(f"⏰ Auto-cycle: every {AUTO_CYCLE_SEC}s")
    print("-" * 50)
    print("Endpoints:")
    print("  GET  /           → Dashboard UI")
    print("  GET  /api/data   → All state data")
    print("  POST /api/command→ Send command")
    print("  POST /api/cycle  → Run one cycle")
    print("=" * 50)

    # Start auto-cycle in background
    threading.Thread(target=auto_cycle_loop, daemon=True).start()

    # Start HTTP server
    server = HTTPServer(("0.0.0.0", PORT), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Shutting down...")
        server.shutdown()
