import json
from pathlib import Path

ROOT = Path(__file__).parent
STATE_PATH = ROOT / "memory" / "state.json"

def load_state():
    return json.loads(STATE_PATH.read_text())

def save_state(state):
    STATE_PATH.write_text(json.dumps(state, indent=2))

def handle_message(state, msg):
    text = msg.lower()

    if "build" in text:
        response = "Building product scaffold..."
        state["active_task"] = "building product"
        state["logs"].append("Build command received")

    elif "status" in text:
        response = f"Cycle {state['cycle']} | Task: {state['active_task']} | Revenue: {state['revenue_sol']} SOL"

    elif "sell" in text:
        response = "Preparing product for sale (Solana-ready structure placeholder)."
        state["logs"].append("Sell triggered")

    elif "idea" in text:
        response = "Idea: AI farm profit optimizer SaaS with feed + livestock forecasting."

    else:
        response = "Command received. Processing through BudE brain."

    return response

def run_chat(user_input):
    state = load_state()

    state["messages"].append({"role": "user", "content": user_input})

    reply = handle_message(state, user_input)

    state["messages"].append({"role": "bude", "content": reply})
    state["cycle"] += 1

    save_state(state)

    print("\nBudE:", reply)

if __name__ == "__main__":
    while True:
        msg = input("You: ")
        run_chat(msg)
