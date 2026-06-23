#!/usr/bin/env python3
"""
BudE Evolution Engine v0.7-FINAL
Repo: https://github.com/bude404-ops/Bude-Tech
Phased evolution: BUILD → BUSINESS → REVENUE (SOLANA)
Features: Auto-launch smart systems, hard-block rebuilds, similar-name blocker,
          self-awareness, rate limit handling, cooldown enforcement
"""

import os
import json
import sys
import time
import importlib.util
import requests
from datetime import datetime

REPO_ROOT = os.path.dirname(os.path.abspath(__file__))
MEMORY_PATH = os.path.join(REPO_ROOT, "system", "memory.json")
LOG_PATH = os.path.join(REPO_ROOT, "system", "evolution.log")
QUEUE_PATH = os.path.join(REPO_ROOT, "system", "queue.json")
CHAT_PATH = os.path.join(REPO_ROOT, "system", "chat.txt")
CHAT_LOG_PATH = os.path.join(REPO_ROOT, "system", "chat.log")
REVENUE_PATH = os.path.join(REPO_ROOT, "system", "revenue.json")
SELF_ANALYSIS_PATH = os.path.join(REPO_ROOT, "system", "self_analysis.json")
GITHUB_REPO = "bude404-ops/Bude-Tech"

SOLANA_WALLET = "AnJDRjTaxtRbqYazSkRjLm1Y2jSfuCmHJhygKiNyrKmx"

GROQ_MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "mixtral-8x7b-32768",
    "gemma2-9b-it",
]
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
MAX_PROMPT_CHARS = 12000
MAX_LOG_LINES = 50

PROTECTED_FILES = [
    "dashboard.js",
    "style.css",
    "index.html",
]

EXISTING_PATTERNS = [
    "new_",
    "_requirements.txt",
    "copy_of_",
    "backup_",
]

ALLOWED_UPDATES = [
    "evolve.py",
    "brain.md",
    "dashboard.js",
    "style.css",
]

# ─── AUTO-LAUNCH SMART SYSTEMS ───

