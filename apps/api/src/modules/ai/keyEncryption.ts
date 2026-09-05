import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../../config.js";
import { HttpError } from "../../shared/http.js";

let cachedKey: Buffer | undefined;
function encryptionKey() {
  if (cachedKey) return cachedKey;
  const encoded = process.env.AI_KEY_ENCRYPTION_KEY?.trim();
  if (encoded) {
    const key = Buffer.from(encoded, "base64");
    if (key.length !== 32) throw new HttpError(503, "KEY_STORAGE_UNAVAILABLE", "Cấu hình bảo vệ API key trên máy chủ chưa hợp lệ.");
    return (cachedKey = key);
  }
  if (config.isProduction) throw new HttpError(503, "KEY_STORAGE_UNAVAILABLE", "Máy chủ cần cấu hình bảo vệ API key trước khi lưu.");
  // Stable local-only secret, outside source control. Production must supply a managed secret.
  const path = fileURLToPath(new URL("../../../../../.local/ai-key-encryption.key", import.meta.url));
  mkdirSync(dirname(path), { recursive: true });
  try { writeFileSync(path, randomBytes(32), { flag: "wx", mode: 0o600 }); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
  const key = readFileSync(path);
  if (key.length !== 32) throw new HttpError(503, "KEY_STORAGE_UNAVAILABLE", "Không đọc được cấu hình bảo vệ API key.");
  return (cachedKey = key);
}

export function encryptApiKey(value: string, userId: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from(userId));
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptApiKey(value: string, userId: string) {
  try {
    const [version, iv, tag, data] = value.split(".");
    if (version !== "v1" || !iv || !tag || !data) throw new Error("Invalid encrypted payload");
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64"));
    decipher.setAAD(Buffer.from(userId));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
  } catch {
    throw new HttpError(503, "KEY_STORAGE_UNAVAILABLE", "Chưa thể đọc API key đã lưu. Hãy kiểm tra cấu hình máy chủ hoặc lưu lại key trong Cài đặt.");
  }
}
