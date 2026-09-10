import type {
  ContentPlanItemDto,
  ContentPlanVersionDto,
  ScriptDocumentDto,
  ScriptPlanSourceSnapshotDto,
  ScriptPlanSyncField,
} from "@creator-flow/contracts";

function addDays(date: string, dayIndex: number) {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + dayIndex);
  return result.toISOString().slice(0, 10);
}

export function planSourceSnapshot(
  item: ContentPlanItemDto,
  weekStart: string,
): ScriptPlanSourceSnapshotDto {
  return {
    title: item.title,
    angle: item.angle,
    hook: item.hook,
    cta: item.cta,
    platform: item.platform,
    format: item.format,
    objective: item.objective,
    productionNotes: item.productionNotes,
    scheduledFor: addDays(weekStart, item.dayIndex),
  };
}

export function hydrateScriptPlanReference(
  script: ScriptDocumentDto,
  context: {
    contentPlanId: string;
    contentPlanVersionId: string;
    contentPlanVersion: number;
    contentPlanItemId: string;
    planName: string;
    weekStart: string;
    item?: ContentPlanItemDto;
  },
): ScriptDocumentDto {
  if (!script.planReference) return script;
  const previous = script.planReference as Partial<ScriptDocumentDto["planReference"]> & {
    dayIndex: number;
    planTitle: string;
  };
  const sourceSnapshot = previous.sourceSnapshot ?? (context.item
    ? planSourceSnapshot(context.item, context.weekStart)
    : {
        title: script.title,
        angle: script.content.body,
        hook: script.content.hook,
        cta: script.content.cta,
        platform: script.settings.platform,
        format: script.settings.format,
        objective: script.settings.objective,
        productionNotes: script.advancedSettings.productionNotes,
        scheduledFor: script.settings.scheduledFor ?? "",
      });
  return {
    ...script,
    planReference: {
      contentPlanId: context.contentPlanId,
      contentPlanVersionId: context.contentPlanVersionId,
      contentPlanVersion: context.contentPlanVersion,
      contentPlanItemId: context.contentPlanItemId,
      dayIndex: previous.dayIndex,
      weekStart: context.weekStart,
      planName: context.planName,
      planTitle: context.item?.title ?? previous.planTitle,
      sourceSnapshot,
      sync: previous.sync ?? {
        state: "current",
        syncedAt: script.createdAt,
        appliedFields: [],
        preservedFields: [],
      },
    },
  };
}

export function synchronizeScriptWithPlan(
  script: ScriptDocumentDto,
  plan: ContentPlanVersionDto,
  planName: string,
  nextItem: ContentPlanItemDto | undefined,
  now = new Date().toISOString(),
) {
  if (!script.planReference) return script;
  const previous = script.planReference.sourceSnapshot;

  if (!nextItem) {
    return {
      ...script,
      revision: script.revision + 1,
      updatedAt: now,
      planReference: {
        ...script.planReference,
        contentPlanId: plan.planId,
        contentPlanVersionId: plan.id,
        contentPlanVersion: plan.version,
        weekStart: plan.brief.weekStart,
        planName,
        sync: {
          state: "source-removed" as const,
          syncedAt: now,
          appliedFields: [],
          preservedFields: [],
        },
      },
    };
  }

  const next = planSourceSnapshot(nextItem, plan.brief.weekStart);
  const appliedFields: ScriptPlanSyncField[] = [];
  const preservedFields: ScriptPlanSyncField[] = [];
  let title = script.title;
  const content = { ...script.content };
  const settings = { ...script.settings };
  const advancedSettings = { ...script.advancedSettings };

  const update = (
    field: ScriptPlanSyncField,
    currentValue: string | null,
    previousValue: string,
    nextValue: string,
    apply: () => void,
  ) => {
    if (previousValue === nextValue || currentValue === nextValue) return;
    if (currentValue === previousValue) {
      apply();
      appliedFields.push(field);
    } else {
      preservedFields.push(field);
    }
  };

  update("title", title, previous.title, next.title, () => { title = next.title; });
  update("hook", content.hook, previous.hook, next.hook, () => { content.hook = next.hook; });
  update("body", content.body, previous.angle, next.angle, () => { content.body = next.angle; });
  update("cta", content.cta, previous.cta, next.cta, () => { content.cta = next.cta; });
  const firstFrame = content.storyboard[0];
  if (firstFrame) {
    const nextFrame = { ...firstFrame };
    let frameUpdated = false;
    let framePreserved = false;
    const updateFrameValue = (currentValue: string, previousValue: string, nextValue: string, apply: () => void) => {
      if (previousValue === nextValue || currentValue === nextValue) return;
      if (currentValue === previousValue) {
        apply();
        frameUpdated = true;
      } else {
        framePreserved = true;
      }
    };
    updateFrameValue(firstFrame.dialogue, previous.hook, next.hook, () => { nextFrame.dialogue = next.hook; });
    updateFrameValue(
      firstFrame.visual,
      `Khung hình mở đầu cho: ${previous.title}`,
      `Khung hình mở đầu cho: ${next.title}`,
      () => { nextFrame.visual = `Khung hình mở đầu cho: ${next.title}`; },
    );
    if (frameUpdated) {
      content.storyboard = [nextFrame, ...content.storyboard.slice(1)];
      appliedFields.push("storyboard");
    }
    if (framePreserved) preservedFields.push("storyboard");
  }
  update("schedule", settings.scheduledFor, previous.scheduledFor, next.scheduledFor, () => { settings.scheduledFor = next.scheduledFor; });
  update("platform", settings.platform, previous.platform, next.platform, () => { settings.platform = next.platform; });
  update("format", settings.format, previous.format, next.format, () => { settings.format = next.format; });
  update("objective", settings.objective, previous.objective, next.objective, () => { settings.objective = next.objective; });
  update("productionNotes", advancedSettings.productionNotes, previous.productionNotes, next.productionNotes, () => { advancedSettings.productionNotes = next.productionNotes; });

  return {
    ...script,
    title,
    content,
    settings,
    advancedSettings,
    revision: script.revision + 1,
    updatedAt: now,
    planReference: {
      contentPlanId: plan.planId,
      contentPlanVersionId: plan.id,
      contentPlanVersion: plan.version,
      contentPlanItemId: nextItem.id,
      dayIndex: nextItem.dayIndex,
      weekStart: plan.brief.weekStart,
      planName,
      planTitle: nextItem.title,
      sourceSnapshot: next,
      sync: {
        state: "updated" as const,
        syncedAt: now,
        appliedFields,
        preservedFields,
      },
    },
  };
}
