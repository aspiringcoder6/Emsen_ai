import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test } from "node:test";
import type { ChildProcess } from "node:child_process";
import { startEmbeddedStoryboardWorker } from "../src/embeddedStoryboardWorker.js";

function fixture() {
  const child = new EventEmitter() as EventEmitter & { kill: (signal: NodeJS.Signals) => boolean };
  const signals: NodeJS.Signals[] = [];
  let graceful = true;
  child.kill = (signal) => {
    signals.push(signal);
    if (signal === "SIGKILL" || graceful) queueMicrotask(() => child.emit("close", 0, signal));
    return true;
  };
  let spawned = 0, failures = 0;
  const deps = {
    entry: "/repo/apps/worker/dist/index.js",
    exists: () => true,
    spawn: (entry: string, cwd: string) => {
      assert.equal(entry, deps.entry);
      assert.equal(cwd, "/repo/apps/worker");
      spawned++;
      return child as unknown as ChildProcess;
    },
    log: () => undefined,
    shutdownTimeoutMs: 10,
  };
  return { child, signals, deps, options: { enabledFlag: "true", onUnexpectedExit: () => failures++ }, count: () => ({ spawned, failures }), interrupt: () => { graceful = false; } };
}

test("embedded worker stays disabled by default and rejects invalid flag or missing build", () => {
  const f = fixture();
  assert.equal(startEmbeddedStoryboardWorker({ ...f.options, enabledFlag: undefined }, f.deps), null);
  assert.equal(startEmbeddedStoryboardWorker({ ...f.options, enabledFlag: "false" }, f.deps), null);
  assert.throws(() => startEmbeddedStoryboardWorker({ ...f.options, enabledFlag: '"true"' }, f.deps), /true hoặc false/);
  assert.throws(() => startEmbeddedStoryboardWorker(f.options, { ...f.deps, exists: () => false }), /Chưa build worker/);
  assert.equal(f.count().spawned, 0);
});

test("embedded worker starts once and stops gracefully without reporting a failure", async () => {
  const f = fixture();
  const worker = startEmbeddedStoryboardWorker(f.options, f.deps)!;
  const stopped = worker.stop();
  assert.equal(worker.stop(), stopped);
  await stopped;
  assert.deepEqual(f.signals, ["SIGTERM"]);
  assert.deepEqual(f.count(), { spawned: 1, failures: 0 });
});

test("unexpected worker exit or spawn failure stops API once instead of leaving silent queued jobs", async () => {
  for (const event of ["close", "error"] as const) {
    const f = fixture();
    const worker = startEmbeddedStoryboardWorker(f.options, f.deps)!;
    if (event === "close") f.child.emit("close", 1, null);
    else f.child.emit("error", new Error("private connection information must never be logged"));
    f.child.emit("close", 1, null);
    assert.equal(f.count().failures, 1);
    await worker.stop();
    assert.deepEqual(f.signals, []);
  }
});

test("shutdown has a deadline and preserves the existing interrupted-job recovery policy", async () => {
  const f = fixture();
  f.interrupt();
  const worker = startEmbeddedStoryboardWorker(f.options, f.deps)!;
  await worker.stop();
  assert.deepEqual(f.signals, ["SIGTERM", "SIGKILL"]);
  assert.equal(f.count().failures, 0);
});
