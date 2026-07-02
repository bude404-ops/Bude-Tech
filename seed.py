import json
from pathlib import Path

ROOT = Path(__file__).parent
STATE_PATH = ROOT / "memory" / "state.json"

def load_state():
    return json.loads(STATE_PATH.read_text())

def save_state(state):
    STATE_PATH.write_text(json.dumps(state, indent=2))

def brain_cycle(state):
    # simple autonomous decision engine

    state["cycle"] += 1

    if state["cycle"] % 3 == 0:
        state["active_task"] = "Generating product idea"
        response = "Created new SaaS idea for AI automation tool."
        state["products"].append("AI SaaS concept v" + str(state["cycle"]))

    else:
        state["active_task"] = "Idle analysis"
        response = "Analyzing system performance..."

    state["logs"].append(response)
    state["messages"].append({"role": "bude", "content": response})

    return state

def run():
    state = load_state()
    state = brain_cycle(state)
    save_state(state)

    print("Cycle complete:", state["cycle"])

if __name__ == "__main__":
    run()
