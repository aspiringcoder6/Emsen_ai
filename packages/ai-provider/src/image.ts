export type ImageAspectRatio = "9:16" | "1:1" | "16:9" | "4:5";

export type ImageGenerationRequest = {
  prompt: string;
  aspectRatio: ImageAspectRatio;
  seed: number;
};

export type GeneratedImage = {
  bytes: Uint8Array;
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  provider: string;
  model: string;
};

export interface ImageGenerationProvider {
  readonly configured: boolean;
  readonly provider: string;
  readonly model: string;
  readonly capabilities: { exactAspectRatio: boolean; referenceImages: boolean };
  generateImage(request: ImageGenerationRequest): Promise<GeneratedImage>;
}

export class ImageProviderError extends Error {
  constructor(readonly code: "configuration" | "credentials" | "quota" | "timeout" | "unavailable" | "invalid-image", message: string, readonly diagnostics?: { httpStatus: number; providerCodes: number[] }) {
    super(message);
    this.name = "ImageProviderError";
  }
}

export type ImageProviderOptions = {
  provider: string;
  model: string;
  accountId: string;
  apiToken: string;
  timeoutMs: number;
};

function boundedInteger(value: string | undefined, fallback: number, maximum: number) {
  if (!value?.trim()) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw new ImageProviderError("configuration", "Giới hạn tạo ảnh trong cấu hình backend không hợp lệ.");
  }
  return parsed;
}

/** Shared by API and worker so provider selection and limits cannot drift silently. */
export function readImageGenerationSettings(env: Record<string, string | undefined>) {
  return {
    provider: env.IMAGE_GENERATION_PROVIDER?.trim() || "cloudflare-workers-ai",
    model: env.IMAGE_GENERATION_MODEL?.trim() || "@cf/black-forest-labs/flux-1-schnell",
    accountId: env.CLOUDFLARE_ACCOUNT_ID?.trim() || "",
    apiToken: env.CLOUDFLARE_API_TOKEN?.trim() || "",
    timeoutMs: boundedInteger(env.IMAGE_GENERATION_TIMEOUT_MS, 90_000, 120_000),
    dailyUserLimit: boundedInteger(env.IMAGE_GENERATION_DAILY_USER_LIMIT, 20, 1_000),
    dailyWorkspaceLimit: boundedInteger(env.IMAGE_GENERATION_DAILY_WORKSPACE_LIMIT, 50, 1_000),
  };
}

const maxImageBytes = 3 * 1024 * 1024;

export function validateGeneratedImage(bytes: Uint8Array): GeneratedImage["mimeType"] {
  if (!bytes.length || bytes.length > maxImageBytes) {
    throw new ImageProviderError("invalid-image", "Ảnh trả về vượt giới hạn 3 MB hoặc rỗng.");
  }
  if (bytes.length >= 33 && bytes.slice(0, 8).every((value, i) => value === [137, 80, 78, 71, 13, 10, 26, 10][i]) && String.fromCharCode(...bytes.slice(12, 16)) === "IHDR") return "image/png";
  if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes.at(-2) === 255 && bytes.at(-1) === 217) return "image/jpeg";
  if (bytes.length >= 16 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  throw new ImageProviderError("invalid-image", "Dịch vụ không trả về ảnh PNG, JPEG hoặc WebP hợp lệ.");
}

async function boundedJson(response: Response, maxBytes = Math.ceil(maxImageBytes * 4 / 3) + 65_536): Promise<Record<string, unknown>> {
  if (!response.body) throw new ImageProviderError("invalid-image", "Dịch vụ trả về kết quả rỗng.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.length;
      if (size > maxBytes) {
        await reader.cancel();
        throw new ImageProviderError("invalid-image", "Kết quả tạo ảnh quá lớn.");
      }
      chunks.push(chunk.value);
    }
    const data = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length; }
    return JSON.parse(new TextDecoder().decode(data)) as Record<string, unknown>;
  } finally { reader.releaseLock(); }
}

/** This adapter deliberately supports a known model profile; models with different
 * request/response formats get their own adapter/profile rather than guessed fields. */
export class CloudflareImageProvider implements ImageGenerationProvider {
  readonly provider = "cloudflare-workers-ai";
  readonly capabilities = { exactAspectRatio: false, referenceImages: false };
  readonly configured: boolean;
  readonly model: string;

  constructor(private readonly options: ImageProviderOptions) {
    this.model = options.model;
    if (this.model !== "@cf/black-forest-labs/flux-1-schnell") {
      throw new ImageProviderError("configuration", "Model tạo ảnh chưa có adapter. Dùng FLUX.1 Schnell hoặc bổ sung adapter cho model mới.");
    }
    this.configured = Boolean(/^[a-f0-9]{32}$/i.test(options.accountId) && options.apiToken);
  }

