import json
import time
import os
import threading
from datetime import datetime
import requests

auto_enabled = True

GITHUB_TOKEN = "PUT_GITHUB_TOKEN_HERE"
GITHUB_USER = "PUT_GITHUB_USERNAME_HERE"

MEMORY_FILE = "memory.json"
TASK_FILE = "tasks.json"


def load_memory():
    if not os.path.exists(MEMORY_FILE):
        return {
            "logs": [],
            "completed_tasks": [],
            "workers": {},
            "github": [],
            "solana": {"wallet": "", "revenue": 0, "transactions": []},
            "strategy": []
        }
    return json.load(open(MEMORY_FILE))


def save_memory(m):
    json.dump(m, open(MEMORY_FILE, "w"), indent=2)


def log(msg):
    m = load_memory()
    m["logs"].append({"time": str(datetime.utcnow()), "msg": msg})
    save_memory(m)
    print("[BUD-E]", msg)


def load_tasks():
    if not os.path.exists(TASK_FILE):
        return []
    return json.load(open(TASK_FILE))


def save_tasks(t):
    json.dump(t, open(TASK_FILE, "w"), indent=2)


def create_task(text):
    t = load_tasks()
    t.append({
        "id": len(t)+1,
        "task": text,
        "status": "pending",
        "created": str(datetime.utcnow())
    })
    save_tasks(t)


class Worker:
    def __init__(self, name, role):
        self.name = name
        self.role = role

    def run(self, task):
        log(f"{self.name} → {task['task']}")
        return f"{self.role} completed {task['task']}"


def assign_worker(task):
    t = task["task"].lower()
    if "code" in t or "build" in t:
        return Worker("Engineer", "Dev")
    if "test" in t:
        return Worker("QA", "Tester")
    if "money" in t:
        return Worker("Finance", "Analyst")
    return Worker("CTO", "Architect")


def github_repo(name):
    url = "https://api.github.com/user/repos"
    headers = {"Authorization": f"token {GITHUB_TOKEN}"}

    data = {"name": name.replace(" ", "-"), "private": True}

    r = requests.post(url, headers=headers, json=data)

    log(f"GITHUB REPO: {name}")
    return r.json()


def github_file(repo, path, content):
    url = f"https://api.github.com/repos/{GITHUB_USER}/{repo}/contents/{path}"
    headers = {"Authorization": f"token {GITHUB_TOKEN}"}

    data = {
        "message": "auto commit",
        "content": content.encode().hex()
    }

    r = requests.put(url, headers=headers, json=data)

    log(f"GITHUB FILE: {path}")
    return r.json()


def solana_log(amount, note):
    m = load_memory()
    m["solana"]["revenue"] += amount
    m["solana"]["transactions"].append({
        "time": str(datetime.utcnow()),
        "amount": amount,
        "note": note
    })
    save_memory(m)


def auto_mode():
    global auto_enabled
    log("AUTO MODE STARTED")

    while True:
        if not auto_enabled:
            time.sleep(2)
            continue

        tasks = load_tasks()
        pending = [t for t in tasks if t["status"] == "pending"]

        for task in pending:

            worker = assign_worker(task)
            worker.run(task)

            m = load_memory()
            m["completed_tasks"].append(task)

            if "repo" in task["task"]:
                github_repo(task["task"])

            if "file" in task["task"]:
                github_file("bude-tech", "auto.txt", task["task"])

            if "earn" in task["task"]:
                solana_log(1, "revenue")

            task["status"] = "done"
            save_memory(m)

        save_tasks(tasks)
        time.sleep(2)


def get_status():
    m = load_memory()
    t = load_tasks()

    return {
        "tasks": len(t),
        "completed": len(m["completed_tasks"]),
        "revenue": m["solana"]["revenue"],
        "auto": auto_enabled
    }


if __name__ == "__main__":
    log("BOOT")
    auto_mode()
