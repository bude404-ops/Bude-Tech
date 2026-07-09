import sys
import os
import subprocess

def git_sync(message):
    try:
        subprocess.run(["git", "add", "."], check=True)
        subprocess.run(["git", "commit", "-m", message], check=True)
        subprocess.run(["git", "push"], check=True)
        print("[VAULT] Knowledge synchronized.")
    except Exception as e:
        print(f"[ERROR] Sync failed: {e}")

def grow():
    print("[CORE] Running self-healing protocol...")
    os.makedirs("archives", exist_ok=True)
    if not os.path.exists("missions.md"):
        with open("missions.md", "w") as f: f.write("# Human Advancement Missions\n")
    if not os.path.exists("archives/ledger.md"):
        with open("archives/ledger.md", "w") as f: f.write("# Core Ledger\n")
    git_sync("Core: Integrity check passed")

def execute_command(cmd, args):
    if cmd == "add":
        note = " ".join(args)
        with open("archives/ledger.md", "a") as f: f.write(f"- {note}\n")
        git_sync(f"Entry: {note[:20]}")
    elif cmd == "mission":
        mission = " ".join(args)
        with open("missions.md", "a") as f: f.write(f"- [MISSION] {mission}\n")
        git_sync(f"Mission added: {mission[:15]}")
    elif cmd == "forge":
        print("[CORE] Executing innovation synthesis...")
        git_sync("Forge: Deep synthesis run")
    elif cmd == "grow":
        grow()
    elif cmd == "status":
        print("[CORE] Status: ONLINE | Objective: STAR-REACH")

if __name__ == "__main__":
    if len(sys.argv) < 2: print("Commands: add, mission, forge, grow, status")
    else: execute_command(sys.argv[1], sys.argv[2:])
