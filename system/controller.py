import json
import os
import datetime

# File Paths
MANIFEST = 'genesis.json'
STATUS_FILE = 'dashboard/status.json'
INPUT_FILE = 'dashboard/input.json'

def load_manifest():
    with open(MANIFEST, 'r') as f:
        return json.load(f)

def run_control_loop():
    manifest = load_manifest()
    
    # 1. MONITOR: Check for user commands
    command = None
    if os.path.exists(INPUT_FILE):
        with open(INPUT_FILE, 'r') as f:
            command = f.read().strip()
        os.remove(INPUT_FILE) # Execute once, then clear
        print(f"Executing command: {command}")

    # 2. ANALYZE & PLAN: (Simple logic example)
    status = "OPERATIONAL"
    last_action = "Heartbeat check"
    
    if command:
        last_action = f"Processed: {command}"
        # Logic to expand based on command would go here
    
    # 3. EXECUTE: Update status for dashboard
    status_data = {
        "iteration": manifest['evolution_cycle']['current_iteration'],
        "state": status,
        "last_action": last_action,
        "timestamp": str(datetime.datetime.now())
    }
    
    with open(STATUS_FILE, 'w') as f:
        json.dump(status_data, f)
    
    print("Loop complete.")

if __name__ == "__main__":
    run_control_loop()
