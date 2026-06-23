#!/usr/bin/env python3
"""
BudE Revenue Tracker v0.1
Tracks potential and actual earnings
"""

import json
import os
from datetime import datetime

REVENUE_FILE = "system/revenue.json"

def load_revenue():
    if os.path.exists(REVENUE_FILE):
        with open(REVENUE_FILE, "r") as f:
            return json.load(f)
    return {
        "total_potential": 0,
        "total_actual": 0,
        "tools": {},
        "history": []
    }

def save_revenue(data):
    os.makedirs(os.path.dirname(REVENUE_FILE), exist_ok=True)
    with open(REVENUE_FILE, "w") as f:
        json.dump(data, f, indent=2)

def estimate_tool_revenue(tool_name, tool_type):
    """Estimate monthly revenue potential."""
    estimates = {
        "freelance": {"min": 500, "max": 3000, "desc": "AI coding gigs"},
        "crypto_signals": {"min": 0, "max": 1000, "desc": "Subscription signals (simulation)"},
        "content_generator": {"min": 200, "max": 1500, "desc": "Content creation service"},
        "affiliate": {"min": 50, "max": 500, "desc": "Affiliate commissions"},
        "saas": {"min": 1000, "max": 10000, "desc": "Micro-SaaS subscriptions"},
    }
    return estimates.get(tool_type, {"min": 0, "max": 0, "desc": "Unknown"})

def register_tool(tool_name, tool_type):
    """Register a new revenue tool."""
    rev = load_revenue()
    est = estimate_tool_revenue(tool_name, tool_type)
    
    rev["tools"][tool_name] = {
        "type": tool_type,
        "potential_min": est["min"],
        "potential_max": est["max"],
        "description": est["desc"],
        "created": datetime.utcnow().isoformat(),
        "actual_earnings": 0
    }
    
    rev["total_potential"] = sum(t["potential_max"] for t in rev["tools"].values())
    rev["history"].append({
        "time": datetime.utcnow().isoformat(),
        "event": f"Registered {tool_name}",
        "potential_added": est["max"]
    })
    
    save_revenue(rev)
    return rev

def get_dashboard_data():
    """Get data for revenue dashboard."""
    rev = load_revenue()
    return {
        "total_potential_monthly": rev["total_potential"],
        "total_actual": rev["total_actual"],
        "tool_count": len(rev["tools"]),
        "tools": rev["tools"],
        "latest": rev["history"][-3:] if rev["history"] else []
    }
