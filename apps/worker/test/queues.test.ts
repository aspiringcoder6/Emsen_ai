import assert from "node:assert/strict";
import { test } from "node:test";
import { readWorkerQueues } from "../src/queues.js";

test("image-only worker excludes video jobs and invalid queue arguments cannot fall back to all queues", () => {
  assert.deepEqual(readWorkerQueues([]), { media: true, images: true });
  assert.deepEqual(readWorkerQueues(["--queue=all"]), { media: true, images: true });
  assert.deepEqual(readWorkerQueues(["--queue=images"]), { media: false, images: true });
  assert.deepEqual(readWorkerQueues(["--queue=media"]), { media: true, images: false });
  for (const args of [["--queue=image"], ["images"], ["--queue=images", "--queue=all"], ["--queue="]]) {
    assert.throws(() => readWorkerQueues(args), /Usage/);
  }
});
