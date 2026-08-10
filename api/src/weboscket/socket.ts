import { Server as HTTPServer } from "http";
import { Server } from "socket.io";
import { registerSocketHandlers } from "./socket-handlers";
import { socketAuthMiddleware } from "../middlewares/socket.middleware";
import { corsOrigin } from "../config/runtime";
let io: Server;
export function initializeSocket(server: HTTPServer) {
    io = new Server(server, {
        maxHttpBufferSize: 100000,
        cors: {
            origin: corsOrigin,
            credentials: true,
        }
    });
    io.use(socketAuthMiddleware);
    registerSocketHandlers(io);
    return io;
}
export function getIO() {
    if (!io) {
        throw new Error("Socket not initialized");
    }
    return io;
}
