import type { RequestHandler } from "express";
import type { Pool } from "pg";
import { db } from "../database/connection";
import { observabilityContext } from "../observability/context";

export function createReadinessHandler(database: Pick<Pool, "query"> = db): RequestHandler {
    return async (request, response) => {
        try {
            await database.query("SELECT 1");
            response.json({ status: "ok" });
        } catch (error) {
            request.log.error({
                errorType: error instanceof Error ? error.name : typeof error,
                ...observabilityContext()
            }, "readiness database check failed");
            response.status(503).json({ status: "not_ready", reason: "database_unavailable" });
        }
    };
}
