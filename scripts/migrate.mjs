// Applique les migrations SQL de supabase/migrations/ sur la base Postgres
// pointée par DATABASE_URL (.env.local). Usage : npm run db:migrate
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

for (const envFile of [".env.local", ".env"]) {
  const path = join(root, envFile);
  if (existsSync(path)) {
    process.loadEnvFile(path);
  }
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL manquant dans .env.local");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

await client.query(`
  create table if not exists public._migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  )
`);

const applied = new Set(
  (await client.query("select name from public._migrations")).rows.map((r) => r.name)
);

const dir = join(root, "supabase", "migrations");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

let count = 0;
for (const file of files) {
  if (applied.has(file)) continue;
  const sql = readFileSync(join(dir, file), "utf8");
  console.log(`Applying ${file}...`);
  try {
    await client.query("begin");
    await client.query(sql);
    await client.query("insert into public._migrations (name) values ($1)", [file]);
    await client.query("commit");
    count++;
  } catch (err) {
    await client.query("rollback");
    console.error(`Échec de ${file}:`, err.message);
    await client.end();
    process.exit(1);
  }
}

console.log(count === 0 ? "Base déjà à jour." : `${count} migration(s) appliquée(s).`);
await client.end();
