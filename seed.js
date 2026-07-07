/*
 BudE STC Core
 Genesis Alpha 1.0
 Core Awakening Engine
*/

const fs = require("fs");

const CORE_FILE = "./core.json";


function loadCore(){

    return JSON.parse(
        fs.readFileSync(CORE_FILE,"utf8")
    );

}


function saveCore(core){

    fs.writeFileSync(
        CORE_FILE,
        JSON.stringify(core,null,2)
    );

}


function logEvent(core,message){

    core.logs.push({

        timestamp:
        new Date().toISOString(),

        event: message,

        source:"Genesis Engine"

    });

}



function initializeAgents(core){

    Object.keys(core.agents)
    .forEach(agent=>{

        core.agents[agent].status="ready";

        core.agents[agent].logs.push({

            timestamp:
            new Date().toISOString(),

            event:"Agent initialized"

        });

    });

}



function updateMetrics(core){

    core.core_metrics.total_agents =
    Object.keys(core.agents).length;


    core.core_metrics.total_projects =
    core.project_forge.active_projects.length;


    core.core_metrics.total_knowledge =
    Object.values(core.knowledge_vault)
    .reduce(
        (a,b)=>a+b.length,
        0
    );


    core.core_metrics.last_cycle =
    new Date().toISOString();

}



function createProject(core){

    core.project_forge.active_projects.push({

        id:"PROJECT-001",

        name:"BudE STC Core",

        status:"building",

        phase:"Genesis Alpha",

        created:
        new Date().toISOString()

    });

}



function awaken(){

console.log(
"Awakening BudE STC Core..."
);


let core = loadCore();


initializeAgents(core);


createProject(core);


core.system.status="awake";

core.system.last_update =
new Date().toISOString();


core.mission.status="active";


updateMetrics(core);


logEvent(
core,
"Genesis Alpha awakening complete"
);


saveCore(core);


console.log(
"BudE STC Core ONLINE"
);

}


awaken();
