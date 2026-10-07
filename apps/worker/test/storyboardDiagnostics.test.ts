import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mock, test } from "node:test";
import type { Pool } from "pg";
import { workerConfig } from "../src/config.js";
import { getStoryboardWorkerConfiguration, inspectStoryboardWorker } from "../src/storyboardDiagnostics.js";

test("worker diagnostics identify missing credentials, migrations, wrong database and model drift without processing jobs", async () => {
  const originalImage = { ...workerConfig.imageGeneration }, originalStorage = { ...workerConfig.storage };
  Object.assign(workerConfig.imageGeneration, { provider: "cloudflare-workers-ai", model: "@cf/black-forest-labs/flux-1-schnell", accountId: "d".repeat(32), apiToken: "private-diagnostic-token" });
  Object.assign(workerConfig.storage, { endpoint: "https://storage.example.invalid", bucket: "private-bucket", accessKey: "private-access-key", secretKey: "private-secret-key" });
  let missingTables: string[] = [];
  let job: Record<string, unknown> | null = { id: randomUUID(), status: "queued", progress: 0, provider: workerConfig.imageGeneration.provider, model: workerConfig.imageGeneration.model, created_at: new Date(), started_at: null, updated_at: new Date() };
  let calls = 0;
  const database = { query: async (sql: string, values: any[] = []) => {
    calls++;
    assert.match(sql.trim(), /^SELECT/);
    if (sql.includes("to_regclass")) return { rows: values[0].map((name: string) => ({ name, present: !missingTables.includes(name) })), rowCount: values[0].length };
    if (sql.includes("COUNT(*)")) return { rows: [{ queued: 1, running: 0, oldestQueuedAt: new Date() }], rowCount: 1 };
    assert.match(sql, /WHERE id = \$1/);
    assert.equal(sql.includes("input"), false); // scene prompts are never printed
    return { rows: job ? [job] : [], rowCount: job ? 1 : 0 };
  } } as unknown as Pick<Pool, "query">;
  mock.method(globalThis, "fetch", async () => { throw new Error("Diagnostics must never call an external service"); });
  try {
    const result = await inspectStoryboardWorker(database, String(job!.id));
    assert.equal(result.ready, true); assert.equal(result.queue!.queued, 1); assert.equal(result.job!.status, "queued"); assert.equal(calls, 3);
    const output = JSON.stringify(result);
    for (const secret of ["private-diagnostic-token", "private-access-key", "private-secret-key", "private-bucket", "storage.example.invalid"]) assert.equal(output.includes(secret), false);
    job = null;
    const wrongDatabase = await inspectStoryboardWorker(database, randomUUID());
    assert.equal(wrongDatabase.ready, false); assert.match(wrongDatabase.issues.join(" "), /cùng database/);
    job = { provider: "cloudflare-workers-ai", model: "old-model" };
    const drift = await inspectStoryboardWorker(database, randomUUID());
    assert.equal(drift.ready, false); assert.match(drift.issues.join(" "), /Provider\/model/);
    missingTables = ["storyboard_image_jobs"];
    const missing = await inspectStoryboardWorker(database);
    assert.equal(missing.ready, false); assert.equal(missing.queue, null); assert.deepEqual(missing.missingTables, missingTables);
    workerConfig.imageGeneration.apiToken = ""; workerConfig.storage.secretKey = "";
    const incomplete = await inspectStoryboardWorker(database);
    assert.equal(incomplete.configuration.providerConfigured, false); assert.equal(incomplete.configuration.storageConfigured, false); assert.equal(incomplete.issues.length, 3);
    workerConfig.imageGeneration.model = "unsupported-model";
    assert.match(getStoryboardWorkerConfiguration().configurationMessage!, /Model/);
  } finally {
    Object.assign(workerConfig.imageGeneration, originalImage); Object.assign(workerConfig.storage, originalStorage); mock.restoreAll();
  }
});