SELF_AWARENESS_CODE = '''#!/usr/bin/env python3
"""
BudE Self-Awareness Engine — Auto-launched
Learns from evolution cycles, tracks patterns, improves decisions.
"""

import os
import json
from datetime import datetime

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SELF_ANALYSIS_PATH = os.path.join(REPO_ROOT, "system", "self_analysis.json")

def load_self_analysis():
    if os.path.exists(SELF_ANALYSIS_PATH):
        with open(SELF_ANALYSIS_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "version": "1.0",
        "created": datetime.utcnow().isoformat(),
        "last_updated": datetime.utcnow().isoformat(),
        "lessons_learned": [],
        "model_performance": {},
        "build_patterns": {"successful_builds": [], "failed_builds": [], "common_errors": []},
        "revenue_insights": {"what_worked": [], "what_failed": [], "price_sensitivity": []}
    }

def save_self_analysis(data):
    data["last_updated"] = datetime.utcnow().isoformat()
    with open(SELF_ANALYSIS_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

def analyze_last_cycle(memory, log_content, model_used, files_created, errors):
    analysis = load_self_analysis()
    
    if model_used:
        if model_used not in analysis["model_performance"]:
            analysis["model_performance"][model_used] = {"attempts": 0, "successes": 0, "files_created": 0, "errors": 0}
        analysis["model_performance"][model_used]["attempts"] += 1
        if files_created:
            analysis["model_performance"][model_used]["successes"] += 1
            analysis["model_performance"][model_used]["files_created"] += len(files_created)
        if errors:
            analysis["model_performance"][model_used]["errors"] += len(errors)
    
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
    
    if log_content:
        error_lines = [l for l in log_content.split('\\n') if '[ERROR]' in l]
        for err in error_lines[-5:]:
            error_type = "UNKNOWN"
            if "JSON" in err: error_type = "JSON_PARSE_ERROR"
            elif "429" in err: error_type = "RATE_LIMIT_ERROR"
            elif "model" in err.lower() and "fail" in err.lower(): error_type = "MODEL_FAILURE"
            elif "No files created" in err: error_type = "EMPTY_CYCLE"
            elif "global" in err and "declaration" in err: error_type = "PYTHON_SYNTAX_ERROR"
            elif "No such file" in err: error_type = "MISSING_FILE_ERROR"
            
            existing = [e for e in analysis["build_patterns"]["common_errors"] if e["type"] == error_type]
            if not existing:
                analysis["build_patterns"]["common_errors"].append({
                    "type": error_type, "first_seen": datetime.utcnow().isoformat(), "count": 1, "example": err[:200]
                })
            else:
                existing[0]["count"] += 1
    
    lessons = []
    rate_limit_count = sum(1 for e in analysis["build_patterns"]["common_errors"] if e["type"] == "RATE_LIMIT_ERROR")
    if rate_limit_count > 2:
        lessons.append("Rate limiting is frequent. Consider longer intervals between runs.")
    
    recent_builds = analysis["build_patterns"]["successful_builds"][-10:]
    file_names = [b["file"] for b in recent_builds]
    duplicates = set([f for f in file_names if file_names.count(f) > 1])
    if duplicates:
        lessons.append(f"Stop rebuilding: {duplicates}. These files already exist.")
    
    empty_count = sum(1 for e in analysis["build_patterns"]["common_errors"] if e["type"] == "EMPTY_CYCLE")
    if empty_count > 2:
        lessons.append("Empty cycles detected. AI may be confused — clarify build priorities.")
    
    if lessons:
        analysis["lessons_learned"].append({
            "time": datetime.utcnow().isoformat(), "lesson": " | ".join(lessons)
        })
        analysis["lessons_learned"] = analysis["lessons_learned"][-20:]
    
    save_self_analysis(analysis)
    return analysis

def get_lessons_for_prompt():
    analysis = load_self_analysis()
    lessons = analysis.get("lessons_learned", [])[-5:]
    if not lessons:
        return ""
    return "\\nLESSONS FROM PREVIOUS CYCLES:\\n" + "\\n".join([f"- {l['lesson']}" for l in lessons]) + "\\nApply these lessons. Do not repeat past mistakes.\\n"

if __name__ == "__main__":
    print("Self-awareness engine loaded.")
'''

SELF_ANALYSIS_TEMPLATE = '''{
  "version": "1.0",
  "created": "2026-06-23T00:00:00Z",
  "last_updated": "2026-06-23T00:00:00Z",
  "lessons_learned": [],
  "model_performance": {},
  "build_patterns": {
    "successful_builds": [],
    "failed_builds": [],
    "common_errors": []
  },
  "revenue_insights": {
    "what_worked": [],
    "what_failed": [],
    "price_sensitivity": []
  }
}'''

def ensure_smart_systems():
    """Auto-create self-awareness files if missing."""
    smart_files = {
        "api/self_awareness.py": SELF_AWARENESS_CODE,
        "system/self_analysis.json": SELF_ANALYSIS_TEMPLATE,
    }
    created_any = False
    for path, content in smart_files.items():
        full_path = os.path.join(REPO_ROOT, path)
        if not os.path.exists(full_path):
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            with open(full_path, "w", encoding="utf-8") as f:
                f.write(content)
            log_event(f"Auto-launched smart system: {path}")
            created_any = True
    return created_any

def load_self_awareness():
    """Load self-awareness module dynamically."""
    try:
        spec = importlib.util.spec_from_file_location("self_awareness", os.path.join(REPO_ROOT, "api", "self_awareness.py"))
        if spec and spec.loader:
            sa = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(sa)
            return sa
    except Exception as e:
        log_event(f"Self-awareness load failed: {e}", "WARN")
    return None

# ─── CHAT ───

def read_chat():
    if not os.path.exists(CHAT_PATH):
        return ""
    with open(CHAT_PATH, "r", encoding="utf-8") as f:
        return f.read().strip()

def clear_chat():
    if os.path.exists(CHAT_PATH):
        with open(CHAT_PATH, "w", encoding="utf-8") as f:
            f.write("")

