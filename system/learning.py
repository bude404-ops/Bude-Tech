#!/usr/bin/env python3
"""
BudE Learning System v0.1
Remembers what works and improves over time
"""

import json
import os
from datetime import datetime

LEARN_FILE = "system/learning.json"

def load_learning():
    if os.path.exists(LEARN_FILE):
        with open(LEARN_FILE, "r") as f:
            return json.load(f)
    return {
        "successful_patterns": [],
        "failed_patterns": [],
        "prompt_versions": [],
        "model_performance": {},
        "cycle_stats": []
    }

def save_learning(data):
    os.makedirs(os.path.dirname(LEARN_FILE), exist_ok=True)
    with open(LEARN_FILE, "w") as f:
        json.dump(data, f, indent=2)

def record_success(pattern, model_used, files_created):
    """Record what worked."""
    learn = load_learning()
    learn["successful_patterns"].append({
        "pattern": pattern,
        "model": model_used,
        "files": files_created,
        "time": datetime.utcnow().isoformat()
    })
    # Keep only last 50
    learn["successful_patterns"] = learn["successful_patterns"][-50:]
    save_learning(learn)

def record_failure(pattern, error, model_used):
    """Record what failed."""
    learn = load_learning()
    learn["failed_patterns"].append({
        "pattern": pattern,
        "error": error,
        "model": model_used,
        "time": datetime.utcnow().isoformat()
    })
    learn["failed_patterns"] = learn["failed_patterns"][-50:]
    save_learning(learn)

def get_best_practices():
    """Extract best practices from history."""
    learn = load_learning()
    successes = learn["successful_patterns"]
    
    if not successes:
        return "No data yet. Run more cycles."
    
    # Find most successful model
    model_counts = {}
    for s in successes:
        model_counts[s["model"]] = model_counts.get(s["model"], 0) + 1
    best_model = max(model_counts, key=model_counts.get) if model_counts else "unknown"
    
    # Find common patterns
    patterns = [s["pattern"] for s in successes]
    common = max(set(patterns), key=patterns.count) if patterns else "none"
    
    return {
        "best_model": best_model,
        "success_count": len(successes),
        "failure_count": len(learn["failed_patterns"]),
        "common_pattern": common,
        "improvement_suggestions": [
            f"Use {best_model} for best results",
            "Keep prompts under 12000 chars",
            "Create one file per cycle",
            "Avoid duplicate file names"
        ]
    }

def improve_prompt(base_prompt):
    """Auto-improve prompt based on learning."""
    learn = load_learning()
    practices = get_best_practices()
    
    # Add learned insights to prompt
    enhanced = base_prompt + f"\n\nLEARNED INSIGHTS:\n"
    enhanced += f"- Best performing model: {practices['best_model']}\n"
    enhanced += f"- Success rate: {practices['success_count']}/{practices['success_count'] + practices['failure_count']}\n"
    
    return enhanced
