import "dotenv/config";
import http from "http";
import { app } from "./app";
import { initializeSocket } from "./websocket/socket";
import { CaptainElectionWorker } from "./modules/lobbies/captain-election.worker";
const server = http.createServer(app);
initializeSocket(server);
const captainElectionWorker = new CaptainElectionWorker();
captainElectionWorker.start();
const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