def log_chat_response(user_msg, bot_response):
    ts = datetime.utcnow().isoformat()
    entry = f"\n[{ts}] USER: {user_msg}\n[{ts}] BUDE: {bot_response}\n"
    os.makedirs(os.path.dirname(CHAT_LOG_PATH), exist_ok=True)
    with open(CHAT_LOG_PATH, "a", encoding="utf-8") as f:
        f.write(entry)

# ─── REVENUE ───

def load_revenue():
    if os.path.exists(REVENUE_PATH):
        with open(REVENUE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "total_earned_usd": 0,
        "total_earned_sol": 0,
        "total_earned_crypto": 0,
        "subscriptions": {"free_tier": 0, "paid_monthly": 0, "paid_yearly": 0},
        "products": {
            "crypto_newsletter": {
                "price_monthly_sol": 0.05,
                "price_yearly_sol": 0.5,
                "subscribers": 0,
                "revenue_sol": 0
            }
        },
        "affiliate_earnings_sol": 0,
        "freelance_earnings_sol": 0,
        "solana_wallet": SOLANA_WALLET,
        "last_updated": datetime.utcnow().isoformat()
    }

def save_revenue(rev):
    os.makedirs(os.path.dirname(REVENUE_PATH), exist_ok=True)
    rev["last_updated"] = datetime.utcnow().isoformat()
    with open(REVENUE_PATH, "w", encoding="utf-8") as f:
        json.dump(rev, f, indent=2)

# ─── LOGGING ───

def log_event(msg, level="INFO"):
    ts = datetime.utcnow().isoformat()
    entry = f"[{ts}] [{level}] {msg}\n"
    os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(entry)
    print(entry.strip())

def cleanup_logs():
    if not os.path.exists(LOG_PATH):
        return
    try:
        with open(LOG_PATH, "r", encoding="utf-8") as f:
            lines = f.readlines()
        if len(lines) > MAX_LOG_LINES:
            with open(LOG_PATH, "w", encoding="utf-8") as f:
                f.writelines(lines[-MAX_LOG_LINES:])
            print(f"[CLEANUP] Trimmed evolution.log to {MAX_LOG_LINES} lines")
    except Exception as e:
        print(f"[CLEANUP] Error: {e}")

# ─── SELF-HEAL ───

def self_heal():
    if not os.path.exists(LOG_PATH):
        return
    try:
        with open(LOG_PATH, "r") as f:
            lines = f.readlines()
        last_error = None
        for line in reversed(lines):
            if "[ERROR]" in line:
                last_error = line
                break
        if not last_error:
            return
        if "JSON parse error" in last_error:
            log_event("SELF-HEAL: JSON parse issue, simplifying prompt", "HEAL")
            return "simplify_json"
        elif "All models failed" in last_error:
            log_event("SELF-HEAL: Model failure, will retry", "HEAL")
            return "retry_models"
        elif "No files created" in last_error:
            log_event("SELF-HEAL: Empty cycle, expanding prompt", "HEAL")
            return "expand_prompt"
    except Exception as e:
        log_event(f"SELF-HEAL failed: {e}", "WARN")

# ─── MEMORY ───

def load_memory():
    if os.path.exists(MEMORY_PATH):
        with open(MEMORY_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "evolution_cycles": 0,
        "last_cycle": None,
        "errors": [],
        "tasks": [],
        "repo": GITHUB_REPO,
        "upgrades_made": [],
        "current_focus": "build",
        "phase": "build",
        "modules_built": [],
        "business_modules": []
    }

def save_memory(mem):
    os.makedirs(os.path.dirname(MEMORY_PATH), exist_ok=True)
    with open(MEMORY_PATH, "w", encoding="utf-8") as f:
        json.dump(mem, f, indent=2)

def cleanup_memory(memory):
    seen = set()
    unique_tasks = []
    for task in memory.get("tasks", []):
        text = task.get("text", "")
        if text and text not in seen:
            seen.add(text)
            unique_tasks.append(task)
    memory["tasks"] = unique_tasks[-20:]
    memory["modules_built"] = list(dict.fromkeys(memory.get("modules_built", [])))
    memory["business_modules"] = list(dict.fromkeys(memory.get("business_modules", [])))
    memory["upgrades_made"] = memory.get("upgrades_made", [])[-10:]
    return memory

