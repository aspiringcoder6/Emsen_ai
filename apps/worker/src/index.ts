import { setTimeout as delay } from "node:timers/promises";
import { workerConfig } from "./config.js";
import { workerDatabase } from "./database.js";
import { claimNextJob, processMediaJob, recoverInterruptedJobs } from "./processor.js";

let stopping = false;

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    stopping = true;
    console.log(`[worker] received ${signal}; finishing the current task`);
  });
}

async function run() {
  await workerDatabase.query("SELECT 1");
  await recoverInterruptedJobs();
  console.log("[worker] media processor is ready");

  while (!stopping) {
    try {
      const job = await claimNextJob();
      if (job) {
        await processMediaJob(job);
        continue;
      }
      await delay(workerConfig.pollIntervalMs);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown worker error";
      console.error(`[worker] polling failed: ${message.slice(0, 500)}`);
      await delay(Math.max(5_000, workerConfig.pollIntervalMs));
    }
  }
}

run()
  .catch((error) => {
    console.error("[worker] could not start", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await workerDatabase.end();
    console.log("[worker] stopped");
  });
