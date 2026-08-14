import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Pool } from "pg";
import { createPoolConfig } from "../src/database/pool-config";
import {
    prometheusMetrics,
    recordDatabasePoolError,
    registerDatabasePoolMetrics
} from "../src/observability/metrics";

describe("PostgreSQL pool configuration", () => {
    it("uses conservative production defaults and accepts explicit overrides", () => {
        const defaults = createPoolConfig({ NODE_ENV: "production", DATABASE_URL: "postgresql://example" });
        assert.equal(defaults.max, 5);
        assert.equal(defaults.connectionTimeoutMillis, 5_000);
        assert.equal(defaults.idleTimeoutMillis, 10_000);
        assert.equal(defaults.statement_timeout, 10_000);

        const overridden = createPoolConfig({
            NODE_ENV: "production",
            DATABASE_URL: "postgresql://example",
            DB_POOL_MAX: "3",
            DB_CONNECTION_TIMEOUT_MS: "1200",
            DB_IDLE_TIMEOUT_MS: "8000",
            DB_STATEMENT_TIMEOUT_MS: "2500"
        });
        assert.equal(overridden.max, 3);
        assert.equal(overridden.connectionTimeoutMillis, 1_200);
        assert.equal(overridden.idleTimeoutMillis, 8_000);
        assert.equal(overridden.statement_timeout, 2_500);
    });

    it("cancels a real PostgreSQL query at the configured statement timeout", async () => {
        assert.ok(process.env.DATABASE_URL, "DATABASE_URL is required for the timeout integration test");
        const pool = new Pool(createPoolConfig({
            DATABASE_URL: process.env.DATABASE_URL,
            DB_POOL_MAX: "1",
            DB_CONNECTION_TIMEOUT_MS: "1000",
            DB_IDLE_TIMEOUT_MS: "1000",
            DB_STATEMENT_TIMEOUT_MS: "25"
        }));
        try {
            await assert.rejects(
                pool.query("SELECT pg_sleep(0.2)"),
                (error: Error & { code?: string }) => error.code === "57014"
            );
        } finally {
            await pool.end();
        }
    });

    it("exports saturation and errors with bounded metric dimensions", () => {
        registerDatabasePoolMetrics(() => ({ total: 5, idle: 0, waiting: 2, max: 5 }));
        recordDatabasePoolError();

        const metrics = prometheusMetrics();
        assert.match(metrics, /database_pool_connections\{state="waiting"\} 2/);
        assert.match(metrics, /database_pool_max_connections 5/);
        assert.match(metrics, /database_pool_errors_total 1/);
        assert.doesNotMatch(metrics, /userId|requestId|lobbyId|leagueId/);
    });
});
