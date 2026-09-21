import { Pool } from "pg";
import { workerConfig } from "./config.js";

export const workerDatabase = new Pool({ connectionString: workerConfig.databaseUrl, max: 4 });

workerDatabase.on("error", (error) => {
  console.error("[worker:database] unexpected pool error", error.message);
});
