import { randomUUID } from "node:crypto";
import type { ContentPlanBriefDto, ContentPlanItemDto } from "@creator-flow/contracts";
import { HttpError } from "../../shared/http.js";
import { legacyContentPlanItemId } from "./contentPlanItems.js";

const invalid = (message: string): never => { throw new HttpError(400, "INVALID_CONTENT_PLAN", message); };
export function planObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalid("Dữ liệu kế hoạch không hợp lệ.");
  return value as Record<string, unknown>;
}
export function parseWeekStart(value: unknown): string {
  if (typeof value !== "string" || !/^20\d{2}-\d{2}-\d{2}$/.test(value)) return invalid("Ngày bắt đầu không hợp lệ.");
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return invalid("Ngày bắt đầu không tồn tại.");
  return value;
}
function text(value: unknown, label: string, max: number, required = true): string {
  if (typeof value !== "string" || value.length > max || (required && !value.trim())) return invalid(`${label} cần hợp lệ và không quá ${max} ký tự.`);
  return value.trim();
}
export function parsePlanBrief(value: unknown): ContentPlanBriefDto {
  const body = planObject(value);
  let availableDays: number[] | null = null;
  if (body.availableDays !== undefined && body.availableDays !== null) {
    if (!Array.isArray(body.availableDays) || body.availableDays.length < 1 || body.availableDays.length > 7) {
      return invalid("Hãy chọn từ 1 đến 7 ngày rảnh, hoặc để AI tự sắp lịch.");
    }
    availableDays = body.availableDays.map((day) => {
      if (!Number.isInteger(day) || (day as number) < 0 || (day as number) > 6) {
        return invalid("Ngày rảnh cần nằm trong tuần đang chọn.");
      }
      return day as number;
    }).sort((a, b) => a - b);
    if (new Set(availableDays).size !== availableDays.length) return invalid("Ngày rảnh không được lặp lại.");
  }
  let weeklyVideoTarget: number | null = null;
  if (body.weeklyVideoTarget !== undefined && body.weeklyVideoTarget !== null) {
    if (!Number.isInteger(body.weeklyVideoTarget) || (body.weeklyVideoTarget as number) < 1 || (body.weeklyVideoTarget as number) > 7) {
      return invalid("Mục tiêu video cần từ 1 đến 7.");
    }
    weeklyVideoTarget = body.weeklyVideoTarget as number;
  }
  return {
    name: text(body.name ?? "Kế hoạch nội dung", "Tên kế hoạch", 120, true),
    weekStart: parseWeekStart(body.weekStart),
    focus: text(body.focus, "Mục tiêu tuần", 2000, false),
    availableDays,
    weeklyVideoTarget,
  };
}
export function parsePlanItems(
  value: unknown,
  pillarCount: number,
  legacyPlanId?: string,
  allowIncomplete = false,
): ContentPlanItemDto[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 7) return invalid("Kế hoạch cần từ 1 đến 7 nội dung trong tuần.");
  const dayOccurrences = new Map<number, number>();
  const items = value.map((value) => {
    const row = planObject(value);
    if (!Number.isInteger(row.dayIndex) || (row.dayIndex as number) < 0 || (row.dayIndex as number) > 6) return invalid("Ngày trong kế hoạch phải từ 0 đến 6.");
    if (!Number.isInteger(row.pillarIndex) || (row.pillarIndex as number) < 0 || (row.pillarIndex as number) >= pillarCount) return invalid("Trụ cột không thuộc định hướng đã chọn.");
    if (!["Giá trị", "Kết nối", "Chuyển đổi"].includes(row.objective as string)) return invalid("Mục đích nội dung không hợp lệ.");
    const dayIndex = row.dayIndex as number;
    const occurrence = dayOccurrences.get(dayIndex) ?? 0;
    dayOccurrences.set(dayIndex, occurrence + 1);
    return {
      id: row.id === undefined
        ? legacyPlanId ? legacyContentPlanItemId(legacyPlanId, dayIndex, occurrence) : randomUUID()
        : text(row.id, "Mã nội dung", 100),
      dayIndex, pillarIndex: row.pillarIndex as number,
      objective: row.objective as ContentPlanItemDto["objective"],
      title: text(row.title, "Tiêu đề", 250, !allowIncomplete),
      angle: text(row.angle, "Góc khai thác", 2000, !allowIncomplete),
      platform: text(row.platform, "Nền tảng", 80, !allowIncomplete),
      format: text(row.format, "Định dạng", 120, !allowIncomplete),
      hook: text(row.hook, "Mở đầu", 1000, !allowIncomplete),
      cta: text(row.cta, "Lời kêu gọi", 1000, !allowIncomplete),
      productionNotes: text(row.productionNotes, "Ghi chú sản xuất", 2000, false),
    };
  });
  if (new Set(items.map((item) => item.id)).size !== items.length) return invalid("Mỗi nội dung trong kế hoạch cần có mã riêng.");
  return items.sort((a, b) => a.dayIndex - b.dayIndex);
}

export function validatePlanSchedule(items: ContentPlanItemDto[], brief: ContentPlanBriefDto) {
  if (brief.weeklyVideoTarget !== null && items.length !== brief.weeklyVideoTarget) {
    return invalid(`Kế hoạch cần đúng ${brief.weeklyVideoTarget} video theo mục tiêu đã chọn.`);
  }
  if (brief.availableDays && items.some((item) => !brief.availableDays!.includes(item.dayIndex))) {
    return invalid("Kế hoạch có nội dung nằm ngoài những ngày rảnh đã chọn.");
  }
  return items;
}

export const planResponseSchema = {
  type: "object",
  properties: { items: { type: "array", minItems: 1, maxItems: 7, items: {
    type: "object", properties: {
      dayIndex: { type: "integer", minimum: 0, maximum: 6 },
      pillarIndex: { type: "integer", minimum: 0 },
      objective: { type: "string", enum: ["Giá trị", "Kết nối", "Chuyển đổi"] },
      title: { type: "string" }, angle: { type: "string" }, platform: { type: "string" },
      format: { type: "string" }, hook: { type: "string" }, cta: { type: "string" }, productionNotes: { type: "string" },
    }, required: ["dayIndex", "pillarIndex", "objective", "title", "angle", "platform", "format", "hook", "cta", "productionNotes"],
  } } }, required: ["items"],
};
