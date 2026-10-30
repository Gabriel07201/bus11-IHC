import type { Pool } from "pg";
import { ensureAppSecret, getAppSecretPath } from "./app-secret";
import { getPool, migrateDatabase } from "./db";

export async function initializeApplication(pool: Pool = getPool()): Promise<void> {
  await migrateDatabase(pool);
  await ensureAppSecret({
    secretPath: getAppSecretPath(),
    legacySecret: process.env.APP_SECRET ?? "",
    hasExistingParticipantData: async () => {
      const result = await pool.query<{ has_data: boolean }>(
        "SELECT EXISTS (SELECT 1 FROM participant_sessions) AS has_data",
      );
      return result.rows[0]?.has_data ?? false;
    },
  });
}
