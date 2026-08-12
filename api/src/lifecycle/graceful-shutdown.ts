import type { Server as HttpServer } from "http";
import type { Server as SocketServer } from "socket.io";
import type { Pool } from "pg";
import { logger } from "../observability/logger";

type StoppableWorker = { stop(): Promise<void> | void };

type ShutdownDependencies = {
    server: HttpServer;
    io: SocketServer;
    worker: StoppableWorker;
    db: Pick<Pool, "end">;
    drainOperations: () => Promise<void>;
    timeoutMs?: number;
    forceExit?: (code: number) => void;
};

function closeHttpServer(server: HttpServer) {
    return new Promise<void>((resolve, reject) => {
        server.close(error => {
            if (error && (error as NodeJS.ErrnoException).code !== "ERR_SERVER_NOT_RUNNING") reject(error);
            else resolve();
        });
    });
}

export function createGracefulShutdown({
    server,
    io,
    worker,
    db,
    drainOperations,
    timeoutMs = Number(process.env.SHUTDOWN_TIMEOUT_MS ?? 25_000),
    forceExit = code => process.exit(code)
}: ShutdownDependencies) {
    let shutdownPromise: Promise<void> | undefined;

    return (signal: NodeJS.Signals) => {
        if (shutdownPromise) return shutdownPromise;

        shutdownPromise = (async () => {
            logger.info({ signal, timeoutMs }, "graceful shutdown started");
            const timeout = setTimeout(() => {
                logger.error({ signal, timeoutMs }, "graceful shutdown timed out");
                io.disconnectSockets(true);
                server.closeAllConnections();
                void db.end().finally(() => forceExit(1));
            }, timeoutMs);

            try {
                await worker.stop();
                const httpClose = closeHttpServer(server);
                io.disconnectSockets(true);
                await drainOperations();
                server.closeIdleConnections();
                await httpClose;
                await io.close().catch(error => {
                    if ((error as NodeJS.ErrnoException).code !== "ERR_SERVER_NOT_RUNNING") throw error;
                });
                await db.end();
                clearTimeout(timeout);
                logger.info({ signal }, "graceful shutdown completed");
            } catch (error) {
                clearTimeout(timeout);
                logger.error({ error, signal }, "graceful shutdown failed");
                throw error;
            }
        })();

        return shutdownPromise;
    };
}
