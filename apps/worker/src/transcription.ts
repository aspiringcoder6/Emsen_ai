import { randomUUID } from "node:crypto";
import {
  createPartFromText,
  createPartFromUri,
  createUserContent,
  FileState,
  GoogleGenAI,
  type File as GeminiFile,
} from "@google/genai";
import { workerConfig } from "./config.js";

export type TranscriptionAsset = {
  durationSeconds: number;
  fileName: string;
  localPath: string;
  mimeType: string;
};

type RawTranscript = {
  language?: string;
  segments?: Array<{
    clipIndex?: number;
    endSeconds?: number;
    startSeconds?: number;
    text?: string;
  }>;
};

function geminiMimeType(value: string) {
  return value === "video/quicktime" ? "video/mov" : value;
}

async function waitUntilActive(ai: GoogleGenAI, uploaded: GeminiFile, deadline: number) {
  let file = uploaded;
  while (file.state === FileState.PROCESSING || !file.state) {
    if (Date.now() >= deadline) throw new Error("Gemini xử lý video quá thời gian cho phép.");
    await new Promise((resolve) => setTimeout(resolve, 5_000));
    if (!file.name) throw new Error("Gemini không trả về mã tệp video.");
    file = await ai.files.get({ name: file.name });
  }
  if (file.state !== FileState.ACTIVE || !file.uri || !file.mimeType) {
    throw new Error(file.error?.message || "Gemini không thể đọc video đã tải lên.");
  }
  return file;
}

export async function transcribeVideos(
  apiKey: string,
  assets: TranscriptionAsset[],
  onProgress: (progress: number) => Promise<void>,
) {
  const ai = new GoogleGenAI({ apiKey });
  const deadline = Date.now() + workerConfig.gemini.timeoutMs;
  const uploaded: GeminiFile[] = [];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), workerConfig.gemini.timeoutMs);
  try {
    for (const [index, asset] of assets.entries()) {
      const file = await ai.files.upload({
        file: asset.localPath,
        config: {
          abortSignal: controller.signal,
          displayName: asset.fileName.slice(0, 500),
          mimeType: geminiMimeType(asset.mimeType),
        },
      });
      uploaded.push(file);
      await onProgress(Math.round(10 + ((index + 1) / assets.length) * 30));
    }
    const activeFiles: GeminiFile[] = [];
    for (const file of uploaded) activeFiles.push(await waitUntilActive(ai, file, deadline));
    await onProgress(50);

    const prompt = `Chép lại nguyên văn lời nói trong các clip theo đúng thứ tự được cung cấp.
Ngôn ngữ ưu tiên: tiếng Việt. Giữ cách nói tự nhiên nhưng thêm dấu câu để dễ đọc; không tự thêm câu không nghe thấy.
Mỗi segment cần clipIndex bắt đầu từ 0, startSeconds và endSeconds tính riêng từ đầu clip đó.
Tách segment ở chỗ ngắt câu hoặc đổi ý, thường dài 2–10 giây. Nếu một clip không có lời nói thì không tạo segment cho clip đó.
Chỉ trả JSON theo schema.`;
    const response = await ai.models.generateContent({
      model: workerConfig.gemini.model,
      contents: createUserContent([
        ...activeFiles.map((file) => createPartFromUri(file.uri!, file.mimeType!)),
        createPartFromText(prompt),
      ]),
      config: {
        abortSignal: controller.signal,
        responseJsonSchema: {
          type: "object",
          properties: {
            language: { type: "string" },
            segments: {
              type: "array",
              maxItems: 1_000,
              items: {
                type: "object",
                properties: {
                  clipIndex: { type: "integer", minimum: 0, maximum: Math.max(0, assets.length - 1) },
                  startSeconds: { type: "number", minimum: 0 },
                  endSeconds: { type: "number", minimum: 0 },
                  text: { type: "string" },
                },
                required: ["clipIndex", "startSeconds", "endSeconds", "text"],
              },
            },
          },
          required: ["language", "segments"],
        },
        responseMimeType: "application/json",
        systemInstruction: "Bạn là công cụ chép lời chính xác cho video creator. Không sáng tác hoặc sửa ý người nói.",
        temperature: 0,
      },
    });
    await onProgress(85);
    const raw = JSON.parse(response.text ?? "{}") as RawTranscript;
    const offsets: number[] = [];
    let totalDuration = 0;
    for (const asset of assets) {
      offsets.push(totalDuration);
      totalDuration += asset.durationSeconds;
    }
    const segments = (Array.isArray(raw.segments) ? raw.segments : []).flatMap((segment) => {
      const clipIndex = Number(segment.clipIndex);
      const asset = assets[clipIndex];
      const text = typeof segment.text === "string" ? segment.text.replace(/\s+/g, " ").trim() : "";
      if (!asset || !text) return [];
      const localStart = Math.max(0, Math.min(asset.durationSeconds, Number(segment.startSeconds)));
      const localEnd = Math.max(localStart, Math.min(asset.durationSeconds, Number(segment.endSeconds)));
      if (!Number.isFinite(localStart) || !Number.isFinite(localEnd) || localEnd <= localStart) return [];
      return [{
        endSeconds: Math.round((offsets[clipIndex]! + localEnd) * 100) / 100,
        id: randomUUID(),
        startSeconds: Math.round((offsets[clipIndex]! + localStart) * 100) / 100,
        text,
      }];
    }).sort((left, right) => left.startSeconds - right.startSeconds);
    return {
      durationSeconds: Math.round(totalDuration * 100) / 100,
      language: raw.language?.trim().slice(0, 20) || "vi",
      model: response.modelVersion ?? workerConfig.gemini.model,
      segments,
    };
  } finally {
    clearTimeout(timeout);
    await Promise.allSettled(uploaded.flatMap((file) => file.name ? [ai.files.delete({ name: file.name })] : []));
  }
}
