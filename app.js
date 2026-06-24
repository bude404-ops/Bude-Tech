function render(tab) {
  const app = document.getElementById("app");

  if (tab === "home") {
    app.innerHTML = `
      <div class="hero">
        <h2>🧠 BudE Control Hub</h2>
        <p>Goal: ${data.state.goal}</p>
        <p>Status: ${data.state.paused ? "Paused" : "Active"}</p>
      </div>

      <div class="card">
        <h3>⚡ Quick Actions</h3>
        <button onclick="sendCmd('add optimize system')">Add Task</button>
        <button onclick="sendCmd('assign builder_1 improve ui')">Assign Task</button>
      </div>
    `;
  }

  if (tab === "team") {
    app.innerHTML = Object.entries(data.employees).map(([k,v]) => `
      <div class="card">
        <h3>👷 ${k}</h3>
        <p><span class="badge">${v.role}</span></p>
        <p>Tasks: ${v.tasks}</p>
        <button onclick="sendCmd('assign '+k+' new task')">Assign</button>
      </div>
    `).join("");
  }

  if (tab === "tasks") {
    app.innerHTML = data.tasks.map(t => `
      <div class="card">
        <h3>${t.task}</h3>
        <p><span class="badge">${t.status}</span></p>
        <p>Assigned: ${t.assigned_to}</p>
      </div>
    `).join("");
  }

  if (tab === "activity") {
    app.innerHTML = `
      <div class="card">
        <h3>📊 Activity Feed</h3>
      </div>
      ${data.activity.map(a => `
        <div class="card">
          <p>• ${a.event}</p>
        </div>
      `).join("")}
    `;
  }

  if (tab === "chat") {
    app.innerHTML = `
      <div class="card">
        <h3>💬 Command Center</h3>
        <input id="cmd" style="width:100%;padding:10px;border-radius:10px;border:none;" placeholder="Type command..." />
        <button onclick="send()">Send</button>
      </div>
    `;
  }
}

function sendCmd(cmd) {
  document.getElementById("cmd").value = cmd;
  send();
}