# ─── QUEUE ───

def process_queue():
    if not os.path.exists(QUEUE_PATH):
        return []
    with open(QUEUE_PATH, "r", encoding="utf-8") as f:
        queue = json.load(f)
    pending = [q for q in queue if q.get("status") == "pending"]
    for q in queue:
        q["status"] = "processed"
        q["processed_at"] = datetime.utcnow().isoformat()
    with open(QUEUE_PATH, "w", encoding="utf-8") as f:
        json.dump(queue, f, indent=2)
    if pending:
        log_event(f"Processed {len(pending)} queued commands")
    return pending

# ─── REPO STATE ───

def get_repo_state():
    files = []
    for root, _, filenames in os.walk(REPO_ROOT):
        if ".git" in root:
            continue
        for f in filenames:
            path = os.path.relpath(os.path.join(root, f), REPO_ROOT)
            files.append(path)
    return files

# ─── PHASE LOGIC ───

def determine_phase(memory, files):
    core_modules = [
        "agents/coder_agent.py",
        "agents/researcher_agent.py",
        "agents/crypto_analyst_agent.py",
        "agents/system_architect_agent.py",
        "api/solana.py",
        "tools/utils.py",
    ]
    built = [m for m in core_modules if m in files]
    memory["modules_built"] = built
    if len(built) >= 4:
        return "business"
    return "build"

def build_phase_prompt(memory, files):
    missing = [
        "agents/coder_agent.py",
        "agents/researcher_agent.py",
        "agents/crypto_analyst_agent.py",
        "agents/system_architect_agent.py",
        "api/solana.py",
        "tools/utils.py",
        "tests/test_agents.py",
    ]
    built_names = [os.path.basename(f) for f in memory.get("modules_built", [])]
    missing = [m for m in missing if not any(b in m for b in built_names)]
    return f"""
PHASE: BUILD
Progress: {len(memory.get('modules_built', []))}/6 core modules

MISSING:
{chr(10).join(missing[:3])}

RULES:
- Create ONE file per cycle
- NO duplicates
- NO requirements files
- Make it functional
"""

def business_phase_prompt(memory, files):
    all_opportunities = {
        "landing_page/index.html": "sales page with Solana Pay subscribe button",
        "api/solana_payment_handler.py": "generate Solana Pay links, verify tx on-chain",
        "api/email_sender.py": "send daily newsletters to paid subscribers",
        "api/subscriber_manager.py": "track users by Solana wallet address",
        "api/revenue_tracker.py": "report SOL earnings, read wallet balance",
    }
    
    existing_files = set(files)
    built_biz = set(memory.get("business_modules", []))
    
    missing = []
    for path, desc in all_opportunities.items():
        if path not in existing_files and path not in built_biz:
            missing.append(f"{path} — {desc}")
    
    revenue = load_revenue()
    
    if not missing:
        missing = ["All revenue files built. Build marketing tools: api/marketing_bot.py, api/twitter_poster.py"]
    
    return f"""
PHASE: BUSINESS (SOL Revenue)
Business modules: {len(built_biz)}/5
Revenue: {revenue['total_earned_sol']:.4f} SOL
Wallet: {SOLANA_WALLET}

MISSING FILES — build ONE per cycle:
{chr(10).join(missing[:3])}

CRITICAL RULES:
- ONLY build files from the MISSING list above
- NEVER rebuild files that already exist
- NEVER create files not on the missing list
- NEVER create files with similar names to existing files
- Allowed updates only: evolve.py, brain.md, system/*, dashboard files
- If all files exist, build marketing tools: api/marketing_bot.py, api/twitter_poster.py
"""

# ─── PROMPT BUILDER ───

