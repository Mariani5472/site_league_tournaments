import "dotenv/config";
import http from "http";
import { app } from "./app";
import { initializeSocket } from "./websocket/socket";
import { CaptainElectionWorker } from "./modules/lobbies/captain-election.worker";
import { db } from "./database/connection";
import { drainSocketActions } from "./websocket/socket-action";
import { createGracefulShutdown } from "./lifecycle/graceful-shutdown";
import { drainHttpOperations } from "./lifecycle/http-operations";
import { validateTopology } from "./config/topology";
import { validateMetricsConfiguration } from "./security/metrics-auth";
validateTopology();
validateMetricsConfiguration();
const server = http.createServer(app);
const io = initializeSocket(server);
const captainElectionWorker = new CaptainElectionWorker();
captainElectionWorker.start();
const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

const shutdown = createGracefulShutdown({
    server,
    io,
    worker: captainElectionWorker,
    db,
    drainOperations: () => Promise.all([drainHttpOperations(), drainSocketActions()]).then(() => undefined)
});

for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.once(signal, () => {
        void shutdown(signal).then(() => {
            process.exitCode = 0;
        }).catch(() => {
            process.exitCode = 1;
        });
    });
}
