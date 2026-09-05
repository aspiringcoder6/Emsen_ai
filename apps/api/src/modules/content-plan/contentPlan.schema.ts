import type { ContentPlanBriefDto, ContentPlanItemDto } from "@creator-flow/contracts";
import { HttpError } from "../../shared/http.js";

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
  return { weekStart: parseWeekStart(body.weekStart), focus: text(body.focus, "Mục tiêu tuần", 2000, false) };
}
export function parsePlanItems(value: unknown, pillarCount: number): ContentPlanItemDto[] {
  if (!Array.isArray(value) || value.length !== 7) return invalid("Kế hoạch cần đúng 7 ngày, mỗi ngày một nội dung.");
  const items = value.map((value) => {
    const row = planObject(value);
    if (!Number.isInteger(row.dayIndex) || (row.dayIndex as number) < 0 || (row.dayIndex as number) > 6) return invalid("Ngày trong kế hoạch phải từ 0 đến 6.");
    if (!Number.isInteger(row.pillarIndex) || (row.pillarIndex as number) < 0 || (row.pillarIndex as number) >= pillarCount) return invalid("Trụ cột không thuộc định hướng đã chọn.");
    if (!["Giá trị", "Kết nối", "Chuyển đổi"].includes(row.objective as string)) return invalid("Mục đích nội dung không hợp lệ.");
    return {
      dayIndex: row.dayIndex as number, pillarIndex: row.pillarIndex as number,
      objective: row.objective as ContentPlanItemDto["objective"],
      title: text(row.title, "Tiêu đề", 250), angle: text(row.angle, "Góc khai thác", 2000),
      platform: text(row.platform, "Nền tảng", 80), format: text(row.format, "Định dạng", 120),
      hook: text(row.hook, "Mở đầu", 1000), cta: text(row.cta, "Lời kêu gọi", 1000),
      productionNotes: text(row.productionNotes, "Ghi chú sản xuất", 2000, false),
    };
  });
  if (new Set(items.map((item) => item.dayIndex)).size !== 7) return invalid("Kế hoạch không được lặp hoặc thiếu ngày.");
  return items.sort((a, b) => a.dayIndex - b.dayIndex);
}

export const planResponseSchema = {
  type: "object",
  properties: { items: { type: "array", minItems: 7, maxItems: 7, items: {
    type: "object", properties: {
      dayIndex: { type: "integer", minimum: 0, maximum: 6 },
      pillarIndex: { type: "integer", minimum: 0 },
      objective: { type: "string", enum: ["Giá trị", "Kết nối", "Chuyển đổi"] },
      title: { type: "string" }, angle: { type: "string" }, platform: { type: "string" },
      format: { type: "string" }, hook: { type: "string" }, cta: { type: "string" }, productionNotes: { type: "string" },
    }, required: ["dayIndex", "pillarIndex", "objective", "title", "angle", "platform", "format", "hook", "cta", "productionNotes"],
  } } }, required: ["items"],
};