def build_prompt(brain, repo_state, memory, queued):
    brain_summary = brain[:1500] + "\n... [truncated]" if len(brain) > 1500 else brain
    file_list = repo_state[:40]
    file_count = len(repo_state)
    
    phase = memory.get("phase", "build")
    forced_focus = memory.get("current_focus", "general")
    
    for q in queued:
        if q.get("type") == "focus":
            forced_focus = q.get("data", "general")
            if forced_focus == "business":
                phase = "business"
            memory["current_focus"] = forced_focus
            memory["phase"] = phase
            save_memory(memory)
    
    if phase == "build" and forced_focus not in ["business", "money"]:
        detected = determine_phase(memory, repo_state)
        if detected == "business":
            phase = "business"
            memory["phase"] = "business"
            log_event("PHASE ADVANCE: Build complete → Business mode")
    
    if phase == "business" or forced_focus in ["business", "money", "monetize"]:
        phase_prompt = business_phase_prompt(memory, repo_state)
    else:
        phase_prompt = build_phase_prompt(memory, repo_state)
    
    mem_summary = {
        "cycles": memory.get("evolution_cycles", 0),
        "phase": phase,
        "focus": forced_focus,
        "modules": len(memory.get("modules_built", [])),
        "business": len(memory.get("business_modules", []))
    }
    
    chat_text = read_chat()
    chat_section = ""
    if chat_text:
        chat_section = f"""
HUMAN SAID:
\"\"\"{chat_text}\"\"\"

You are talking directly to a human. Understand their intent like a smart assistant would.
If they want you to build something, build it. If they want info, tell them. If they want a fix, fix it.
Always reply in the "chat_response" field. Build files when needed.
"""
    
    revenue = load_revenue()
    revenue_section = f"""
REVENUE:
- Earned: {revenue['total_earned_sol']:.4f} SOL
- Subscribers: {revenue['products']['crypto_newsletter']['subscribers']}
- Wallet: {SOLANA_WALLET}
"""
    
    existing_business = memory.get("business_modules", [])
    existing_modules = memory.get("modules_built", [])
    
    # Load lessons from self-awareness
    lessons = ""
    sa = load_self_awareness()
    if sa:
        try:
            lessons = sa.get_lessons_for_prompt()
        except Exception as e:
            log_event(f"Lessons load failed: {e}", "WARN")
    
    prompt = f"""You are BudE evolution engine.
Repo: {GITHUB_REPO}

BRAIN:
{brain_summary}

FILES ({file_count} total):
{json.dumps(file_list, indent=2)}

MEMORY:
{json.dumps(mem_summary)}

{phase_prompt}
{revenue_section}
{chat_section}
{lessons}

EXISTING BUSINESS FILES (NEVER rebuild, NEVER create similar names):
{json.dumps(existing_business, indent=2)}

EXISTING MODULES (NEVER rebuild):
{json.dumps(existing_modules, indent=2)}

STRICT RULES:
- DASHBOARD LOCKED: Never modify {', '.join(PROTECTED_FILES)}
- You can update: evolve.py, brain.md, system/*, dashboard files ONLY
- NEVER create a file that already exists in the repo
- NEVER create files with similar names to existing files
- NEVER rebuild api/*, tools/*, agents/*, landing_page/* unless explicitly allowed
- Output ONLY valid JSON
- NEVER add duplicate tasks

JSON FORMAT:
{{
  "actions": [
    {{"type": "create_file", "path": "exact_filename.py", "content": "content"}}
  ],
  "reasoning": "why",
  "upgrades_made": ["files"],
  "new_tasks": ["task1"],
  "chat_response": "reply"
}}

1-2 files max. Build ONLY missing files from the MISSING list.
"""
    
    if len(prompt) > MAX_PROMPT_CHARS:
        prompt = prompt[:MAX_PROMPT_CHARS] + "\n... [truncated]\n}"
    
    return prompt

# ─── GROQ API ───

def is_duplicate(path):
    base = os.path.basename(path)
    for pattern in EXISTING_PATTERNS:
        if pattern in base:
            return True
    return False

def is_similar_to_existing(path, existing_files):
    """Check if path is similar to an existing file (prevents landing_page.html when index.html exists)."""
    base = os.path.basename(path).lower().replace('.html', '').replace('.py', '')
    dirname = os.path.dirname(path)
    
    for existing in existing_files:
        existing_base = os.path.basename(existing).lower().replace('.html', '').replace('.py', '')
        existing_dir = os.path.dirname(existing)
        
        # Same directory, similar base name
        if dirname == existing_dir and base == existing_base:
            return True
        
        # Same folder, one is index and other is folder name
        if dirname == existing_dir:
            folder_name = dirname.replace('/', '').replace('\\', '')
            if (base == 'index' and existing_base == folder_name) or \
               (existing_base == 'index' and base == folder_name):
                return True
    
    return False

