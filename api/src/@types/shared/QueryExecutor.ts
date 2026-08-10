import { Pool, PoolClient } from "pg";
export type QueryExecutor = Pick<Pool | PoolClient, "query">;
