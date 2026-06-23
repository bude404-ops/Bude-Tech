#!/usr/bin/env python3
"""
BudE Evolution Engine v0.2
Self-evolving AI software system with resilient API handling.
"""

import os
import json
import sys
import requests
from datetime import datetime

# ─── CONFIG ───
REPO_ROOT = os.path.dirname(os.path.abspath(__file__))
MEMORY_PATH = os.path.join(REPO_ROOT, "system", "memory.json")
LOG_PATH = os.path.join(REPO_ROOT, "system", "evolution.log")

# Groq model fallback chain (most capable → fastest)
GROQ_MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "mixtral-8x7b-32768",
    "gemma2-9b-it",
]

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

# ─── UTILITIES ───

def log_event(msg, level="INFO"):
    ts = datetime.utcnow().isoformat()
    entry = f"[{ts}] [{level}] {msg}\n"
    os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)
    with open(LOG_PATH, "a") as f:
        f.write(entry)
    print(entry.strip())

def load_memory():
    if os.path.exists(MEMORY_PATH):
        with open(MEMORY_PATH, "r") as f:
            return json.load(f)
    return {"evolution_cycles": 0, "last_cycle": None, "errors": []}

def save_memory(mem):
    os.makedirs(os.path.dirname(MEMORY_PATH), exist_ok=True)
    with open(MEMORY_PATH, "w") as f:
        json.dump(mem, f, indent=2)

def get_repo_state():
    files = []
    for root, _, filenames in os.walk(REPO_ROOT):
        if ".git" in root:
            continue
        for f in filenames:
            files.append(os.path.relpath(os.path.join(root, f), REPO_ROOT))
    return files

def build_prompt(brain, repo_state):
    state = {
        "files": repo_state[:200],
        "file_count": len(repo_state),
        "time": str(datetime.utcnow())
    }
    return f"""You are BudE evolution engine.

BRAIN:
{brain}

REPOSITORY STATE:
{json.dumps(state, indent=2)}

Return ONLY valid JSON:

{{
  "actions": [
    {{
      "type": "create_file",
      "path": "path/to/file",
      "content": "file content"
    }}
  ],
  "reasoning": "why changes are needed"
}}
"""

def call_groq(prompt, model):
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": "You output only JSON."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.4
    }
    
    try:
        resp = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        
        # CRITICAL FIX: Validate response before accessing choices
        if "error" in data:
            raise RuntimeError(f"Groq API error: {data['error']}")
        
        if "choices" not in data or not data["choices"]:
            raise RuntimeError(f"Unexpected response: {json.dumps(data)[:200]}")
        
        return data["choices"][0]["message"]["content"]
        
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"Request failed: {e}")

def try_models(prompt):
    """Try each model in fallback chain until one succeeds."""
    for model in GROQ_MODELS:
        try:
            log_event(f"Trying model: {model}")
            result = call_groq(prompt, model)
            log_event(f"Success with model: {model}")
            return result, model
        except Exception as e:
            log_event(f"Model {model} failed: {e}", "WARN")
            continue
    
    raise RuntimeError("All models in fallback chain failed.")

def apply_changes(result):
    """Safely apply file changes from evolution plan."""
    for action in result.get("actions", []):
        if action["type"] == "create_file":
            os.makedirs(os.path.dirname(action["path"]), exist_ok=True)
            with open(action["path"], "w") as f:
                f.write(action["content"])
            log_event(f"Created/modified: {action['path']}")

def clean_json_response(raw):
    """Strip markdown code blocks from AI response."""
    cleaned = raw.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    return cleaned.strip()

# ─── MAIN EVOLUTION LOOP ───

def main():
    log_event("=== BudE Evolution Cycle Started ===")
    
    if not GROQ_API_KEY:
        log_event("GROQ_API_KEY not set. Aborting.", "ERROR")
        sys.exit(1)
    
    # Load brain
    brain_path = os.path.join(REPO_ROOT, "brain.md")
    if not os.path.exists(brain_path):
        log_event("brain.md not found. Aborting.", "ERROR")
        sys.exit(1)
    
    with open(brain_path, "r") as f:
        brain = f.read()
    
    memory = load_memory()
    repo_state = get_repo_state()
    prompt = build_prompt(brain, repo_state)
    
    try:
        # Try models with fallback chain
        raw_response, used_model = try_models(prompt)
        
        # Parse JSON safely
        cleaned = clean_json_response(raw_response)
        try:
            result = json.loads(cleaned)
        except json.JSONDecodeError as e:
            log_event(f"JSON parse error: {e}", "ERROR")
            log_event(f"Raw response: {raw_response[:500]}", "DEBUG")
            raise
        
        # Apply changes
        apply_changes(result)
        
        # Update memory
        memory["evolution_cycles"] = memory.get("evolution_cycles", 0) + 1
        memory["last_cycle"] = datetime.utcnow().isoformat()
        memory["last_model_used"] = used_model
        memory["last_reasoning"] = result.get("reasoning", "No reasoning provided")
        memory["errors"] = []
        save_memory(memory)
        
        log_event("=== Evolution cycle completed successfully ===")
        
    except Exception as e:
        log_event(f"Evolution cycle failed: {e}", "ERROR")
        memory["errors"] = memory.get("errors", [])
        memory["errors"].append({
            "time": datetime.utcnow().isoformat(),
            "error": str(e)
        })
        save_memory(memory)
        sys.exit(1)

if __name__ == "__main__":
    main()
