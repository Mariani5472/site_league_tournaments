import { Server as HTTPServer } from "http";
import { Server } from "socket.io";
import { registerSocketHandlers } from "./socket-handlers";
import { createSocketAuthMiddleware, SocketAuthenticator } from "../middlewares/socket.middleware";
import { corsOrigin } from "../config/runtime";
import { logger } from "../observability/logger";
import { recordSocketConnected, recordSocketDisconnected } from "../observability/metrics";
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
    io.on("connection", socket => {
        recordSocketConnected();
        logger.info({ operation: "socket.connect", userId: socket.data.user.id, socketId: socket.id }, "socket connected");
        socket.once("disconnect", reason => {
            recordSocketDisconnected();
            logger.info({ operation: "socket.disconnect", userId: socket.data.user.id, socketId: socket.id, reason }, "socket disconnected");
        });
    });
    registerSocketHandlers(io);
    return io;
}
export function getIO() {
    if (!io) {
        throw new Error("Socket not initialized");
    }
    return io;
}
