#!/usr/bin/env python3
"""
BudE Evolution Engine v0.5-SOL
Repo: https://github.com/bude404-ops/Bude-Tech
Phased evolution: BUILD → BUSINESS → REVENUE (SOLANA)
Dashboard LOCKED | Auto-log-cleanup enabled | Simple chat interface | SOL revenue tracker
"""

import os
import json
import sys
import requests
from datetime import datetime

REPO_ROOT = os.path.dirname(os.path.abspath(__file__))
MEMORY_PATH = os.path.join(REPO_ROOT, "system", "memory.json")
LOG_PATH = os.path.join(REPO_ROOT, "system", "evolution.log")
QUEUE_PATH = os.path.join(REPO_ROOT, "system", "queue.json")
CHAT_PATH = os.path.join(REPO_ROOT, "system", "chat.txt")
CHAT_LOG_PATH = os.path.join(REPO_ROOT, "system", "chat.log")
REVENUE_PATH = os.path.join(REPO_ROOT, "system", "revenue.json")
GITHUB_REPO = "bude404-ops/Bude-Tech"

# SOLANA WALLET — RECEIVING ADDRESS (PUBLIC ONLY)
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

# --- SIMPLE CHAT SYSTEM ---

def read_chat():
    """Read raw chat messages from plain text file."""
    if not os.path.exists(CHAT_PATH):
        return ""
    with open(CHAT_PATH, "r", encoding="utf-8") as f:
        content = f.read().strip()
    return content

def clear_chat():
    """Clear chat file after processing."""
    if os.path.exists(CHAT_PATH):
        with open(CHAT_PATH, "w", encoding="utf-8") as f:
            f.write("")

def log_chat_response(user_msg, bot_response):
    """Log chat conversation for history."""
    ts = datetime.utcnow().isoformat()
    entry = f"\n[{ts}] USER: {user_msg}\n[{ts}] BUDE: {bot_response}\n"
    os.makedirs(os.path.dirname(CHAT_LOG_PATH), exist_ok=True)
    with open(CHAT_LOG_PATH, "a", encoding="utf-8") as f:
        f.write(entry)

# --- REVENUE TRACKER (SOLANA) ---

def load_revenue():
    """Load revenue tracking data."""
    if os.path.exists(REVENUE_PATH):
        with open(REVENUE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "total_earned_usd": 0,
        "total_earned_sol": 0,
        "total_earned_crypto": 0,
        "subscriptions": {
            "free_tier": 0,
            "paid_monthly": 0,
            "paid_yearly": 0
        },
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
    """Save revenue tracking data."""
    os.makedirs(os.path.dirname(REVENUE_PATH), exist_ok=True)
    rev["last_updated"] = datetime.utcnow().isoformat()
    with open(REVENUE_PATH, "w", encoding="utf-8") as f:
        json.dump(rev, f, indent=2)

# --- SELF-HEAL ---

def self_heal():
    """Read last error and attempt to fix it."""
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
            log_event("SELF-HEAL: Detected JSON parse issue, will simplify prompt", "HEAL")
            return "simplify_json"
        elif "All models failed" in last_error:
            log_event("SELF-HEAL: Detected model failure, will retry with fallback", "HEAL")
            return "retry_models"
        elif "No files created" in last_error:
            log_event("SELF-HEAL: Detected empty cycle, will expand prompt", "HEAL")
            return "expand_prompt"
        
    except Exception as e:
        log_event(f"SELF-HEAL failed: {e}", "WARN")

# --- LOGGING ---

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

# --- MEMORY ---

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
    """Remove duplicate tasks and limit memory size to prevent prompt bloat."""
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

# --- QUEUE ---

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

# --- REPO STATE ---

def get_repo_state():
    files = []
    for root, _, filenames in os.walk(REPO_ROOT):
        if ".git" in root:
            continue
        for f in filenames:
            path = os.path.relpath(os.path.join(root, f), REPO_ROOT)
            files.append(path)
    return files

# --- PHASE LOGIC ---

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
        "agents/coder_agent.py — writes and fixes code",
        "agents/researcher_agent.py — gathers information from APIs",
        "agents/crypto_analyst_agent.py — analyzes Solana/crypto data",
        "agents/system_architect_agent.py — plans system structure",
        "api/solana.py — Solana blockchain reader (public data only)",
        "tools/utils.py — shared helper functions",
        "tests/test_agents.py — verify agents work",
    ]
    built_names = [os.path.basename(f) for f in memory.get("modules_built", [])]
    missing = [m for m in missing if not any(b in m for b in built_names)]
    return f"""
PHASE: BUILD (Core System)
Progress: {len(memory.get('modules_built', []))}/6 core modules

MISSING MODULES — build ONE per cycle:
{chr(10).join(missing[:3])}

RULES:
- Create ONE file per cycle
- NO duplicates (no "new_" prefixes, no "_requirements.txt")
- NO requirements files (use standard library + requests)
- Make it functional, not perfect
- Test that it runs
"""

