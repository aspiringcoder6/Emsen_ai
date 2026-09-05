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
export function emptyPlan(direction: DirectionVersionDto): ContentPlanItemDto[] {
  return Array.from({ length: 7 }, (_, dayIndex) => ({ dayIndex, pillarIndex: dayIndex % direction.content.pillars.length, objective: "Giá trị", title: "", angle: "", hook: "", cta: "", productionNotes: "", platform: direction.dnaSnapshot.profile.platforms[0] || "TikTok", format: "Video ngắn" }));
}
export function isPlanComplete(items: ContentPlanItemDto[]) {
  return items.length === 7 && items.every((item) => [item.title, item.angle, item.hook, item.cta, item.platform, item.format].every((value) => value.trim()));
}
