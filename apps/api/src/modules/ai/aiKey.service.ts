import { GeminiAiProvider } from "@creator-flow/ai-provider";
import type { AiKeySettingsDto } from "@creator-flow/contracts";
import { config } from "../../config.js";
import { database } from "../../database/pool.js";
import { HttpError } from "../../shared/http.js";
import { decryptApiKey, encryptApiKey } from "./keyEncryption.js";

const makeProvider = (apiKey: string) => new GeminiAiProvider({ apiKey, model: config.gemini.model, timeoutMs: config.gemini.timeoutMs });

export async function getUserAiProvider(userId: string) {
  const result = await database.query<{ encrypted_key: string }>("SELECT encrypted_key FROM user_ai_keys WHERE user_id = $1", [userId]);
  const row = result.rows[0];
  // An invalid personal key must never silently spend the shared workspace quota.
  return makeProvider(row ? decryptApiKey(row.encrypted_key, userId) : config.gemini.apiKey);
}

export async function getAiKeySettings(userId: string): Promise<AiKeySettingsDto> {
  const result = await database.query<{ last_four: string; updated_at: Date }>("SELECT last_four, updated_at FROM user_ai_keys WHERE user_id = $1", [userId]);
  const row = result.rows[0];
  return {
    hasPersonalKey: Boolean(row), maskedKey: row ? `••••${row.last_four}` : null,
    source: row ? "personal" : config.gemini.apiKey ? "workspace" : "none",
    model: config.gemini.model, updatedAt: row?.updated_at.toISOString() ?? null,
  };
}

async function checkProvider(provider: GeminiAiProvider) {
  if (!provider.configured) throw new HttpError(400, "API_KEY_REQUIRED", "Hãy nhập Google API key trước.");
  try {
    const result = await provider.generateStructured<{ ok: boolean }>({
      schemaName: "connection_test", systemPrompt: "Return the requested JSON only.",
      userPrompt: "Return {\"ok\":true}.", thinkingLevel: "minimal",
      responseSchema: { type: "object", properties: { ok: { type: "boolean" } }, required: ["ok"] },
    });
    if (result.output?.ok !== true) throw new Error("Invalid test response");
  } catch {
    throw new HttpError(502, "API_KEY_TEST_FAILED", "Chưa kết nối được với Gemini. Kiểm tra key, quyền truy cập model và hạn mức trong AI Studio rồi thử lại. Key cũ vẫn được giữ.");
  }
}

const checkingUsers = new Set<string>();
export async function testAndSaveApiKey(userId: string, key: string) {
  if (checkingUsers.has(userId)) throw new HttpError(429, "KEY_CHECK_BUSY", "Đang kiểm tra kết nối. Vui lòng đợi kết quả hiện tại.");
  checkingUsers.add(userId);
  try {
    const encrypted = encryptApiKey(key, userId);
    await checkProvider(makeProvider(key));
    await database.query(`INSERT INTO user_ai_keys (user_id, encrypted_key, last_four) VALUES ($1,$2,$3)
      ON CONFLICT (user_id) DO UPDATE SET encrypted_key = EXCLUDED.encrypted_key, last_four = EXCLUDED.last_four, updated_at = NOW()`, [userId, encrypted, key.slice(-4)]);
    return getAiKeySettings(userId);
  } finally { checkingUsers.delete(userId); }
}

export async function removeApiKey(userId: string) {
  if (checkingUsers.has(userId)) throw new HttpError(409, "KEY_CHECK_BUSY", "Hãy đợi kiểm tra key hoàn tất trước khi gỡ.");
  await database.query("DELETE FROM user_ai_keys WHERE user_id = $1", [userId]);
  return getAiKeySettings(userId);
}
