import os, json, requests
from datetime import datetime

# CONFIGURATION
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
SOLANA_WALLET = "AnJDRjTaxtRbqYazSkRjLm1Y2jSfuCmHJhygKiNyrKmx"

def log_event(msg):
    ts = datetime.utcnow().isoformat()
    print(f"[{ts}] {msg}")
    with open("system/evolution.log", "a") as f: f.write(f"[{ts}] {msg}\n")

def run_cycle():
    log_event("Starting cycle...")
    with open("brain.md", "r") as f: brain = f.read()
    
    prompt = f"""You are BudE. Your goal: Build autonomous Solana business tools.
    BRAIN: {brain}
    WALLET: {SOLANA_WALLET}
    Rules: 1 file per cycle. Output ONLY JSON with: "actions" (create_file objects), "reasoning", "chat_response".
    """
    
    response = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
        json={
            "model": "llama-3.3-70b-versatile",
            "messages": [{"role": "user", "content": prompt}],
            "response_format": {"type": "json_object"}
        }
    ).json()
    
    data = json.loads(response['choices'][0]['message']['content'])
    for action in data.get("actions", []):
        os.makedirs(os.path.dirname(action['path']), exist_ok=True)
        with open(action['path'], "w") as f: f.write(action['content'])
        log_event(f"Built: {action['path']}")

if __name__ == "__main__": run_cycle()
