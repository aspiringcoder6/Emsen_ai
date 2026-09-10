import type { ContentPlanItemDto } from "@creator-flow/contracts";

export function legacyContentPlanItemId(
  planId: string,
  dayIndex: number,
  occurrence = 0,
) {
  return `legacy:${planId}:${dayIndex}:${occurrence}`;
}

/** Adds deterministic ids to plans saved before content items had their own id. */
export function normalizeContentPlanItems(
  items: ContentPlanItemDto[] | undefined,
  planId: string,
): ContentPlanItemDto[] {
  const dayOccurrences = new Map<number, number>();
  const usedIds = new Map<string, number>();

  return (items ?? []).map((storedItem) => {
    const item = storedItem as ContentPlanItemDto & { id?: unknown };
    const occurrence = dayOccurrences.get(item.dayIndex) ?? 0;
    dayOccurrences.set(item.dayIndex, occurrence + 1);

    const preferredId = typeof item.id === "string" && item.id.trim()
      ? item.id.trim()
      : legacyContentPlanItemId(planId, item.dayIndex, occurrence);
    const duplicate = usedIds.get(preferredId) ?? 0;
    usedIds.set(preferredId, duplicate + 1);

    return {
      ...item,
      id: duplicate === 0 ? preferredId : `${preferredId}:duplicate:${duplicate}`,
    };
  });
}
