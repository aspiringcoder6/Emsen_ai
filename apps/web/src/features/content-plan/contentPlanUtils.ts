import type { ContentPlanItemDto, DirectionVersionDto } from "@creator-flow/contracts";

export function currentWeekStart() {
  const date = new Date();
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function planDate(start: string, offset: number) {
  const date = new Date(`${start}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return new Intl.DateTimeFormat("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(date);
}
export function emptyPlan(direction: DirectionVersionDto, days = Array.from({ length: 7 }, (_, index) => index)): ContentPlanItemDto[] {
  return days.map((dayIndex, index) => ({ id: crypto.randomUUID(), dayIndex, pillarIndex: index % direction.content.pillars.length, objective: "Giá trị", title: "", angle: "", hook: "", cta: "", productionNotes: "", platform: direction.dnaSnapshot.profile.platforms[0] || "TikTok", format: "Video ngắn" }));
}
export function isPlanComplete(items: ContentPlanItemDto[]) {
  return items.length >= 1 && items.length <= 7
    && new Set(items.map((item) => item.id)).size === items.length
    && items.every((item) => [item.title, item.angle, item.hook, item.cta, item.platform, item.format].every((value) => value.trim()));
}
export function scheduleDays(availableDays: number[] | null, target: number | null) {
  const available = availableDays ?? Array.from({ length: 7 }, (_, index) => index);
  if (target === null) return available;
  if (target > available.length) {
    return Array.from({ length: target }, (_, index) => available[index % available.length]!).sort((a, b) => a - b);
  }
  if (target === available.length) return available;
  if (target === 1) return [available[Math.floor((available.length - 1) / 2)]!];
  return Array.from({ length: target }, (_, index) => available[Math.round(index * (available.length - 1) / (target - 1))]!);
}
export function isScheduleCompatible(items: ContentPlanItemDto[], availableDays: number[] | null, target: number | null) {
  return (target === null || items.length === target)
    && (availableDays === null || items.every((item) => availableDays.includes(item.dayIndex)));
}