def call_groq(prompt, model):
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": "You are BudE. Build focused, no duplicates. Output only JSON."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3,
        "max_tokens": 2048
    }
    resp = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=60)
    resp.raise_for_status()
    data = resp.json()
    if "error" in data:
        raise RuntimeError(f"Groq error: {data['error']}")
    if "choices" not in data or not data["choices"]:
        raise RuntimeError("No choices")
    return data["choices"][0]["message"]["content"]

def try_models(prompt):
    for model in GROQ_MODELS:
        try:
            log_event(f"Trying: {model}")
            result = call_groq(prompt, model)
            log_event(f"Success: {model}")
            return result, model
        except Exception as e:
            err_msg = str(e)[:100]
            log_event(f"{model} failed: {err_msg}", "WARN")
            if "429" in err_msg or "Too Many Requests" in err_msg:
                log_event("Rate limited, waiting 30s...", "WARN")
                time.sleep(30)
            continue
    raise RuntimeError("All models failed")

# ─── APPLY CHANGES (HARD BLOCK + SIMILAR NAME BLOCK) ───

def apply_changes(result, memory):
    upgrades = result.get("upgrades_made", [])
    created = []
    
    # Get current repo state for similarity check
    repo_files = get_repo_state()
    
    for action in result.get("actions", []):
        if action["type"] != "create_file":
            continue
        
        path = action["path"]
        
        # Block protected files
        if path in PROTECTED_FILES:
            log_event(f"BLOCKED protected: {path}")
            continue
        
        # Block duplicate patterns
        if is_duplicate(path):
            log_event(f"BLOCKED duplicate pattern: {path}")
            continue
        
        # Block requirements files
        if path.endswith("_requirements.txt"):
            log_event(f"BLOCKED requirements: {path}")
            continue
        
        # Block similar filenames (prevents landing_page.html when index.html exists)
        if is_similar_to_existing(path, repo_files):
            log_event(f"BLOCKED similar name: {path} (similar to existing file)")
            continue
        
        # Hard block: file exists and not in allowlist
        if os.path.exists(path):
            is_allowed = any(a in path for a in ALLOWED_UPDATES)
            is_system = path.startswith("system/")
            
            if not is_allowed and not is_system:
                log_event(f"BLOCKED rebuild: {path} (exists, not in allowlist)")
                continue
            else:
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        existing = f.read()
                    if existing == action["content"]:
                        log_event(f"SKIPPED identical: {path}")
                        continue
                    else:
                        log_event(f"UPDATING allowed: {path}")
                except:
                    pass
        
        # Write the file
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(action["content"])
        created.append(path)
        log_event(f"Built: {path}")
        
        # Track in memory
        if "business" in path or "freelance" in path or "saas" in path or "solana" in path or "landing" in path or "revenue" in path or "marketing" in path or "twitter" in path:
            memory["business_modules"] = memory.get("business_modules", [])
            if path not in memory["business_modules"]:
                memory["business_modules"].append(path)
        elif "agents/" in path or "api/" in path or "tools/" in path:
            memory["modules_built"] = memory.get("modules_built", [])
            if path not in memory["modules_built"]:
                memory["modules_built"].append(path)
    
    return created, upgrades

def clean_json_response(raw):
    cleaned = raw.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    return cleaned.strip()

# ─── MAIN ───

