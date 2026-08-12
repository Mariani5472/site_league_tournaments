import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const [canonicalUrl, baselineUrl] = process.argv.slice(2);

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "") && (!canonicalUrl || !baselineUrl)) {
  console.error("Usage: npm run schema:compare -- <canonical-database-url> <baseline-database-url>");
  process.exit(2);
}

const normalize = value => typeof value === "string"
  ? value.replaceAll("extensions.gen_random_uuid()", "gen_random_uuid()")
      .replace(/::(?:character varying|text)(?:\[\])?/g, "")
      .replace(/\s+/g, " ")
      .replace(/\(\s+/g, "(")
      .replace(/\s+\)/g, ")")
      .trim()
      .toLowerCase()
  : value;

async function rows(client, query) {
  const result = await client.query(query);
  return result.rows.map(row => Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, normalize(value)])
  ));
}

export async function describeDatabase(databaseUrl) {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    return {
      columns: await rows(client, `
        SELECT table_name, column_name, data_type, udt_name,
               character_maximum_length, is_nullable, column_default
          FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name <> 'pgmigrations'
         ORDER BY table_name, column_name
      `),
      constraints: await rows(client, `
        SELECT relation.relname AS table_name, item.conname AS constraint_name,
               item.contype AS constraint_type,
               pg_get_constraintdef(item.oid, true) AS definition
          FROM pg_constraint item
          JOIN pg_class relation ON relation.oid = item.conrelid
          JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
         WHERE namespace.nspname = 'public' AND relation.relname <> 'pgmigrations'
         ORDER BY relation.relname, item.conname
      `),
      indexes: await rows(client, `
        SELECT table_row.relname AS table_name, index_row.relname AS index_name,
               pg_get_indexdef(index_row.oid) AS definition
          FROM pg_index metadata
          JOIN pg_class table_row ON table_row.oid = metadata.indrelid
          JOIN pg_class index_row ON index_row.oid = metadata.indexrelid
          JOIN pg_namespace namespace ON namespace.oid = table_row.relnamespace
         WHERE namespace.nspname = 'public' AND table_row.relname <> 'pgmigrations'
         ORDER BY table_row.relname, index_row.relname
      `),
      ownershipFunctions: await rows(client, `
        SELECT routine.proname AS function_name,
               pg_get_function_identity_arguments(routine.oid) AS arguments,
               pg_get_functiondef(routine.oid) AS definition
          FROM pg_proc routine
          JOIN pg_namespace namespace ON namespace.oid = routine.pronamespace
         WHERE namespace.nspname = 'public'
           AND routine.proname IN (
             'check_league_owner_consistency',
             'enforce_league_owner_from_league',
             'enforce_league_owner_from_member'
           )
         ORDER BY routine.proname
      `),
      triggers: await rows(client, `
        SELECT relation.relname AS table_name, trigger_row.tgname AS trigger_name,
               pg_get_triggerdef(trigger_row.oid, true) AS definition
          FROM pg_trigger trigger_row
          JOIN pg_class relation ON relation.oid = trigger_row.tgrelid
          JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
         WHERE namespace.nspname = 'public' AND NOT trigger_row.tgisinternal
         ORDER BY relation.relname, trigger_row.tgname
      `),
      rowLevelSecurity: await rows(client, `
        SELECT relation.relname AS table_name, relation.relrowsecurity AS enabled,
               relation.relforcerowsecurity AS forced
          FROM pg_class relation
          JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
         WHERE namespace.nspname = 'public' AND relation.relkind = 'r'
           AND relation.relname <> 'pgmigrations'
         ORDER BY relation.relname
      `)
    };
  } finally {
    await client.end();
  }
}

export async function compareDatabaseSchemas(canonicalUrl, baselineUrl) {
  const [canonical, baseline] = await Promise.all([
    describeDatabase(canonicalUrl), describeDatabase(baselineUrl)
  ]);
  assert.deepEqual(baseline, canonical);
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "")) {
  try {
    await compareDatabaseSchemas(canonicalUrl, baselineUrl);
    console.log("Canonical migrations and Supabase baseline are structurally equivalent.");
  } catch (error) {
    console.error("Schema divergence detected between canonical migrations and Supabase baseline.");
    console.error(error);
    process.exit(1);
  }
}
