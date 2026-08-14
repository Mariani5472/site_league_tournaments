import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Request, Response } from "express";
import type { Pool } from "pg";
import { createReadinessHandler } from "../src/health/readiness";

describe("database readiness", () => {
    it("distinguishes database unavailability from process liveness", async () => {
        let statusCode = 200;
        let body: unknown;
        const request = { log: { error() {} } } as unknown as Request;
        const response = {
            status(code: number) { statusCode = code; return response; },
            json(value: unknown) { body = value; return response; }
        } as unknown as Response;
        const unavailableDatabase = {
            query: async () => { throw new Error("connection timeout"); }
        } as unknown as Pick<Pool, "query">;

        await createReadinessHandler(unavailableDatabase)(request, response, () => undefined);

        assert.equal(statusCode, 503);
        assert.deepEqual(body, { status: "not_ready", reason: "database_unavailable" });
    });
});
