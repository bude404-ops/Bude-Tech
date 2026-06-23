#!/usr/bin/env python3
"""
BudE GitHub Tools v0.1
Advanced GitHub operations
"""

import os
import requests

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
REPO = "bude404-ops/Bude-Tech"
HEADERS = {"Authorization": f"token {GITHUB_TOKEN}", "Accept": "application/vnd.github.v3+json"}

def create_pr(title, body, branch="feature/auto-update"):
    """Create pull request."""
    try:
        # Create branch first
        # Then PR
        url = f"https://api.github.com/repos/{REPO}/pulls"
        payload = {
            "title": title,
            "body": body,
            "head": branch,
            "base": "main"
        }
        resp = requests.post(url, headers=HEADERS, json=payload, timeout=30)
        return resp.json().get("html_url")
    except Exception as e:
        return f"Error: {e}"

def create_issue(title, body, labels=["auto", "evolution"]):
    """Create GitHub issue."""
    try:
        url = f"https://api.github.com/repos/{REPO}/issues"
        payload = {"title": title, "body": body, "labels": labels}
        resp = requests.post(url, headers=HEADERS, json=payload, timeout=30)
        return resp.json().get("html_url")
    except Exception as e:
        return f"Error: {e}"

def get_recent_commits(count=5):
    """Get recent commits."""
    try:
        url = f"https://api.github.com/repos/{REPO}/commits?per_page={count}"
        resp = requests.get(url, headers=HEADERS, timeout=30)
        return [{
            "message": c["commit"]["message"],
            "author": c["commit"]["author"]["name"],
            "time": c["commit"]["author"]["date"],
            "sha": c["sha"][:7]
        } for c in resp.json()]
    except:
        return []

def review_own_code(file_path, content):
    """Self-review code before commit."""
    issues = []
    
    # Check for common issues
    if "TODO" in content:
        issues.append("Contains TODO items")
    if "FIXME" in content:
        issues.append("Contains FIXME items")
    if "hardcoded" in content.lower():
        issues.append("Possible hardcoded values")
    if len(content) > 5000:
        issues.append("File is very large, consider splitting")
    
    # Check for secrets
    secret_patterns = ["api_key", "password", "secret", "token"]
    for pattern in secret_patterns:
        if pattern in content.lower() and "=" in content:
            issues.append(f"Possible secret exposure: {pattern}")
    
    return {
        "pass": len(issues) == 0,
        "issues": issues,
        "suggestions": ["Add docstrings", "Add type hints", "Add error handling"] if len(issues) < 3 else []
    }
