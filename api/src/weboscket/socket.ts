import { Server as HTTPServer } from "http";
import { Server } from "socket.io";
import { registerSocketHandlers } from "./socket-handlers";
import { createSocketAuthMiddleware, SocketAuthenticator } from "../middlewares/socket.middleware";
import { corsOrigin } from "../config/runtime";
let io: Server;
export function initializeSocket(server: HTTPServer, authenticate?: SocketAuthenticator) {
    io = new Server(server, {
        maxHttpBufferSize: 100000,
        cors: {
            origin: corsOrigin,
            credentials: true,
        }
    });
    io.use(createSocketAuthMiddleware(authenticate));
    registerSocketHandlers(io);
    return io;
}
export function getIO() {
    if (!io) {
        throw new Error("Socket not initialized");
    }
    return io;
}
