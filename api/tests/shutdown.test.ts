import assert from "node:assert/strict";
import http from "node:http";
import { afterEach, describe, it } from "node:test";
import { Server as SocketServer } from "socket.io";
import { io as createSocketClient, type Socket } from "socket.io-client";
import { createGracefulShutdown } from "../src/lifecycle/graceful-shutdown";
import { CaptainElectionWorker } from "../src/modules/lobbies/captain-election.worker";

const openServers: http.Server[] = [];
const openSockets: Socket[] = [];

afterEach(async () => {
    for (const socket of openSockets.splice(0)) socket.disconnect();
    for (const server of openServers.splice(0)) {
        server.closeAllConnections();
        await new Promise<void>(resolve => server.close(() => resolve()));
    }
});

describe("graceful shutdown", () => {
    it("stops ingress, drains active operations, and closes the pool last", async () => {
        let releaseRequest!: () => void;
        let requestStarted!: () => void;
        const requestGate = new Promise<void>(resolve => { releaseRequest = resolve; });
        const started = new Promise<void>(resolve => { requestStarted = resolve; });
        const events: string[] = [];
        const server = http.createServer(async (_request, response) => {
            events.push("request:start");
            requestStarted();
            await requestGate;
            events.push("request:end");
            response.end("ok");
        });
        openServers.push(server);
        const io = new SocketServer(server);
        await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
        const address = server.address();
        assert(address && typeof address !== "string");

        const socket = createSocketClient(`http://127.0.0.1:${address.port}`, { transports: ["websocket"] });
        openSockets.push(socket);
        await new Promise<void>((resolve, reject) => {
            socket.once("connect", resolve);
            socket.once("connect_error", reject);
        });

        const request = fetch(`http://127.0.0.1:${address.port}/slow`);
        await started;
        let releaseSocketAction!: () => void;
        const socketAction = new Promise<void>(resolve => { releaseSocketAction = resolve; });
        const shutdown = createGracefulShutdown({
            server,
            io,
            worker: { stop: () => { events.push("worker:stop"); } },
            drainOperations: async () => {
                events.push("socket:drain");
                await Promise.all([socketAction, request.then(() => undefined)]);
            },
            db: { end: async () => { events.push("db:end"); } },
            timeoutMs: 2_000,
            forceExit: () => assert.fail("shutdown should not time out")
        });

        const completion = shutdown("SIGTERM");
        await new Promise(resolve => setTimeout(resolve, 20));
        await assert.rejects(fetch(`http://127.0.0.1:${address.port}/new`));
        assert(!events.includes("db:end"));

        releaseRequest();
        releaseSocketAction();
        assert.equal(await (await request).text(), "ok");
        await completion;

        assert.equal(socket.connected, false);
        assert.equal(events[0], "request:start");
        assert(events.indexOf("worker:stop") < events.indexOf("db:end"));
        assert(events.indexOf("request:end") < events.indexOf("db:end"));
        assert(events.indexOf("socket:drain") < events.indexOf("db:end"));
    });

    it("uses the safety timeout when an operation does not drain", async () => {
        const server = http.createServer();
        openServers.push(server);
        const io = new SocketServer(server);
        await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
        let forcedCode: number | undefined;
        let forceExit!: () => void;
        const forced = new Promise<void>(resolve => { forceExit = resolve; });
        const shutdown = createGracefulShutdown({
            server,
            io,
            worker: { stop: () => undefined },
            drainOperations: () => new Promise(() => undefined),
            db: { end: async () => undefined },
            timeoutMs: 20,
            forceExit: code => { forcedCode = code; forceExit(); }
        });

        void shutdown("SIGTERM");
        await forced;
        assert.equal(forcedCode, 1);
    });

    it("does not start another worker tick after stop begins", async () => {
        let calls = 0;
        let finishRun!: () => void;
        const running = new Promise<void>(resolve => { finishRun = resolve; });
        const worker = new CaptainElectionWorker(undefined, 5);
        (worker as unknown as { service: { finalizeDue(): Promise<number> } }).service = {
            finalizeDue: async () => { calls += 1; await running; return 0; }
        };

        worker.start();
        await new Promise(resolve => setTimeout(resolve, 10));
        const stopped = worker.stop();
        await new Promise(resolve => setTimeout(resolve, 20));
        assert.equal(calls, 1);
        finishRun();
        await stopped;
        await new Promise(resolve => setTimeout(resolve, 10));
        assert.equal(calls, 1);
    });
});
