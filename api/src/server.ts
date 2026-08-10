import "dotenv/config";
import http from "http";
import { app } from "./app";
import { initializeSocket } from "./weboscket/socket";
const server = http.createServer(app);
initializeSocket(server);
const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
