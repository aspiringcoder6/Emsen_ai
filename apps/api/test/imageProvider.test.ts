import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { CloudflareImageProvider, createImageGenerationProvider, readImageGenerationSettings, registerImageProvider } from "@creator-flow/ai-provider";

const options = { provider: "cloudflare-workers-ai", model: "@cf/black-forest-labs/flux-1-schnell", accountId: "a".repeat(32), apiToken: "private-test-token", timeoutMs: 5_000 };
const request = { prompt: "A pencil sketch of a desk", aspectRatio: "9:16" as const, seed: 42 };
const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZc0AAAAASUVORK5CYII=";

test("Cloudflare adapter authenticates only in a header, decodes private image bytes and sends supported fields", async () => {
  let calls = 0;
  mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    calls++;
    assert.equal(url, `https://api.cloudflare.com/client/v4/accounts/${options.accountId}/ai/run/${options.model}`);
    assert.equal(url.includes(options.apiToken), false);
    assert.deepEqual(init.headers, { Authorization: `Bearer ${options.apiToken}`, "Content-Type": "application/json" });
    const body = JSON.parse(String(init.body));
    assert.deepEqual(body, { prompt: request.prompt, steps: 4 });
    assert.equal("seed" in body, false); // live schema rejects additional properties
    assert.equal(init.redirect, "error");
    return Response.json({ success: true, result: { image: png } });
  });
  try {
    const provider = new CloudflareImageProvider(options);
    assert.equal(provider.capabilities.exactAspectRatio, false);
    const image = await provider.generateImage(request);
    assert.equal(image.mimeType, "image/png");
    assert.equal(image.model, options.model);
    assert.deepEqual(Buffer.from(image.bytes), Buffer.from(png, "base64"));
    assert.equal(calls, 1);
  } finally { mock.restoreAll(); }
});

test("provider errors do not echo secrets or retry; quota, auth, timeout and invalid images are explicit", async () => {
  for (const [status, code] of [[429, "quota"], [401, "credentials"], [403, "credentials"], [500, "unavailable"]] as const) {
    let calls = 0;
    mock.method(globalThis, "fetch", async () => { calls++; return Response.json({ secret: options.apiToken }, { status }); });
    try {
      await assert.rejects(() => new CloudflareImageProvider(options).generateImage(request), (error: { code: string; message: string }) => error.code === code && !error.message.includes(options.apiToken));
      assert.equal(calls, 1);
    } finally { mock.restoreAll(); }
  }
  mock.method(globalThis, "fetch", async () => Response.json({ success: true, result: { image: Buffer.from("<svg>untrusted</svg>").toString("base64") } }));
  try { await assert.rejects(() => new CloudflareImageProvider(options).generateImage(request), (error: { code: string }) => error.code === "invalid-image"); }
  finally { mock.restoreAll(); }
  mock.method(globalThis, "fetch", async () => Response.json({ success: false, errors: [{ message: options.apiToken }] }));
  try { await assert.rejects(() => new CloudflareImageProvider(options).generateImage(request), (error: { code: string; message: string }) => error.code === "invalid-image" && !error.message.includes(options.apiToken)); }
  finally { mock.restoreAll(); }
  mock.method(globalThis, "fetch", async (_url: string, init: RequestInit) => new Promise((_resolve, reject) => init.signal!.addEventListener("abort", () => reject(new Error(options.apiToken)), { once: true })));
  try { await assert.rejects(() => new CloudflareImageProvider({ ...options, timeoutMs: 10 }).generateImage(request), (error: { code: string }) => error.code === "timeout"); }
  finally { mock.restoreAll(); }
});

test("Cloudflare request validation errors retain only safe numeric diagnostics", async () => {
  let calls = 0;
  mock.method(globalThis, "fetch", async () => {
    calls++;
    return Response.json({ errors: [{ code: 5006, message: `${options.apiToken} ${request.prompt}` }, { code: options.apiToken }] }, { status: 400 });
  });
  try {
    await assert.rejects(() => new CloudflareImageProvider(options).generateImage(request), (error: any) => {
      assert.equal(error.code, "configuration");
      assert.deepEqual(error.diagnostics, { httpStatus: 400, providerCodes: [5006] });
      assert.equal(JSON.stringify(error).includes(options.apiToken), false);
      assert.equal(JSON.stringify(error).includes(request.prompt), false);
      return true;
    });
    assert.equal(calls, 1);
  } finally { mock.restoreAll(); }
});

test("oversized/malformed output is rejected and unconfigured providers never send a request", async () => {
  let calls = 0;
  mock.method(globalThis, "fetch", async () => { calls++; return new Response("x".repeat(4_300_000)); });
  try {
    await assert.rejects(() => new CloudflareImageProvider({ ...options, apiToken: "" }).generateImage(request), /CLOUDFLARE/);
    await assert.rejects(() => new CloudflareImageProvider(options).generateImage({ ...request, prompt: "x".repeat(2_049) }), /Prompt/);
    assert.equal(calls, 0);
    await assert.rejects(() => new CloudflareImageProvider(options).generateImage(request), (error: { code: string }) => error.code === "invalid-image");
    assert.equal(calls, 1);
  } finally { mock.restoreAll(); }
});

test("provider registry is replaceable and demo limits reject unsafe configuration", async () => {
  const settings = readImageGenerationSettings({});
  assert.equal(settings.dailyUserLimit, 20);
  assert.equal(settings.dailyWorkspaceLimit, 50);
  assert.throws(() => readImageGenerationSettings({ IMAGE_GENERATION_DAILY_USER_LIMIT: "-1" }), /không hợp lệ/);
  assert.throws(() => createImageGenerationProvider({ ...options, model: "another-model" }), /adapter/);
  assert.throws(() => createImageGenerationProvider({ ...options, provider: "unknown" }), /adapter/);
  assert.equal(createImageGenerationProvider({ ...options, provider: "disabled" }).configured, false);
  registerImageProvider("test-local-images", () => ({ configured: true, model: "local-model", provider: "test-local-images", capabilities: { exactAspectRatio: true, referenceImages: false }, generateImage: async () => ({ bytes: Buffer.from(png, "base64"), mimeType: "image/png", model: "local-model", provider: "test-local-images" }) }));
  const result = await createImageGenerationProvider({ ...options, provider: "test-local-images" }).generateImage(request);
  assert.equal(result.provider, "test-local-images");
});
