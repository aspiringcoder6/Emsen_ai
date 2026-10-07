import { createApp } from "./app.js";
import { config } from "./config.js";
import { migrateDatabase } from "./database/migrate.js";
import { database } from "./database/pool.js";
import { startEmbeddedStoryboardWorker } from "./embeddedStoryboardWorker.js";

await migrateDatabase();

const port = config.apiPort;
const app = createApp();
let shuttingDown = false;
const imageWorker = startEmbeddedStoryboardWorker({
  enabledFlag: process.env.STORYBOARD_IMAGE_WORKER_ENABLED,
  onUnexpectedExit: () => void shutdown("image worker exit", 1),
});

const server = app.listen(port, () => {
  console.log(`[api] listening on http://localhost:${port}`);
});
server.once("error", (error: NodeJS.ErrnoException) => {
  console.error(`[api] HTTP server failed (${error.code ?? "SERVER_ERROR"})`);
  void shutdown("HTTP server error", 1);
});

async function shutdown(signal: string, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[api] received ${signal}, shutting down`);
  const workerStopped = imageWorker?.stop();
  server.close(async () => {
    await workerStopped;
    await database.end();
    process.exit(exitCode);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
