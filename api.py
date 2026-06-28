from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import threading
import brain
import update_engine

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

thread = None


# ----------------------------------------------------------
# CORE SYSTEM
# ----------------------------------------------------------

@app.get("/status")
def status():
    return brain.get_status()


@app.get("/logs")
def logs():
    return brain.load_memory()["logs"][-50:]


@app.get("/tasks")
def tasks():
    return brain.load_tasks()


@app.post("/task/{text}")
def add_task(text: str):
    brain.create_task(text)
    return {"ok": True}


@app.post("/auto/toggle")
def auto_toggle():
    global thread

    brain.auto_enabled = not brain.auto_enabled

    if brain.auto_enabled and (thread is None or not thread.is_alive()):
        thread = threading.Thread(target=brain.auto_mode)
        thread.start()

    return {"auto": brain.auto_enabled}


# ----------------------------------------------------------
# UPDATE ENGINE CONTROL
# ----------------------------------------------------------

@app.post("/system/apply-updates")
def apply_updates():
    update_engine.run_upgrades()
    return {"status": "updates applied"}


@app.get("/system/upgrades")
def upgrades():
    return update_engine.load_upgrades()


@app.get("/system/upgrades/pending")
def pending():
    return update_engine.get_pending()
