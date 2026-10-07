import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

type WorkerProcess = Pick<ChildProcess, "once" | "kill">;
type Dependencies = {
  entry: string;
  exists: (path: string) => boolean;
  spawn: (entry: string, cwd: string) => WorkerProcess;
  log: (message: string) => void;
  shutdownTimeoutMs: number;
};

const dependencies: Dependencies = {
  entry: fileURLToPath(new URL("../../worker/dist/index.js", import.meta.url)),
  exists: existsSync,
  spawn: (entry, cwd) => spawn(process.execPath, [entry, "--queue=images"], { cwd, stdio: "inherit" }),
  log: (message) => console.log(`[api:storyboard-worker] ${message}`),
  shutdownTimeoutMs: 25_000,
};

// Opt-in for small demos: use the existing worker and SQL queue in the API service.
// No new inference path, retry policy, media processing, or credential store.
export function startEmbeddedStoryboardWorker(
  options: { enabledFlag: string | undefined; onUnexpectedExit: () => void },
  deps: Dependencies = dependencies,
) {
  const flag = options.enabledFlag?.trim();
  if (!flag || flag === "false") return null;
  if (flag !== "true") throw new Error("STORYBOARD_IMAGE_WORKER_ENABLED cần là true hoặc false, không kèm dấu ngoặc kép.");
  if (!deps.exists(deps.entry)) throw new Error("Chưa build worker ảnh. Chạy npm run build --workspace @creator-flow/worker trước khi bật STORYBOARD_IMAGE_WORKER_ENABLED.");

  let stopping = false;
  let finished = false;
  let resolveClosed: () => void;
  const closed = new Promise<void>((resolve) => { resolveClosed = resolve; });
  const child = deps.spawn(deps.entry, dirname(dirname(deps.entry)));

  function finish(reason: string) {
    if (finished) return;
    finished = true;
    resolveClosed();
    if (!stopping) {
      deps.log(`stopped unexpectedly (${reason}); stopping API so the host can restart both processes`);
      options.onUnexpectedExit();
    }
  }
  child.once("error", () => finish("process could not start"));
  child.once("close", (code, signal) => finish(`exit ${code ?? signal ?? "unknown"}`));
  deps.log("starting image-only worker in this API service; consuming storyboard_image_jobs");

  let stopPromise: Promise<void> | undefined;
  return {
    stop() {
      if (stopPromise) return stopPromise;
      stopping = true;
      stopPromise = (async () => {
        if (finished) return;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const deadline = new Promise<void>((resolve) => {
          timer = setTimeout(() => {
            deps.log("shutdown deadline reached; stopping image worker. Interrupted jobs stay in the SQL queue for recovery.");
            child.kill("SIGKILL");
            resolve();
          }, deps.shutdownTimeoutMs);
        });
        child.kill("SIGTERM");
        await Promise.race([closed, deadline]);
        clearTimeout(timer);
      })();
      return stopPromise;
    },
  };
}