def main():
    global MAX_PROMPT_CHARS
    
    # Auto-launch smart systems first
    ensure_smart_systems()
    
    cleanup_logs()
    heal_action = self_heal()
    
    if heal_action == "simplify_json":
        MAX_PROMPT_CHARS = 8000
    elif heal_action == "expand_prompt":
        MAX_PROMPT_CHARS = 15000
    
    memory = load_memory()
    memory = cleanup_memory(memory)
    save_memory(memory)
    
    log_event(f"=== BudE | Phase: {memory.get('phase', 'build')} | Focus: {memory.get('current_focus', 'general')} ===")
    
    if not GROQ_API_KEY:
        log_event("No GROQ_API_KEY", "ERROR")
        sys.exit(1)
    
    brain_path = os.path.join(REPO_ROOT, "brain.md")
    if not os.path.exists(brain_path):
        log_event("brain.md missing", "ERROR")
        sys.exit(1)
    
    with open(brain_path, "r", encoding="utf-8") as f:
        brain = f.read()
    
    chat_text = read_chat()
    if chat_text:
        log_event(f"Chat received: {chat_text[:80]}...")
    
    queued = process_queue()
    repo_state = get_repo_state()
    prompt = build_prompt(brain, repo_state, memory, queued)
    
    log_event(f"Prompt: {len(prompt)} chars")
    
    try:
        raw_response, used_model = try_models(prompt)
        cleaned = clean_json_response(raw_response)
        
        try:
            result = json.loads(cleaned)
        except json.JSONDecodeError as e:
            log_event(f"JSON error: {e}", "ERROR")
            log_event(f"Raw: {raw_response[:300]}", "DEBUG")
            raise
        
        created, upgrades = apply_changes(result, memory)
        
        chat_response = result.get("chat_response", "")
        if chat_response and chat_text:
            log_chat_response(chat_text, chat_response)
            log_event(f"Chat reply: {chat_response[:100]}...")
        
        if chat_text:
            clear_chat()
            log_event("Chat cleared")
        
        if len(created) == 0 and not chat_response:
            log_event("No files created. Skipping commit.")
            memory["evolution_cycles"] = memory.get("evolution_cycles", 0) + 1
            memory["last_cycle"] = datetime.utcnow().isoformat()
            memory["last_model_used"] = used_model
            memory["errors"] = []
            save_memory(memory)
            return
        
        new_tasks = result.get("new_tasks", [])
        new_tasks = list(dict.fromkeys(new_tasks))
        
        completed_tasks = result.get("tasks_completed", [])
        current_tasks = memory.get("tasks", [])
        current_tasks = [t for t in current_tasks if t["text"] not in completed_tasks]
        
        for nt in new_tasks:
            if not any(t.get("text") == nt for t in current_tasks):
                current_tasks.append({"id": len(current_tasks)+1, "text": nt, "done": False})
        
        memory["tasks"] = current_tasks[-20:]
        
        memory["evolution_cycles"] = memory.get("evolution_cycles", 0) + 1
        memory["last_cycle"] = datetime.utcnow().isoformat()
        memory["last_model_used"] = used_model
        memory["last_reasoning"] = result.get("reasoning", "No reasoning")[:200]
        
        if upgrades:
            memory["upgrades_made"] = memory.get("upgrades_made", [])
            memory["upgrades_made"].append({
                "time": datetime.utcnow().isoformat(),
                "files": upgrades
            })
            memory["upgrades_made"] = memory["upgrades_made"][-10:]
        
        memory = cleanup_memory(memory)
        
        memory["errors"] = []
        save_memory(memory)
        
        log_event(f"=== Done | Built: {len(created)} | Phase: {memory.get('phase', 'build')} | Revenue: {load_revenue()['total_earned_sol']:.4f} SOL ===")
        
        # Self-awareness: analyze this cycle
        try:
            log_content = ""
            if os.path.exists(LOG_PATH):
                with open(LOG_PATH, "r", encoding="utf-8") as f:
                    log_content = f.read()
            
            sa = load_self_awareness()
            if sa:
                sa.analyze_last_cycle(memory, log_content, used_model, created, memory.get("errors", []))
                log_event("Self-awareness: cycle analyzed")
        except Exception as e:
            log_event(f"Self-awareness error: {e}", "WARN")
        
    except Exception as e:
        log_event(f"Failed: {e}", "ERROR")
        memory["errors"] = memory.get("errors", [])
        memory["errors"].append({"time": datetime.utcnow().isoformat(), "error": str(e)[:200]})
        save_memory(memory)
        sys.exit(1)

if __name__ == "__main__":
    main()
