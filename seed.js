/*
================================================

 BudE STC Core

 Genesis Engine

 Release Candidate 4.1

================================================
*/


const STC = {

    version: "4.1.0",

    name: "BudE STC Core",

    status: "awakening"

};



function log(message){

    console.log(
        "[STC] " + message
    );

}




function loadMemory(core){

    if(
        typeof localStorage !== "undefined"
    ){

        let saved =
        localStorage.getItem(
            "BUDE_STC_MEMORY"
        );


        if(saved){

            return JSON.parse(saved);

        }

    }


    return core;

}





function saveMemory(core){

    if(
        typeof localStorage !== "undefined"
    ){

        localStorage.setItem(

            "BUDE_STC_MEMORY",

            JSON.stringify(
                core,
                null,
                2
            )

        );

    }

}





function awaken(core){


    log(
        "Genesis Sequence Started"
    );


    core =
    loadMemory(core);



    verifyCore(core);



    initializeAgents(core);



    core.system.version =
    STC.version;


    core.system.status =
    "online";



    recordEvent(

        core,

        "Core Awakening"

    );



    saveMemory(core);



    log(
        "BudE STC Core Online"
    );


    return core;

}





function verifyCore(core){


    log(
        "Verifying Architecture"
    );


    if(!core.identity){

        log(
            "Identity Missing"
        );

    }


    if(!core.agents){

        log(
            "Agents Missing"
        );

    }


    log(
        "Architecture Verified"
    );


}






function initializeAgents(core){


    Object.keys(

        core.agents

    )

    .forEach(agent=>{


        core.agents[agent].status =
        "active";


        log(

            "Agent Ready: "
            +
            agent

        );


    });


}






function processCommand(core,command){


    let mission = {


        id:

        "MISSION-"

        +

        Date.now(),


        directive:

        command,


        assigned: [],


        status:

        "queued",


        created:

        new Date().toISOString()


    };



    let text =
    command.toLowerCase();



    if(
        text.includes("create")
        ||
        text.includes("design")
    ){

        mission.assigned.push(
            "forge"
        );

    }



    if(
        text.includes("research")
        ||
        text.includes("study")
    ){

        mission.assigned.push(
            "researcher"
        );

    }



    if(
        text.includes("farm")
        ||
        text.includes("habitat")
        ||
        text.includes("environment")
    ){

        mission.assigned.push(
            "civilization"
        );

    }



    if(
        text.includes("test")
        ||
        text.includes("simulate")
    ){

        mission.assigned.push(
            "simulation"
        );

    }



    if(
        mission.assigned.length === 0
    ){

        mission.assigned.push(
            "strategium"
        );

    }



    core.command_center.received++;


    core.command_center.queue.push(
        mission
    );


    core.command_center.history.push(
        mission
    );



    recordEvent(

        core,

        "Command Received"

    );



    saveMemory(core);



    return mission;

}





function recordEvent(core,event){


    core.memory.events.push({

        event:event,


        time:

        new Date().toISOString()

    });


}





function report(core){


    return {


        name:
        core.system.name,


        version:
        core.system.version,


        status:
        core.system.status,


        metrics:
        core.metrics


    };


}





// Browser support

if(
typeof window !== "undefined"
){

    window.STC = {

        awaken,

        processCommand,

        report

    };

}





// Node support

if(
typeof module !== "undefined"
){

    module.exports = {

        awaken,

        processCommand,

        report

    };

}
