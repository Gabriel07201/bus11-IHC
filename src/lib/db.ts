import { Pool } from "pg";
import { readFile } from "node:fs/promises";
import path from "node:path";

const MIGRATION_LOCK_ID = 811202604;

export interface MigrationSource {
  version: string;
  load: () => Promise<string>;
}

const BUILT_IN_MIGRATIONS: readonly MigrationSource[] = [
  {
    version: "001_initial.sql",
    load: () => readFile(path.join(process.cwd(), "db", "migrations", "001_initial.sql"), "utf8"),
  },
  {
    version: "002_researcher_groups.sql",
    load: () => readFile(path.join(process.cwd(), "db", "migrations", "002_researcher_groups.sql"), "utf8"),
  },
];

const globalForPostgres = globalThis as typeof globalThis & {
  bus11Pool?: Pool;
};

export function getPool(): Pool {
  if (globalForPostgres.bus11Pool) return globalForPostgres.bus11Pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL não foi configurada. Copie .env.example para .env.local e ajuste a configuração.");
  }

  const pool = new Pool({ connectionString, max: 10 });
  pool.on("error", (error) => {
    console.error("Erro inesperado na conexão PostgreSQL:", error.message);
  });
  globalForPostgres.bus11Pool = pool;
  return pool;
}

export async function migrateDatabase(
  pool: Pick<Pool, "connect"> = getPool(),
  migrations: readonly MigrationSource[] = BUILT_IN_MIGRATIONS,
): Promise<void> {
  const client = await pool.connect();
  let transactionStarted = false;
  let releaseError: Error | undefined;

  try {
    await client.query("BEGIN");
    transactionStarted = true;
    await client.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK_ID]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    for (const migration of migrations) {
      const existing = await client.query(
        "SELECT 1 FROM schema_migrations WHERE version = $1",
        [migration.version],
      );
      if (existing.rowCount) continue;

      const sql = await migration.load();
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [migration.version]);
    }

    await client.query("COMMIT");
    transactionStarted = false;
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        releaseError = rollbackError instanceof Error ? rollbackError : new Error("PostgreSQL rollback failed");
      }
    }
    throw error;
  } finally {
    client.release(releaseError);
  }
}