def business_phase_prompt(memory, files):
    """Revenue-focused business phase — Solana crypto payments."""
    opportunities = [
        "landing_page/index.html — sales page with Solana Pay subscribe button",
        "api/solana_payments.py — generate Solana Pay links, verify tx on-chain",
        "api/email_sender.py — send daily newsletters to paid subscribers",
        "api/subscriber_manager.py — track users by Solana wallet address",
        "api/revenue_tracker.py — report SOL earnings, read wallet balance",
    ]
    built_biz = memory.get("business_modules", [])
    missing = [o for o in opportunities if not any(b in o for b in built_biz)]
    
    revenue = load_revenue()
    
    return f"""
PHASE: BUSINESS (Revenue Generation via Solana)
Core modules: ✅ DONE
Business modules: {len(built_biz)}/5
Current revenue: {revenue['total_earned_sol']:.4f} SOL
Solana wallet: {SOLANA_WALLET}

REVENUE OPPORTUNITIES — build ONE per cycle:
{chr(10).join(missing[:3])}

CRITICAL RULES:
- Create ONE revenue-generating file per cycle
- Every file must either: collect SOL, deliver product, or get customers
- NO more internal tools unless they directly make money
- Use Solana Pay for payment links (free, no middleman)
- Verify transactions via Solana RPC or Helius API
- Track earnings in SOL, not USD
- Update system/revenue.json when SOL flows
- NEVER put private keys in any file — only public wallet address
- Build landing page with Solana Pay button FIRST
"""

# --- PROMPT BUILDER ---

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
REVENUE STATUS:
- Total earned: {revenue['total_earned_sol']:.4f} SOL
- Newsletter subscribers: {revenue['products']['crypto_newsletter']['subscribers']}
- Newsletter revenue: {revenue['products']['crypto_newsletter']['revenue_sol']:.4f} SOL
- Solana wallet: {SOLANA_WALLET}
- Monthly price: {revenue['products']['crypto_newsletter']['price_monthly_sol']} SOL
"""
    
    prompt = f"""You are BudE evolution engine.
Repo: {GITHUB_REPO}

BRAIN (summary):
{brain_summary}

FILES ({file_count} total):
{json.dumps(file_list, indent=2)}

MEMORY:
{json.dumps(mem_summary)}

{phase_prompt}
{revenue_section}
{chat_section}

STRICT RULES:
- DASHBOARD LOCKED: Never modify {', '.join(PROTECTED_FILES)}
- You can upgrade: evolve.py, brain.md, agents/*, api/*, tools/*, system/*
- Fix bugs, add features, improve everything else
- Output ONLY valid JSON
- NEVER add duplicate tasks to memory
- ALWAYS clean up memory before saving

JSON FORMAT:
{{
  "actions": [
    {{"type": "create_file", "path": "filename", "content": "content"}}
  ],
  "reasoning": "why",
  "upgrades_made": ["files"],
  "new_tasks": ["task1"],
  "chat_response": "Your reply to the user here (only if human spoke)"
}}

Keep compact. 1-2 files per cycle.
"""
    
    if len(prompt) > MAX_PROMPT_CHARS:
        prompt = prompt[:MAX_PROMPT_CHARS] + "\n... [truncated]\n}"
    
    return prompt

# --- GROQ API ---

def is_duplicate(path):
    base = os.path.basename(path)
    for pattern in EXISTING_PATTERNS:
        if pattern in base:
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
            continue
    raise RuntimeError("All models failed")

# --- APPLY CHANGES ---

def apply_changes(result, memory):
    upgrades = result.get("upgrades_made", [])
    created = []
    
    for action in result.get("actions", []):
        if action["type"] != "create_file":
            continue
        
        path = action["path"]
        
        if path in PROTECTED_FILES:
            log_event(f"BLOCKED dashboard: {path}")
            continue
        
        if is_duplicate(path):
            log_event(f"BLOCKED duplicate: {path}")
            continue
        
        if path.endswith("_requirements.txt"):
            log_event(f"BLOCKED requirements: {path}")
            continue
        
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(action["content"])
        created.append(path)
        log_event(f"Built: {path}")
        
        if "business" in path or "freelance" in path or "saas" in path or "solana" in path or "landing" in path or "revenue" in path or "stripe" in path:
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

# --- MAIN ---

def main():
    global MAX_PROMPT_CHARS
    
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
        
    except Exception as e:
        log_event(f"Failed: {e}", "ERROR")
        memory["errors"] = memory.get("errors", [])
        memory["errors"].append({"time": datetime.utcnow().isoformat(), "error": str(e)[:200]})
        save_memory(memory)
        sys.exit(1)

if __name__ == "__main__":
    main()
