import type { PoolConfig } from "pg";

type PoolEnvironment = Record<string, string | undefined>;

function positiveInteger(value: string | undefined, fallback: number) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function createPoolConfig(environment: PoolEnvironment = process.env): PoolConfig {
    const production = environment.NODE_ENV === "production";
    return {
        connectionString: environment.DATABASE_URL,
        max: positiveInteger(environment.DB_POOL_MAX, production ? 5 : 10),
        connectionTimeoutMillis: positiveInteger(environment.DB_CONNECTION_TIMEOUT_MS, 5_000),
        idleTimeoutMillis: positiveInteger(environment.DB_IDLE_TIMEOUT_MS, production ? 10_000 : 30_000),
        statement_timeout: positiveInteger(environment.DB_STATEMENT_TIMEOUT_MS, production ? 10_000 : 15_000)
    };
}
