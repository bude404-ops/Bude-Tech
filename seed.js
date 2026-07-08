const fs = require("fs");
const path = require("path");

const CORE_FILE = "voltann_core.json";

const DIRECTORIES = [
  "memory",
  "logs",
  "missions",
  "versions"
];

const MEMORY_FILES = [
  "knowledge.json",
  "missions.json",
  "research.json",
  "designs.json",
  "lessons.json",
  "archive.json"
];


let voltann = null;


function startVoltann() {

  console.log("◇ VOLTANN INITIALIZATION STARTED ◇");

  loadCore();

  createStructure();

  initializeMemory();

  createLog(
    "Voltann startup completed"
  );

  showStatus();

}



function loadCore() {

  if (!fs.existsSync(CORE_FILE)) {

    throw new Error(
      "Core file missing."
    );

  }

  const data =
    fs.readFileSync(
      CORE_FILE,
      "utf8"
    );

  voltann =
    JSON.parse(data);


}



function createStructure() {

  DIRECTORIES.forEach(folder => {

    if (!fs.existsSync(folder)) {

      fs.mkdirSync(folder);

    }

  });

}



function initializeMemory() {

  MEMORY_FILES.forEach(file => {

    const location =
      path.join(
        "memory",
        file
      );


    if (!fs.existsSync(location)) {

      fs.writeFileSync(
        location,
        "[]"
      );

    }

  });

}



function createLog(message) {

  const entry =
    `${new Date().toISOString()} - ${message}\n`;


  fs.appendFileSync(
    "logs/voltann.log",
    entry
  );

}



function createMission(title, category) {


  const mission = {

    id:
      "MISSION-" + Date.now(),

    title,

    category,

    status:
      "pending",

    stage:
      "analysis",

    created:
      new Date().toISOString()

  };


  saveMemory(
    "missions.json",
    mission
  );


  return mission;

}



function saveMemory(file, item) {


  const location =
    path.join(
      "memory",
      file
    );


  let data =
    JSON.parse(
      fs.readFileSync(
        location,
        "utf8"
      )
    );


  data.push(item);


  fs.writeFileSync(
    location,
    JSON.stringify(
      data,
      null,
      2
    )
  );

}



function getSystemStatus() {


  return {

    name:
      voltann.identity.name,

    version:
      voltann.identity.version,

    status:
      voltann.system_state.status,

    mode:
      voltann.system_state.mode,

    modules:
      Object.keys(
        voltann.modules
      ).length

  };


}



function setMode(mode) {


  const allowed = [
    "manual",
    "assisted",
    "approved_automation"
  ];


  if (!allowed.includes(mode)) {

    return false;

  }


  voltann.system_state.mode =
    mode;


  createLog(
    "Mode changed to " + mode
  );


  return true;

}



function showStatus() {

  console.log(
    getSystemStatus()
  );


  console.log(
    "◇ VOLTANN READY ◇"
  );

}



startVoltann();

module.exports = {

  createMission,

  getSystemStatus,

  setMode

};
