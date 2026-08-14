import assert from "node:assert/strict";
import http from "node:http";
import { afterEach, describe, it } from "node:test";
import express from "express";
import { createMetricsAuthMiddleware, validateMetricsConfiguration } from "../src/security/metrics-auth";

const servers: http.Server[] = [];

afterEach(async () => {
    for (const server of servers.splice(0)) {
        server.closeAllConnections();
        await new Promise<void>(resolve => server.close(() => resolve()));
    }
});

async function createServer() {
    const testApp = express();
    testApp.get("/health/live", (_request, response) => response.json({ status: "ok" }));
    testApp.get("/health/ready", (_request, response) => response.json({ status: "ok" }));
    testApp.get("/health", (_request, response) => response.json({ status: "ok" }));
    testApp.get("/metrics", createMetricsAuthMiddleware({ token: "scrape-secret", allowAnonymous: false }),
        (_request, response) => response.type("text/plain").send("metric 1\n"));
    const server = http.createServer(testApp);
    servers.push(server);
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    assert(address && typeof address !== "string");
    return `http://127.0.0.1:${address.port}`;
}

describe("metrics access policy", () => {
    it("returns 401 for anonymous and invalid scrapers", async () => {
        const url = await createServer();
        const anonymous = await fetch(`${url}/metrics`);
        assert.equal(anonymous.status, 401);
        assert.match(anonymous.headers.get("www-authenticate") ?? "", /bearer/i);
        assert.equal((await anonymous.json() as { code: string }).code, "UNAUTHENTICATED");
        assert.equal((await fetch(`${url}/metrics`, {
            headers: { authorization: "Bearer wrong-secret" }
        })).status, 401);
    });

    it("allows the authorized scraper", async () => {
        const url = await createServer();
        const response = await fetch(`${url}/metrics`, {
            headers: { authorization: "Bearer scrape-secret" }
        });
        assert.equal(response.status, 200);
        assert.equal(await response.text(), "metric 1\n");
    });

    it("keeps liveness and readiness public", async () => {
        const url = await createServer();
        for (const path of ["/health/live", "/health/ready", "/health"]) {
            assert.equal((await fetch(`${url}${path}`)).status, 200);
        }
    });

    it("requires a metrics token in production", () => {
        assert.throws(() => validateMetricsConfiguration({ NODE_ENV: "production" }), /METRICS_TOKEN/);
        assert.doesNotThrow(() => validateMetricsConfiguration({
            NODE_ENV: "production", METRICS_TOKEN: "configured"
        }));
    });
});
