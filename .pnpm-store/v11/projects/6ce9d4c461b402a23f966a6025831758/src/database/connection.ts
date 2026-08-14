import { Pool } from "pg";
import { observabilityContext } from "../observability/context";
import { logger } from "../observability/logger";
import { instrumentPool } from "./instrumentation";

const logFailure = (error: unknown, startedAt: number) => logger.error({
    databaseError: error instanceof Error
      ? { name: error.name, message: error.message, code: "code" in error ? error.code : undefined }
      : { name: "UnknownError" },
    ...observabilityContext(),
    operation: "database.query",
    durationMs: Math.round(performance.now() - startedAt)
}, "database query failed");

export const db: Pool = instrumentPool(
  new Pool({ connectionString: process.env.DATABASE_URL }),
  logFailure
);
