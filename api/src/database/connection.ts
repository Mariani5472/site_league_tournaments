import { Pool, type PoolClient, type QueryResult } from "pg";

function camelCaseKey(key: string) {
  return key.replace(/_([a-z0-9])/g, (_, character: string) => character.toUpperCase());
}

function camelCaseValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(camelCaseValue);
  if (value === null || typeof value !== "object" || value instanceof Date || Buffer.isBuffer(value)) return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [camelCaseKey(key), camelCaseValue(nestedValue)])
  );
}

function camelCaseResult<T extends QueryResult>(result: T): T {
  result.rows = result.rows.map(row => camelCaseValue(row)) as T["rows"];
  return result;
}

function executeCamelCaseQuery(query: (...args: any[]) => any, args: any[]) {
  const callbackIndex = args.findLastIndex(argument => typeof argument === "function");

  if (callbackIndex === args.length - 1) {
    const callback = args[callbackIndex];
    args[callbackIndex] = (error: Error | null, result?: QueryResult) =>
      callback(error, result ? camelCaseResult(result) : result);
    return query(...args);
  }

  return Promise.resolve(query(...args)).then(camelCaseResult);
}

function wrapClient(client: PoolClient): PoolClient {
  const query = client.query.bind(client);
  client.query = ((...args: any[]) => executeCamelCaseQuery(query, args)) as PoolClient["query"];
  return client;
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const query = pool.query.bind(pool);
pool.query = ((...args: any[]) => executeCamelCaseQuery(query, args)) as Pool["query"];

const connect = pool.connect.bind(pool);
pool.connect = ((callback?: (...args: any[]) => void) => {
  if (callback) {
    return (connect as any)((error: Error | undefined, client: PoolClient, release: () => void) =>
      callback(error, client ? wrapClient(client) : client, release));
  }

  return (connect as any)().then(wrapClient);
}) as Pool["connect"];

export const db: Pool = pool;
