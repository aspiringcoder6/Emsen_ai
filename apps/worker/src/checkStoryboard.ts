import { Pool } from "pg";
import { workerConfig } from "./config.js";
import { inspectStoryboardWorker } from "./storyboardDiagnostics.js";

const args = process.argv.slice(2);
const jobId = args.length === 2 && args[0] === "--job" ? args[1] : undefined;
if (args.length && (!jobId || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(jobId))) {
  console.error("Usage: npm run check:storyboard --workspace @creator-flow/worker -- [--job UUID]");
  process.exitCode = 1;
} else if (workerConfig.isProduction && !process.env.DATABASE_URL?.trim()) {
  console.error("[worker:check] Production worker chưa có DATABASE_URL.");
  process.exitCode = 1;
} else {
  const database = new Pool({ connectionString: workerConfig.databaseUrl, max: 1, connectionTimeoutMillis: 10_000, query_timeout: 10_000 });
  try {
    const result = await inspectStoryboardWorker(database, jobId);
    console.log(JSON.stringify(result, null, 2));
    console.log("[worker:check] Read-only check; no jobs processed and no image provider called.");
    if (!result.ready) process.exitCode = 1;
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "DATABASE_CHECK_FAILED";
    console.error(`[worker:check] Cannot inspect the worker database (${code}). Check DATABASE_URL, connectivity and migrations.`);
    process.exitCode = 1;
  } finally {
    await database.end();
  }
}
