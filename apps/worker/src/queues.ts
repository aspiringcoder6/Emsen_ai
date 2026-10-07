export function readWorkerQueues(args: string[]) {
  const mode = args.length === 0 ? "all" : args.length === 1 ? args[0]?.replace(/^--queue=/, "") : undefined;
  if ((args.length && !args[0]?.startsWith("--queue=")) || !["all", "images", "media"].includes(mode ?? "")) {
    throw new Error("Usage: worker [--queue=all|images|media]");
  }
  return { media: mode !== "images", images: mode !== "media" };
}
