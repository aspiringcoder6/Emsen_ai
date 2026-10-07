import { setTimeout as delay } from "node:timers/promises";
import { workerConfig } from "./config.js";
import { workerDatabase } from "./database.js";
import { claimNextJob, processMediaJob, recoverInterruptedJobs } from "./processor.js";
import { claimNextStoryboardImageJob, processStoryboardImage, recoverInterruptedStoryboardImages } from "./storyboardImage.js";
import { getStoryboardWorkerConfiguration } from "./storyboardDiagnostics.js";
import { readWorkerQueues } from "./queues.js";

let stopping = false;

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    stopping = true;
    console.log(`[worker] received ${signal}; finishing the current task`);
  });
}

async function run() {
  const queues = readWorkerQueues(process.argv.slice(2));
  await workerDatabase.query("SELECT 1");
  if (queues.media) await recoverInterruptedJobs();
  if (queues.images) await recoverInterruptedStoryboardImages();
  console.log("[worker] processor is ready");
  console.log(`[worker] consuming queues: ${[queues.media && "media_jobs", queues.images && "storyboard_image_jobs"].filter(Boolean).join(", ")}`);
  if (queues.images) console.log(`[worker:storyboard-image] configuration ${JSON.stringify(getStoryboardWorkerConfiguration())}`);

  let preferImage = true;
  let lastImageRecovery = Date.now();

  while (!stopping) {
    try {
      if (queues.images && Date.now() - lastImageRecovery > 30_000) {
        await recoverInterruptedStoryboardImages();
        lastImageRecovery = Date.now();
      }
      if (queues.images && preferImage) {
        const imageJob = await claimNextStoryboardImageJob();
        if (imageJob) {
          await processStoryboardImage(imageJob);
          preferImage = false;
          continue;
        }
      }
      if (queues.media) {
        const job = await claimNextJob();
        if (job) {
          await processMediaJob(job);
          preferImage = true;
          continue;
        }
      }
      if (queues.images && !preferImage) {
        const imageJob = await claimNextStoryboardImageJob();
        if (imageJob) {
          await processStoryboardImage(imageJob);
          continue;
        }
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