  async generateImage(request: ImageGenerationRequest): Promise<GeneratedImage> {
    if (!this.configured) throw new ImageProviderError("configuration", "Cần CLOUDFLARE_ACCOUNT_ID và CLOUDFLARE_API_TOKEN ở backend.");
    if (!request.prompt.trim() || request.prompt.length > 2_048 || !Number.isInteger(request.seed) || request.seed < 0 || request.seed > 2_147_483_647) {
      throw new ImageProviderError("configuration", "Prompt hoặc seed tạo ảnh không hợp lệ.");
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);
    try {
      const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${this.options.accountId}/ai/run/${this.model}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.options.apiToken}`, "Content-Type": "application/json" },
        // The live Schnell schema has additionalProperties: false and accepts only
        // prompt and steps. Keep seed in the common interface for other adapters.
        body: JSON.stringify({ prompt: request.prompt, steps: 4 }),
        signal: controller.signal,
        redirect: "error",
      });
      if (!response.ok) {
        const payload = await boundedJson(response, 65_536).catch(() => null);
        const providerCodes = Array.isArray(payload?.errors) ? payload.errors.flatMap((error: unknown) => {
          const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
          return typeof code === "number" && Number.isSafeInteger(code) && code >= 0 ? [code] : [];
        }).slice(0, 5) : [];
        const diagnostics = { httpStatus: response.status, providerCodes };
        // Only numeric codes are retained; provider messages can echo prompts or secrets.
        if (providerCodes.includes(5006)) throw new ImageProviderError("configuration", "Định dạng yêu cầu tạo ảnh bị Cloudflare từ chối. Quản trị viên cần kiểm tra adapter theo schema của model.", diagnostics);
        if (response.status === 401 || response.status === 403) throw new ImageProviderError("credentials", "Token tạo ảnh bị từ chối. Kiểm tra Account ID và quyền Workers AI Read/Edit.", diagnostics);
        if (response.status === 429) throw new ImageProviderError("quota", "Dịch vụ đang giới hạn lượt hoặc đã hết hạn mức miễn phí. Chờ rồi thử lại; hệ thống không đổi sang dịch vụ tính phí.", diagnostics);
        throw new ImageProviderError("unavailable", "Dịch vụ tạo ảnh chưa xử lý được yêu cầu. Kiểm tra hạn mức trong Cloudflare và thử lại sau.", diagnostics);
      }
      const payload = await boundedJson(response);
      const result = payload.result as { image?: unknown } | undefined;
      if (payload.success !== true || typeof result?.image !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(result.image) || result.image.length % 4 !== 0) {
        throw new ImageProviderError("invalid-image", "Dịch vụ không trả về ảnh hợp lệ. Kiểm tra trạng thái và hạn mức Cloudflare.");
      }
      const bytes = Uint8Array.from(atob(result.image), (char) => char.charCodeAt(0));
      return { bytes, mimeType: validateGeneratedImage(bytes), provider: this.provider, model: this.model };
    } catch (error) {
      if (error instanceof ImageProviderError) throw error;
      if (controller.signal.aborted) throw new ImageProviderError("timeout", "Tạo ảnh quá thời gian chờ. Bạn có thể thử lại thủ công; lượt cũ có thể đã dùng hạn mức.");
      // Never include response bodies, URLs containing credentials, or raw transport errors.
      throw new ImageProviderError("unavailable", "Chưa kết nối được dịch vụ tạo ảnh. Hãy thử lại sau.");
    } finally { clearTimeout(timeout); }
  }
}

type ImageProviderFactory = (options: ImageProviderOptions) => ImageGenerationProvider;
const imageProviderFactories = new Map<string, ImageProviderFactory>([
  ["cloudflare-workers-ai", (options) => new CloudflareImageProvider(options)],
]);

/** Extension point for paid/local providers; storyboard routes and UI stay unchanged. */
export function registerImageProvider(provider: string, factory: ImageProviderFactory) {
  if (!provider || imageProviderFactories.has(provider)) throw new Error("Image provider name must be unique");
  imageProviderFactories.set(provider, factory);
}

export function createImageGenerationProvider(options: ImageProviderOptions): ImageGenerationProvider {
  if (options.provider === "disabled") {
    return { configured: false, provider: "disabled", model: options.model, capabilities: { exactAspectRatio: false, referenceImages: false }, generateImage: async () => { throw new ImageProviderError("configuration", "Tạo ảnh đang tắt ở backend."); } };
  }
  const factory = imageProviderFactories.get(options.provider);
  if (!factory) throw new ImageProviderError("configuration", "Nhà cung cấp tạo ảnh chưa có adapter trong hệ thống.");
  return factory(options);
}
