const queueName = process.env.MEDIA_QUEUE_NAME ?? "media-processing";

console.log(
  `[worker] project shell ready; no processor is registered for "${queueName}" yet`,
);

