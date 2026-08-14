import type { Pool, PoolClient, QueryResult } from "pg";

export type QueryFailureLogger = (error: unknown, startedAt: number) => void;

const instrumentedClients = new WeakSet<PoolClient>();

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

function executeInstrumentedQuery(
  query: (...args: any[]) => any,
  args: any[],
  logFailure: QueryFailureLogger
) {
  const startedAt = performance.now();
  const callbackIndex = args.length - 1;
  if (callbackIndex >= 0 && typeof args[callbackIndex] === "function") {
    const callback = args[callbackIndex];
    args[callbackIndex] = (error: Error | null, result?: QueryResult) => {
      if (error) logFailure(error, startedAt);
      callback(error, result ? camelCaseResult(result) : result);
    };
    return query(...args);
  }

  return Promise.resolve(query(...args)).then(camelCaseResult).catch(error => {
    logFailure(error, startedAt);
    throw error;
  });
}

export function instrumentClient(client: PoolClient, logFailure: QueryFailureLogger): PoolClient {
  if (instrumentedClients.has(client)) return client;
  const query = client.query.bind(client);
  client.query = ((...args: any[]) => executeInstrumentedQuery(query, args, logFailure)) as PoolClient["query"];
  instrumentedClients.add(client);
  return client;
}

export function instrumentPool(pool: Pool, logFailure: QueryFailureLogger): Pool {
  const query = pool.query.bind(pool);
  pool.query = ((...args: any[]) => executeInstrumentedQuery(query, args, logFailure)) as Pool["query"];

  const connect = pool.connect.bind(pool);
  pool.connect = ((callback?: (...args: any[]) => void) => {
    if (callback) {
      return (connect as any)((error: Error | undefined, client: PoolClient, release: () => void) =>
        callback(error, client ? instrumentClient(client, logFailure) : client, release));
    }
    return (connect as any)().then((client: PoolClient) => instrumentClient(client, logFailure));
  }) as Pool["connect"];
  return pool;
}
