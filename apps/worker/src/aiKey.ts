import { createDecipheriv } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { workerConfig } from "./config.js";
import { workerDatabase } from "./database.js";

let cachedEncryptionKey: Buffer | null = null;

function encryptionKey() {
  if (cachedEncryptionKey) return cachedEncryptionKey;
  const encoded = process.env.AI_KEY_ENCRYPTION_KEY?.trim();
  if (encoded) {
    const key = Buffer.from(encoded, "base64");
    if (key.length !== 32) throw new Error("AI_KEY_ENCRYPTION_KEY của worker chưa hợp lệ.");
    return (cachedEncryptionKey = key);
  }
  if (workerConfig.isProduction) {
    throw new Error("Worker cần AI_KEY_ENCRYPTION_KEY để đọc khóa AI của người dùng.");
  }
  const path = [
    resolve(process.cwd(), ".local/ai-key-encryption.key"),
    resolve(process.cwd(), "../../.local/ai-key-encryption.key"),
  ].find(existsSync);
  if (!path) throw new Error("Hãy mở API ít nhất một lần hoặc cấu hình AI_KEY_ENCRYPTION_KEY cho worker.");
  const key = readFileSync(path);
  if (key.length !== 32) throw new Error("Khóa bảo vệ Google API key chưa hợp lệ.");
  return (cachedEncryptionKey = key);
}

function decryptApiKey(value: string, userId: string) {
  const [version, iv, tag, data] = value.split(".");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Dữ liệu Google API key chưa hợp lệ.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64"));
  decipher.setAAD(Buffer.from(userId));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
}

export async function getGeminiApiKey(userId: string) {
  const result = await workerDatabase.query<{ encrypted_key: string }>(
    "SELECT encrypted_key FROM user_ai_keys WHERE user_id = $1",
    [userId],
  );
  const encrypted = result.rows[0]?.encrypted_key;
  const key = encrypted ? decryptApiKey(encrypted, userId) : workerConfig.gemini.apiKey;
  if (!key) throw new Error("Hãy thêm Google API key trong Cài đặt trước khi tạo lời thoại.");
  return key;
}
