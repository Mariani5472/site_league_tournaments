import assert from "node:assert/strict";
import http from "node:http";
import { afterEach, describe, it } from "node:test";
import express from "express";
import { io as createClient, type Socket as ClientSocket } from "socket.io-client";
import { createHttpRateLimitMiddleware } from "../src/rate-limit/http-rate-limit";
import { prometheusMetrics } from "../src/observability/metrics";
import { initializeSocket } from "../src/websocket/socket";

const servers: http.Server[] = [];
const clients: ClientSocket[] = [];

afterEach(async () => {
    for (const client of clients.splice(0)) client.disconnect();
    for (const server of servers.splice(0)) {
        server.closeAllConnections();
        await new Promise<void>(resolve => server.close(() => resolve()));
    }
});

async function listen(server: http.Server) {
    servers.push(server);
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    assert(address && typeof address !== "string");
    return `http://127.0.0.1:${address.port}`;
}

async function connect(url: string, token = "rate-user") {
    const client = createClient(url, { auth: { token }, transports: ["websocket"], reconnection: false });
    clients.push(client);
    await new Promise<void>((resolve, reject) => {
        client.once("connect", resolve);
        client.once("connect_error", reject);
    });
    return client;
}

describe("abuse rate limits", () => {
    it("returns HTTP 429 after a burst while health remains exempt", async () => {
        const limitedApp = express();
        limitedApp.use(createHttpRateLimitMiddleware({ limit: 2, windowMs: 60_000, key: () => "test-ip" }));
        limitedApp.get("/health", (_request, response) => response.json({ status: "ok" }));
        limitedApp.get("/resource", (_request, response) => response.json({ ok: true }));
        const url = await listen(http.createServer(limitedApp));

        assert.equal((await fetch(`${url}/resource`)).status, 200);
        assert.equal((await fetch(`${url}/resource`)).status, 200);
        const rejected = await fetch(`${url}/resource`);
        assert.equal(rejected.status, 429);
        assert.equal((await rejected.json() as { code: string }).code, "RATE_LIMITED");
        assert.equal((await fetch(`${url}/health`)).status, 200);
        assert.match(prometheusMetrics(), /rate_limit_rejections_total\{surface="http_ip"\}/);
    });

    it("returns a deterministic Socket ack after an event burst", async () => {
        const server = http.createServer();
        const io = initializeSocket(
            server,
            async token => ({ id: token, email: `${token}@test.local` }),
            { connectionLimit: 10, eventLimit: 2, windowMs: 60_000 }
        );
        io.on("connection", socket => {
            socket.on("burst:test", (ack: (result: unknown) => void) => ack({ ok: true }));
        });
        const client = await connect(await listen(server));

        const emit = () => new Promise<unknown>(resolve => client.emit("burst:test", resolve));
        assert.deepEqual(await emit(), { ok: true });
        assert.deepEqual(await emit(), { ok: true });
        assert.deepEqual(await emit(), {
            ok: false,
            error: { code: "RATE_LIMITED", message: "Too many realtime operations" }
        });
        assert.match(prometheusMetrics(), /rate_limit_rejections_total\{surface="socket_event"\}/);
        await io.close();
    });

    it("rejects excessive Socket reconnect attempts before authentication", async () => {
        const server = http.createServer();
        let authentications = 0;
        const io = initializeSocket(
            server,
            async token => { authentications += 1; return { id: token, email: `${token}@test.local` }; },
            { connectionLimit: 2, eventLimit: 10, windowMs: 60_000 }
        );
        const url = await listen(server);
        (await connect(url, "first")).disconnect();
        (await connect(url, "second")).disconnect();

        const rejected = createClient(url, { auth: { token: "third" }, transports: ["websocket"], reconnection: false });
        clients.push(rejected);
        const error = await new Promise<Error & { data?: { code?: string } }>((resolve, reject) => {
            rejected.once("connect", () => reject(new Error("connection should be rejected")));
            rejected.once("connect_error", resolve);
        });
        assert.equal(error.data?.code, "RATE_LIMITED");
        assert.equal(authentications, 2);
        await io.close();
    });
});
