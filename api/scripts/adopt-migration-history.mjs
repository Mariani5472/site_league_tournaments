import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { compareDatabaseSchemas } from "./compare-database-schemas.mjs";

const cutoff = process.argv[2];
const databaseUrl = process.env.DATABASE_URL;
const referenceUrl = process.env.REFERENCE_DATABASE_URL;

if (!cutoff || !databaseUrl || !referenceUrl) {
  console.error(
    "Usage: DATABASE_URL=... REFERENCE_DATABASE_URL=... npm run migrate:adopt -- <cutoff-migration-name>"
  );
  process.exit(2);
}
if (databaseUrl === referenceUrl) {
  console.error("DATABASE_URL and REFERENCE_DATABASE_URL must identify different databases.");
  process.exit(2);
}

const migrationNames = (await fs.readdir(path.resolve("migrations")))
  .filter(name => name.endsWith(".js"))
  .map(name => name.slice(0, -3))
  .sort();
const cutoffIndex = migrationNames.indexOf(cutoff);
if (cutoffIndex < 0) {
  console.error(`Unknown migration cutoff: ${cutoff}`);
  process.exit(2);
}
const adoptedNames = migrationNames.slice(0, cutoffIndex + 1);

// This comparison is the safety gate: history is never adopted merely because
// tables with familiar names happen to exist.
await compareDatabaseSchemas(referenceUrl, databaseUrl);

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock($1)", [1786469400]);
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.pgmigrations (
      id serial PRIMARY KEY,
      name varchar(255) NOT NULL,
      run_on timestamp NOT NULL
    )
  `);
  const existing = await client.query("SELECT name FROM public.pgmigrations ORDER BY id");
  if (existing.rowCount !== 0) {
    throw new Error("Refusing adoption: public.pgmigrations already contains history");
  }
  for (const name of adoptedNames) {
    await client.query("INSERT INTO public.pgmigrations (name, run_on) VALUES ($1, NOW())", [name]);
  }
  await client.query("COMMIT");
  console.log(`Adopted ${adoptedNames.length} migrations through ${cutoff}.`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
