import { createApp } from "./app.js";
import { config } from "./config.js";
import { migrateDatabase } from "./database/migrate.js";
import { database } from "./database/pool.js";

await migrateDatabase();

const port = config.apiPort;
const app = createApp();

const server = app.listen(port, () => {
  console.log(`[api] listening on http://localhost:${port}`);
});

async function shutdown(signal: string) {
  console.log(`[api] received ${signal}, shutting down`);
  server.close(async () => {
    await database.end();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
