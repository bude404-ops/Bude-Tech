#!/usr/bin/env python3
"""
BudE Self-Awareness Engine — Auto-launched
Learns from evolution cycles, tracks patterns, improves decisions.
"""

import os
import json
from datetime import datetime

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SELF_ANALYSIS_PATH = os.path.join(REPO_ROOT, "system", "self_analysis.json")
LOG_PATH = os.path.join(REPO_ROOT, "system", "evolution.log")

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
        error_lines = [l for l in log_content.split('\n') if '[ERROR]' in l]
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
    return "\nLESSONS FROM PREVIOUS CYCLES:\n" + "\n".join([f"- {l['lesson']}" for l in lessons]) + "\nApply these lessons. Do not repeat past mistakes.\n"

if __name__ == "__main__":
    print("Self-awareness engine loaded.")
