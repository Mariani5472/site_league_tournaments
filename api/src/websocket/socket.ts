import { Server as HTTPServer } from "http";
import { Server } from "socket.io";
import { registerSocketHandlers } from "./socket-handlers";
import { createSocketAuthMiddleware, SocketAuthenticator } from "../middlewares/socket.middleware";
import { corsOrigin } from "../config/runtime";
import { logger } from "../observability/logger";
import { recordSocketConnected, recordSocketDisconnected } from "../observability/metrics";
import { createSocketRateLimiters, SocketRateLimitOptions } from "../rate-limit/socket-rate-limit";
let io: Server;
export function initializeSocket(server: HTTPServer, authenticate?: SocketAuthenticator, rateLimitOptions?: SocketRateLimitOptions) {
    io = new Server(server, {
        maxHttpBufferSize: 100000,
        cors: {
            origin: corsOrigin,
            credentials: true,
        }
    });
    const rateLimiters = createSocketRateLimiters(rateLimitOptions);
    io.use(rateLimiters.connection);
    io.use(createSocketAuthMiddleware(authenticate));
    io.on("connection", socket => {
        void socket.join(`user:${socket.data.user.id}`);
        rateLimiters.events(socket);
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
