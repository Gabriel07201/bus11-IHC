import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as dbModule from "./db";

type MigrationSource = { version: string; load: () => Promise<string> };
type MigrationRunner = (pool: unknown, migrations: readonly MigrationSource[]) => Promise<void>;
type QueryResult = { rowCount: number; rows: Array<Record<string, unknown>> };

class MigrationStore {
  versions = new Set<string>();
  migrationRuns = 0;
  lockQueue: Promise<void> = Promise.resolve();
  activeLocks = 0;
  connectionError?: Error;
  schemaPermissionError?: Error;
  migrationError?: Error;

  async acquireLock(): Promise<() => void> {
    let release!: () => void;
    const previous = this.lockQueue;
    this.lockQueue = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    this.activeLocks += 1;
    return () => {
      this.activeLocks -= 1;
      release();
    };
  }
}

class MigrationClient {
  private pendingVersions = new Set<string>();
  private pendingRuns = 0;
  private releaseTransactionLock?: () => void;

  constructor(private readonly store: MigrationStore) {}

  async query(sql: string, values: unknown[] = []): Promise<QueryResult> {
    const normalized = sql.trim().replace(/\s+/g, " ").toUpperCase();
    if (normalized === "BEGIN") return { rowCount: 0, rows: [] };
    if (normalized.startsWith("SELECT PG_ADVISORY_XACT_LOCK")) {
      this.releaseTransactionLock = await this.store.acquireLock();
      return { rowCount: 1, rows: [{}] };
    }
    if (normalized.startsWith("CREATE TABLE IF NOT EXISTS SCHEMA_MIGRATIONS")) {
      if (this.store.schemaPermissionError) throw this.store.schemaPermissionError;
      return { rowCount: 0, rows: [] };
    }
    if (normalized.startsWith("SELECT 1 FROM SCHEMA_MIGRATIONS WHERE VERSION")) {
      const version = String(values[0]);
      const exists = this.store.versions.has(version) || this.pendingVersions.has(version);
      return { rowCount: exists ? 1 : 0, rows: exists ? [{}] : [] };
    }
    if (normalized.startsWith("INSERT INTO SCHEMA_MIGRATIONS")) {
      this.pendingVersions.add(String(values[0]));
      return { rowCount: 1, rows: [] };
    }
    if (normalized === "COMMIT") {
      for (const version of this.pendingVersions) this.store.versions.add(version);
      this.store.migrationRuns += this.pendingRuns;
      this.pendingVersions.clear();
      this.pendingRuns = 0;
      this.releaseLock();
      return { rowCount: 0, rows: [] };
    }
    if (normalized === "ROLLBACK") {
      this.pendingVersions.clear();
      this.pendingRuns = 0;
      this.releaseLock();
      return { rowCount: 0, rows: [] };
    }
    if (normalized.includes("CREATE TABLE MIGRATION_PROBE")) {
      if (this.store.migrationError) throw this.store.migrationError;
      this.pendingRuns += 1;
      return { rowCount: 0, rows: [] };
    }
    throw new Error(`Unexpected SQL in migration test: ${sql}`);
  }

  release(): void {
    this.releaseLock();
  }

  private releaseLock(): void {
    this.releaseTransactionLock?.();
    this.releaseTransactionLock = undefined;
  }
}

class MigrationPool {
  constructor(readonly store: MigrationStore) {}

  async connect(): Promise<MigrationClient> {
    if (this.store.connectionError) throw this.store.connectionError;
    return new MigrationClient(this.store);
  }
}

function getMigrationRunner(): MigrationRunner {
  const migrate = (dbModule as unknown as { migrateDatabase?: MigrationRunner }).migrateDatabase;
  expect(migrate).toBeTypeOf("function");
  return migrate as MigrationRunner;
}

async function withMigrations<T>(run: (migrations: readonly MigrationSource[]) => Promise<T>): Promise<T> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "bus11-migrations-"));
  try {
    await writeFile(path.join(directory, "001_probe.sql"), "CREATE TABLE migration_probe (id integer);");
    const migrations = [{
      version: "001_probe.sql",
      load: () => readFile(path.join(directory, "001_probe.sql"), "utf8"),
    }];
    return await run(migrations);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

describe("automatic PostgreSQL migrations", () => {
  it("serializes concurrent startup and applies each migration once", async () => {
    const migrate = getMigrationRunner();
    await withMigrations(async (migrations) => {
      const store = new MigrationStore();
      const pool = new MigrationPool(store);

      await Promise.all([
        migrate(pool, migrations),
        migrate(pool, migrations),
      ]);
      await migrate(pool, migrations);

      expect(store.versions).toContain("001_probe.sql");
      expect(store.migrationRuns).toBe(1);
      expect(store.activeLocks).toBe(0);
    });
  });

  it("fails clearly and releases the transaction lock when privileges are missing", async () => {
    const migrate = getMigrationRunner();
    await withMigrations(async (migrations) => {
      const store = new MigrationStore();
      store.schemaPermissionError = new Error("permission denied for table schema_migrations");

      await expect(migrate(new MigrationPool(store), migrations))
        .rejects.toThrow("permission denied");
      expect(store.versions.size).toBe(0);
      expect(store.activeLocks).toBe(0);
    });
  });

  it("surfaces connection failures before touching migration state", async () => {
    const migrate = getMigrationRunner();
    await withMigrations(async (migrations) => {
      const store = new MigrationStore();
      store.connectionError = new Error("connection refused");

      await expect(migrate(new MigrationPool(store), migrations))
        .rejects.toThrow("connection refused");
      expect(store.versions.size).toBe(0);
    });
  });
});
