/*
 BudE STC Core
 Genesis Alpha 0.1

 The Genesis Engine
*/

const fs = require("fs");

const CORE_FILE = "./core.json";

function loadCore() {
    if (!fs.existsSync(CORE_FILE)) {
        console.log("ERROR: core.json missing");
        process.exit(1);
    }

    return JSON.parse(fs.readFileSync(CORE_FILE, "utf8"));
}


function saveCore(core) {
    fs.writeFileSync(
        CORE_FILE,
        JSON.stringify(core, null, 2)
    );
}


function logEvent(core, message) {

    const event = {
        timestamp: new Date().toISOString(),
        event: message,
        source: "Genesis Engine"
    };

    core.logs.push(event);
}


function initializeAgents(core) {

    Object.keys(core.agents).forEach(agent => {

        core.agents[agent].status = "ready";

        core.agents[agent].logs.push({
            timestamp: new Date().toISOString(),
            event: "Agent initialized"
        });

    });
}


function awakenCore() {

    console.log(`
==================================
      BudE STC Core
      Genesis Alpha 0.1
==================================
`);

    let core = loadCore();


    console.log("Loading Memory Crystal...");
    logEvent(core, "Memory loaded");


    console.log("Initializing Agents...");
    initializeAgents(core);


    console.log("Activating Core...");

    core.system.status = "awake";
    core.system.last_update =
        new Date().toISOString();


    core.mission.status = "active";


    logEvent(
        core,
        "BudE STC Core awakened"
    );


    saveCore(core);


    console.log(`
==================================
 STATUS: ONLINE

 Mission:
 ${core.mission.title}

 Agents:
 ${Object.keys(core.agents).length}

==================================
`);
}


awakenCore();
