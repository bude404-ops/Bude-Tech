from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import threading
import brain

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

auto_thread = None


@app.get("/")
def home():
    return {"status": "BudE Tech API online"}


@app.get("/status")
def status():
    return brain.get_status()


@app.get("/logs")
def logs():
    return brain.load_memory()["logs"][-50:]


@app.get("/tasks")
def tasks():
    return brain.load_tasks()


@app.post("/task/add/{text}")
def add_task(text: str):
    brain.create_task(text)
    return {"added": text}


@app.post("/auto/toggle")
def auto_toggle():
    global auto_thread

    brain.auto_enabled = not brain.auto_enabled

    if brain.auto_enabled and (auto_thread is None or not auto_thread.is_alive()):
        auto_thread = threading.Thread(target=brain.auto_mode)
        auto_thread.start()

    return {"auto": brain.auto_enabled}
