import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Pool, PoolClient, QueryResult } from "pg";
import { instrumentPool } from "../src/database/instrumentation";

function result(): QueryResult {
  return {
    command: "SELECT",
    rowCount: 1,
    oid: 0,
    fields: [],
    rows: [{ snake_case: 1, nested_value: { other_key: 2 } }]
  };
}

function reusablePoolClient() {
  let underlyingCalls = 0;
  const client = {
    query(...args: any[]) {
      underlyingCalls += 1;
      const callback = args.at(-1);
      const error = args[0] === "FAIL" ? new Error("query failed") : null;
      if (typeof callback === "function") {
        queueMicrotask(() => callback(error, error ? undefined : result()));
        return;
      }
      return error ? Promise.reject(error) : Promise.resolve(result());
    }
  } as unknown as PoolClient;

  const pool = {
    query: client.query.bind(client),
    connect(callback?: (...args: any[]) => void) {
      if (callback) {
        queueMicrotask(() => callback(undefined, client, () => undefined));
        return;
      }
      return Promise.resolve(client);
    }
  } as unknown as Pool;
  return { pool, client, underlyingCalls: () => underlyingCalls };
}

describe("database instrumentation", () => {
  it("wraps a reused PoolClient only once for Promise checkouts", async () => {
    const fixture = reusablePoolClient();
    let errorLogs = 0;
    const pool = instrumentPool(fixture.pool, () => { errorLogs += 1; });

    const first = await pool.connect();
    const wrappedQuery = first.query;
    const second = await pool.connect();
    assert.equal(second, first);
    assert.equal(second.query, wrappedQuery);

    const transformed = await second.query("SELECT") as QueryResult;
    assert.deepEqual(transformed.rows, [{ snakeCase: 1, nestedValue: { otherKey: 2 } }]);
    await assert.rejects(second.query("FAIL"), /query failed/);
    assert.equal(errorLogs, 1);
    assert.equal(fixture.underlyingCalls(), 2);
  });

  it("wraps callback checkouts once and logs/transforms once", async () => {
    const fixture = reusablePoolClient();
    let errorLogs = 0;
    const pool = instrumentPool(fixture.pool, () => { errorLogs += 1; });

    const first = await new Promise<PoolClient>((resolve, reject) => {
      pool.connect((error, client) => error ? reject(error) : resolve(client));
    });
    const wrappedQuery = first.query;
    const second = await new Promise<PoolClient>((resolve, reject) => {
      pool.connect((error, client) => error ? reject(error) : resolve(client));
    });
    assert.equal(second.query, wrappedQuery);

    const transformed = await new Promise<QueryResult>((resolve, reject) => {
      second.query("SELECT", (error, queryResult) => error ? reject(error) : resolve(queryResult));
    });
    assert.deepEqual(transformed.rows, [{ snakeCase: 1, nestedValue: { otherKey: 2 } }]);
    await new Promise<void>(resolve => {
      second.query("FAIL", error => {
        assert.match(error?.message ?? "", /query failed/);
        resolve();
      });
    });
    assert.equal(errorLogs, 1);
    assert.equal(fixture.underlyingCalls(), 2);
  });
});
