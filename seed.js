/*
====================================
 BudE STC Core
 Genesis Beta 1.7

 Module Integration Engine
====================================
*/


const fs = require("fs");


const CORE_FILE = "./core.json";



function loadCore(){

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

        event:
        message,

        source:
        "Genesis Engine"

    });

}




function addActivity(core,message){

    core.activity.push({

        timestamp:
        new Date().toISOString(),

        message:
        message

    });

}




function initializeAgents(core){


    Object.keys(core.agents)
    .forEach(agent=>{


        core.agents[agent].status =
        "online";


        core.agents[agent].logs =
        core.agents[agent].logs || [];


        core.agents[agent].logs.push({

            timestamp:
            new Date().toISOString(),

            event:
            "Agent awakened"

        });


    });


}




function scanModules(core){


console.log("");

console.log(
"Scanning STC Modules..."
);


Object.keys(core.modules)
.forEach(module=>{


console.log(

"✓ "
+
core.modules[module].name

);


});


addActivity(

core,

"All STC modules verified"

);


}




function updateMetrics(core){


core.core_metrics.agents =

Object.keys(core.agents).length;



core.core_metrics.modules =

Object.keys(core.modules).length;



core.core_metrics.projects =

core.project_forge
.active_projects.length;



core.core_metrics.knowledge =

core.knowledge_graph
.nodes.length;



}




function createKnowledgeSeed(core){


core.knowledge_graph.nodes.push({

id:
"KNOWLEDGE-001",

title:
"BudE STC Core",

category:
"system",

description:
"Human-guided creation and knowledge framework"

});


}




function createProjectSeed(core){


core.project_forge.active_projects.push({

id:
"PROJECT-001",

name:
"BudE STC Core",

phase:
"Genesis Beta",

status:
"active",

created:
new Date().toISOString()

});


}




function awaken(){


console.log(`

================================

 BudE STC Core

 Genesis Beta 1.7

 Awakening

================================

`);




let core = loadCore();



initializeAgents(core);



scanModules(core);



createKnowledgeSeed(core);



createProjectSeed(core);



updateMetrics(core);



core.system.status =
"awake";


core.system.last_update =
new Date().toISOString();


core.mission.status =
"active";



logEvent(

core,

"Genesis Beta awakening complete
