import { database } from "./pool.js";
import { contentPlanSchemaSql } from "./contentPlanSchema.js";
import {
  aiChatReplyLinkSchemaSql,
  aiChatSchemaSql,
  initialSchemaSql,
  directionSchemaSql,
} from "./schema.js";

const migrations = [
  { sql: initialSchemaSql, version: 1 },
  { sql: aiChatSchemaSql, version: 2 },
  { sql: aiChatReplyLinkSchemaSql, version: 3 },
  { sql: directionSchemaSql, version: 4 },
  { sql: contentPlanSchemaSql, version: 5 },
];

export async function migrateDatabase() {
  const client = await database.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const appliedResult = await client.query<{ version: number }>(
      "SELECT version FROM schema_migrations",
    );
    const applied = new Set(appliedResult.rows.map((row) => row.version));

    for (const migration of migrations) {
      if (applied.has(migration.version)) {
        continue;
      }

      await client.query("BEGIN");
      try {
        await client.query(migration.sql);
        await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [
          migration.version,
        ]);
        await client.query("COMMIT");
        console.log(`[database] applied migration ${migration.version}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    client.release();
  }
}
