import json
import os
import requests
from datetime import datetime

# -----------------------------
# LLM CONNECTOR
# -----------------------------
def llm(prompt):
    try:
        r = requests.post(
            "https://text.pollinations.ai/openai",
            json={
                "model": "openai",
                "messages": [{"role": "user", "content": prompt}]
            },
            timeout=40
        )
        return r.json()["choices"][0]["message"]["content"]
    except:
        return "fallback"

# -----------------------------
# STATE SYSTEM
# -----------------------------
def load(path, default):
    try:
        return json.load(open(path))
    except:
        return default

def save(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    json.dump(data, open(path, "w"), indent=2)

# -----------------------------
# CEO AGENT
# -----------------------------
def ceo(state):
    return llm(f"""
You are CEO of BudE Tech OS.

State:
{state}

Return ONE improvement task:
JSON:
{{
  "task": "",
  "type": "build|fix|improve"
}}
""")

# -----------------------------
# TASK ROUTER
# -----------------------------
def route(task):
    return {
        "id": str(datetime.now()),
        "task": task.get("task", "optimize system"),
        "type": task.get("type", "build"),
        "assigned_to": "builder_1",
        "status": "pending"
    }

# -----------------------------
# EXECUTION ENGINE
# -----------------------------
def execute(task):
    result = llm(f"""
You are a software engineer.

Task:
{task['task']}

Return working code or explanation.
""")

    task["status"] = "done"
    task["result"] = result
    return task

# -----------------------------
# SPA DASHBOARD GENERATOR (FIX)
# -----------------------------
def build_dashboard(state, employees, tasks):
    # IMPORTANT FIX: ALWAYS ROOT FILE
    os.makedirs(".", exist_ok=True)

    html = f"""
<!DOCTYPE html>
<html>
<head>
  <title>BudE V10 OS</title>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <style>
    body {{ font-family: Arial; background:#111; color:#fff; padding:20px; }}
    .box {{ background:#222; padding:10px; margin:10px 0; border-radius:8px; }}
  </style>
</head>
<body>

<h1>🧠 BudE Tech V10 OS</h1>

<div class="box">
<h2>State</h2>
<pre>{json.dumps(state, indent=2)}</pre>
</div>

<div class="box">
<h2>Employees</h2>
<pre>{json.dumps(employees, indent=2)}</pre>
</div>

<div class="box">
<h2>Tasks</h2>
<pre>{json.dumps(tasks, indent=2)}</pre>
</div>

</body>
</html>
"""

    with open("index.html", "w") as f:
        f.write(html)

# -----------------------------
# MAIN LOOP
# -----------------------------
def run():
    state = load("core/state.json", {"version": 10, "goal": "stable OS"})

    employees = load("core/employees.json", {
        "builder_1": {"tasks": 0},
        "qa_1": {"tasks": 0}
    })

    tasks = load("core/tasks.json", [])

    raw = ceo(state)

    try:
        task = json.loads(raw)
    except:
        task = {"task": "optimize system", "type": "build"}

    new_task = route(task)
    tasks.append(new_task)

    tasks[-1] = execute(tasks[-1])

    state["version"] += 1
    state["last_run"] = str(datetime.now())

    save("core/state.json", state)
    save("core/employees.json", employees)
    save("core/tasks.json", tasks)

    build_dashboard(state, employees, tasks)

if __name__ == "__main__":
    run()
