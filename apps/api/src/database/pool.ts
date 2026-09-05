import { Pool } from "pg";
import { config } from "../config.js";

export const database = new Pool({
  connectionString: config.databaseUrl,
  max: 10,
});

database.on("error", (error) => {
  console.error("[database] unexpected pool error", error.message);
});
