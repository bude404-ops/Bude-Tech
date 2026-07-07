/*
 BudE STC Core
 Genesis Alpha 0.2

 Genesis Engine + Integrity Validator
*/

const fs = require("fs");


const CORE_FILE = "./core.json";


const REQUIRED_FILES = [
    "core.json",
    "seed.js",
    "index.html",
    "genesis.yml"
];



function checkFiles(){

    console.log("\n[Integrity Check]");

    let missing = [];

    REQUIRED_FILES.forEach(file => {

        if(fs.existsSync(file)){

            console.log("✓ " + file);

        } else {

            console.log("✗ Missing: " + file);
            missing.push(file);

        }

    });


    return missing;

}




function loadCore(){

    if(!fs.existsSync(CORE_FILE)){

        console.log(
            "ERROR: Memory Crystal unavailable"
        );

        process.exit(1);

    }


    return JSON.parse(
        fs.readFileSync(
            CORE_FILE,
            "utf8"
        )
    );

}




function saveCore(core){

    fs.writeFileSync(
        CORE_FILE,
        JSON.stringify(
            core,
            null,
            2
        )
    );

}




function logEvent(core,message){

    core.logs.push({

        timestamp:
        new Date().toISOString(),

        event: message,

        source:
        "Genesis Engine"

    });

}




function initializeAgents(core){


    Object.keys(core.agents)
    .forEach(agent=>{


        core.agents[agent].status =
        "ready";


        core.agents[agent].logs.push({

            timestamp:
            new Date().toISOString(),

            event:
            "Agent activated"

        });


    });


}




function awaken(){


console.log(`
==================================
 BudE STC Core
 Genesis Alpha 0.2

 Integrity Awakening
==================================
`);



let missing = checkFiles();



let core = loadCore();



if(missing.length > 0){


    core.system.status =
    "degraded";


    logEvent(
        core,
        "Integrity failure detected: "
        + missing.join(", ")
    );


}

else{


    core.system.status =
    "awake";


    logEvent(
        core,
        "All Genesis components verified"
    );


}





console.log("\nLoading Memory Crystal...");


console.log(
"Initializing Agent Network..."
);


initializeAgents(core);



core.system.last_update =
new Date().toISOString();


core.mission.status =
"active";



logEvent(
core,
"BudE STC Core Genesis sequence complete"
);



saveCore(core);



console.log(`

==================================
 CORE STATUS:
 ${core.system.status}

 AGENTS:
 ${Object.keys(core.agents).length}

 MISSION:
 ${core.mission.id}

==================================

`);

}



awaken();
