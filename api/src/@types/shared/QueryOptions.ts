import { PoolClient } from "pg";
import { QueryExecutor } from "./QueryExecutor";
export type QueryOptions = {
    executor?: QueryExecutor;
};
