import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import cors from "cors";

import { miosLoop } from "./mios_loop.js";

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

let clients = [];

wss.on("connection", (ws) => {
  clients.push(ws);
  ws.on("close", () => {
    clients = clients.filter(c => c !== ws);
  });
});

function broadcast(data) {
  clients.forEach(ws => {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify(data));
    }
  });
}

// MAIN LOOP
setInterval(async () => {
  const update = await miosLoop();
  broadcast(update);
}, 1500);

server.listen(3001, () => {
  console.log("M-IOS backend running on port 3001");
});
