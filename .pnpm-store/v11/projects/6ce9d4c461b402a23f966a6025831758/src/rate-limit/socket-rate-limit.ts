import type { Socket } from "socket.io";
import { logger } from "../observability/logger";
import { recordRateLimitRejection } from "../observability/metrics";
import type { SocketActionAck } from "../websocket/socket-action";
import { SOCKET_EVENTS } from "../websocket/socket-events";
import { FixedWindowRateLimiter, positiveInteger } from "./fixed-window";

export type SocketRateLimitOptions = {
    connectionLimit?: number;
    eventLimit?: number;
    windowMs?: number;
};

export function createSocketRateLimiters(options: SocketRateLimitOptions = {}) {
    const windowMs = options.windowMs ?? positiveInteger(process.env.SOCKET_RATE_LIMIT_WINDOW_MS, 60_000);
    const connections = new FixedWindowRateLimiter(
        options.connectionLimit ?? positiveInteger(process.env.SOCKET_CONNECTION_RATE_LIMIT, 20), windowMs
    );
    const events = new FixedWindowRateLimiter(
        options.eventLimit ?? positiveInteger(process.env.SOCKET_EVENT_RATE_LIMIT, 30), windowMs
    );
    const knownEvents = new Set<string>(Object.values(SOCKET_EVENTS));

    return {
        connection(socket: Socket, next: (error?: Error) => void) {
            const address = socket.handshake.address || "unknown";
            const decision = connections.consume(address);
            if (decision.allowed) return next();
            recordRateLimitRejection("socket_connection");
            logger.warn({ operation: "rate_limit.reject", surface: "socket_connection" }, "socket connection rate limited");
            const error = new Error("Too many connection attempts") as Error & { data?: unknown };
            error.data = { code: "RATE_LIMITED", retryAfterMs: decision.retryAfterMs };
            next(error);
        },
        events(socket: Socket) {
            socket.use(([event, ...args], next) => {
                const eventBucket = knownEvents.has(event) ? event : "unknown";
                const decision = events.consume(`${socket.data.user.id}|${eventBucket}`);
                if (decision.allowed) return next();
                recordRateLimitRejection("socket_event");
                logger.warn({ operation: "rate_limit.reject", surface: "socket_event" }, "socket event rate limited");
                const result = { ok: false as const, error: { code: "RATE_LIMITED", message: "Too many realtime operations" } };
                const ack = args.at(-1) as SocketActionAck | undefined;
                if (typeof ack === "function") ack(result);
                else socket.emit(SOCKET_EVENTS.ERROR, result.error);
            });
        }
    };
}
