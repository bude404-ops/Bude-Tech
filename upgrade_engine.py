import json
import os
from datetime import datetime

UPGRADE_FILE = "upgrade_store.json"


def load():
    if not os.path.exists(UPGRADE_FILE):
        return []
    return json.load(open(UPGRADE_FILE))


def save(data):
    json.dump(data, open(UPGRADE_FILE, "w"), indent=2)


def propose_upgrade(title, description, changes):
    store = load()

    store.append({
        "id": len(store) + 1,
        "title": title,
        "description": description,
        "changes": changes,
        "status": "pending",
        "created": str(datetime.utcnow())
    })

    save(store)


def get_pending():
    return [u for u in load() if u["status"] == "pending"]


def mark_applied(uid):
    store = load()

    for u in store:
        if u["id"] == uid:
            u["status"] = "applied"

    save(store)
