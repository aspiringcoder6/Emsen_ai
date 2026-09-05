import type { DirectionBriefDto, DirectionContentDto } from "@creator-flow/contracts";
import { HttpError } from "../../shared/http.js";

function invalid(message: string): never {
  throw new HttpError(400, "INVALID_DIRECTION", message);
}

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid("Dữ liệu định hướng không hợp lệ.");
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string, max: number, required = true): string {
  if (typeof value !== "string" || value.length > max || (required && !value.trim())) {
    invalid(`${label}${required ? " cần được điền và" : ""} không được quá ${max} ký tự.`);
  }
  return value.trim();
}

export function parseBaseVersion(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) invalid("Phiên bản định hướng không hợp lệ.");
  return value as number;
}

export function parseBrief(value: unknown): DirectionBriefDto {
  const body = object(value);
  return { goal: text(body.goal, "Mục tiêu", 1000), notes: text(body.notes, "Ghi chú", 4000, false) };
}

export function parseContent(value: unknown): DirectionContentDto {
  const body = object(value);
  if (!Array.isArray(body.pillars) || body.pillars.length < 3 || body.pillars.length > 5) {
    invalid("Cần có từ 3 đến 5 trụ cột nội dung.");
  }
  const pillars = body.pillars.map((value) => {
    const pillar = object(value);
    if (!Number.isInteger(pillar.percentage) || (pillar.percentage as number) < 1 || (pillar.percentage as number) > 100) {
      invalid("Tỷ lệ mỗi trụ cột phải là số nguyên từ 1 đến 100.");
    }
    if (!Array.isArray(pillar.examples) || pillar.examples.length < 1 || pillar.examples.length > 3) {
      invalid("Mỗi trụ cột cần có từ 1 đến 3 ý tưởng minh họa.");
    }
    return {
      name: text(pillar.name, "Tên trụ cột", 120),
      description: text(pillar.description, "Mô tả trụ cột", 1500),
      percentage: pillar.percentage as number,
      examples: pillar.examples.map((example) => text(example, "Ý tưởng minh họa", 500)),
    };
  });
  if (pillars.reduce((sum, pillar) => sum + pillar.percentage, 0) !== 100) invalid("Tổng tỷ lệ các trụ cột phải bằng 100%.");
  if (new Set(pillars.map((pillar) => pillar.name.toLocaleLowerCase("vi-VN"))).size !== pillars.length) invalid("Tên các trụ cột cần khác nhau.");
  return {
    positioning: text(body.positioning, "Định vị kênh", 4000),
    tone: text(body.tone, "Giọng điệu", 4000),
    audience: text(body.audience, "Khán giả", 4000),
    pillars,
  };
}

export const directionResponseSchema = {
  type: "object",
  properties: {
    positioning: { type: "string", description: "Định vị, giá trị riêng và lời hứa của kênh." },
    tone: { type: "string", description: "Giọng điệu, cách nói nên dùng và cần tránh, ví dụ câu ngắn." },
    audience: { type: "string", description: "Khán giả, nhu cầu và lợi ích nội dung mang lại; đánh dấu giả định cần xác nhận." },
    pillars: {
      type: "array", minItems: 3, maxItems: 5,
      items: {
        type: "object",
        properties: {
          name: { type: "string" }, description: { type: "string" },
          percentage: { type: "integer", minimum: 1, maximum: 100 },
          examples: { type: "array", minItems: 1, maxItems: 3, items: { type: "string" } },
        },
        required: ["name", "description", "percentage", "examples"],
      },
    },
  },
  required: ["positioning", "tone", "audience", "pillars"],
};
