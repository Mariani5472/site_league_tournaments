import { Pool } from "pg";
import { observabilityContext } from "../observability/context";
import { logger } from "../observability/logger";
import { instrumentPool } from "./instrumentation";
import { createPoolConfig } from "./pool-config";
import { recordDatabasePoolError, registerDatabasePoolMetrics } from "../observability/metrics";

const logFailure = (error: unknown, startedAt: number) => logger.error({
    databaseError: error instanceof Error
      ? { name: error.name, message: error.message, code: "code" in error ? error.code : undefined }
      : { name: "UnknownError" },
    ...observabilityContext(),
    operation: "database.query",
    durationMs: Math.round(performance.now() - startedAt)
}, "database query failed");

const pool = new Pool(createPoolConfig());

registerDatabasePoolMetrics(() => ({
  total: pool.totalCount,
  idle: pool.idleCount,
  waiting: pool.waitingCount,
  max: pool.options.max
}));

pool.on("error", error => {
  recordDatabasePoolError();
  logger.error({
    operation: "database.pool",
    errorType: error.name,
    errorCode: "code" in error ? error.code : undefined
  }, "database pool background error");
});

export const db: Pool = instrumentPool(pool, logFailure);
