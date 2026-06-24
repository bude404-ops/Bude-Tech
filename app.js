let data = {
  state: {},
  employees: {},
  tasks: [],
  activity: []
};

/* -----------------------------
   LOAD DATA FROM BACKEND FILES
------------------------------*/
async function loadData() {
  try {
    const [state, employees, tasks, activity] = await Promise.all([
      fetch('core/state.json').then(r => r.json()),
      fetch('core/employees.json').then(r => r.json()),
      fetch('core/tasks.json').then(r => r.json()),
      fetch('core/activity.json').then(r => r.json())
    ]);

    data = { state, employees, tasks, activity };
    render(currentTab);
  } catch (err) {
    console.error("Load error:", err);
  }
}

/* -----------------------------
   NAV STATE
------------------------------*/
let currentTab = "home";

/* -----------------------------
   TAB SWITCH
------------------------------*/
function tab(name) {
  currentTab = name;
  render(name);
}

/* -----------------------------
   MAIN RENDER ENGINE (MOBILE UI)
------------------------------*/
function render(tab) {
  const app = document.getElementById("app");
  if (!data.state.version) return;

  /* ---------------- HOME ---------------- */
  if (tab === "home") {
    app.innerHTML = `
      <div class="hero">
        <h2>🧠 BudE Control Hub</h2>
        <p><b>Goal:</b> ${data.state.goal}</p>
        <p><b>Status:</b> ${data.state.paused ? "Paused" : "Active"}</p>
        <p><b>Version:</b> V${data.state.version}</p>
      </div>

      <div class="card">
        <h3>⚡ Quick Actions</h3>
        <button onclick="sendCmd('add improve system')">➕ Add Task</button>
        <button onclick="sendCmd('assign builder_1 optimize ui')">👷 Assign Task</button>
        <button onclick="sendCmd('start')">▶ Start Work</button>
        <button onclick="sendCmd('complete')">✅ Complete Task</button>
      </div>
    `;
  }

  /* ---------------- TEAM ---------------- */
  if (tab === "team") {
    app.innerHTML = `
      <div class="card">
        <h3>👷 Team Overview</h3>
      </div>
    `;

    app.innerHTML += Object.entries(data.employees).map(([name, emp]) => `
      <div class="card">
        <h3>👤 ${name}</h3>
        <p><span class="badge">${emp.role}</span></p>
        <p>Tasks completed: <b>${emp.tasks}</b></p>
        <button onclick="sendCmd('assign '+name+' new optimization task')">
          Assign Task
        </button>
      </div>
    `).join("");
  }

  /* ---------------- TASKS ---------------- */
  if (tab === "tasks") {
    app.innerHTML = `
      <div class="card">
        <h3>📋 Task Board</h3>
      </div>
    `;

    app.innerHTML += data.tasks.map(t => `
      <div class="card">
        <h3>${t.task}</h3>
        <p>
          <span class="badge">${t.status}</span>
        </p>
        <p>Assigned: <b>${t.assigned_to}</b></p>

        <button onclick="sendCmd('approve')">✅ Approve</button>
        <button onclick="sendCmd('reject')">❌ Reject</button>
      </div>
    `).join("");
  }

  /* ---------------- ACTIVITY ---------------- */
  if (tab === "activity") {
    app.innerHTML = `
      <div class="card">
        <h3>📊 Activity Feed</h3>
      </div>
    `;

    app.innerHTML += data.activity.slice().reverse().map(a => `
      <div class="card">
        <p>• ${a.event}</p>
      </div>
    `).join("");
  }

  /* ---------------- CHAT ---------------- */
  if (tab === "chat") {
    app.innerHTML = `
      <div class="card">
        <h3>💬 Command Center</h3>
        <p>Type natural commands:</p>

        <input 
          id="cmd" 
          placeholder="e.g. add build dashboard / assign builder_1 task"
          style="width:100%;padding:12px;border-radius:10px;border:none;margin-top:10px;"
        />

        <button onclick="send()">Send Command</button>
      </div>

      <div class="card">
        <h3>⚡ Examples</h3>
        <p>• add optimize system</p>
        <p>• assign builder_1 fix UI</p>
        <p>• start</p>
        <p>• complete</p>
      </div>
    `;
  }
}

/* -----------------------------
   SEND COMMAND TO BACKEND
------------------------------*/
function send() {
  const cmd = document.getElementById("cmd").value;
  sendCmd(cmd);
}

function sendCmd(cmd) {
  if (!cmd) return;

  fetch("core/state.json", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command: cmd })
  }).then(() => {
    document.getElementById("cmd")?.value = "";
    setTimeout(loadData, 1000);
  });
}

/* -----------------------------
   AUTO REFRESH LOOP
------------------------------*/
loadData();
setInterval(loadData, 5000);
