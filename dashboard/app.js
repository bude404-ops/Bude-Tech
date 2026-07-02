async function loadState() {
  const res = await fetch("../memory/state.json");
  const data = await res.json();

  document.getElementById("status").innerText =
    "Cycle: " + data.cycle + "\nTask: " + data.active_task;

  const box = document.getElementById("messages");
  box.innerHTML = "";

  data.messages.forEach(m => {
    const div = document.createElement("div");
    div.className = m.role;
    div.innerText = m.role + ": " + m.content;
    box.appendChild(div);
  });
}

async function send() {
  const input = document.getElementById("input");
  const msg = input.value;

  if (!msg) return;

  // NOTE: UI-only (no backend write in this version)
  alert("Connect backend in V6 for live chat execution.");

  input.value = "";
}

setInterval(loadState, 2000);
loadState();
