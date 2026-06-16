import dotenv from "dotenv";
dotenv.config();

import http from "http";
import { app } from "./app";
import { initializeSocket } from "./weboscket/socket";


const server = http.createServer(app);
initializeSocket(server);

server.listen(3000, () => {
  console.log("Server running on port 3000");
});