import { useEffect, useRef, useState } from "react";
import type {
  ContentPlanItemDto,
  ContentPlanStateDto,
  ContentPlanVersionDto,
  DirectionVersionDto,
} from "@creator-flow/contracts";
import { contentPlanUpdatedEvent, directionUpdatedEvent } from "../chat/chatConfig";
import { generateContentPlan, getContentPlan, saveContentPlan } from "./contentPlanApi";
import { currentWeekStart, emptyPlan, scheduleDays } from "./contentPlanUtils";

function defaultPlanName(count: number) {
  return `Kế hoạch nội dung ${String(count + 1).padStart(2, "0")}`;
}

function rebaseItems(
  items: ContentPlanItemDto[],
  direction: DirectionVersionDto,
) {
  const pillarCount = direction.content.pillars.length;
  return items.map((item) => ({
    ...item,
    pillarIndex: Math.abs(item.pillarIndex) % pillarCount,
  }));
}

function stateWithVersion(
  state: ContentPlanStateDto,
  version: ContentPlanVersionDto,
): ContentPlanStateDto {
  const summary = {
    id: version.planId,
    name: version.brief.name,
    weekStart: version.brief.weekStart,
    latestVersion: version.version,
    latestStatus: version.status,
    updatedAt: version.createdAt,
  };
  return {
    ...state,
    activePlanId: version.planId,
    versions: [version, ...state.versions.filter(({ id }) => id !== version.id)],
    plans: [summary, ...state.plans.filter((plan) => plan.id !== version.planId)],
  };
}

export function useContentPlan(active: boolean) {
  const [state, setState] = useState<ContentPlanStateDto | null>(null);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [planName, setPlanName] = useState("Kế hoạch nội dung 01");
  const [weekStart, setWeekStart] = useState(currentWeekStart);
  const [focus, setFocus] = useState("");
  const [availableDays, setAvailableDays] = useState<number[] | null>(null);
  const [weeklyVideoTarget, setWeeklyVideoTarget] = useState<number | null>(null);
  const [direction, setDirection] = useState<DirectionVersionDto | null>(null);
  const [items, setItems] = useState<ContentPlanItemDto[]>([]);
  const [selectedVersion, setSelectedVersion] = useState(0);
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  const busyRef = useRef(false);
  const wasActive = useRef(false);
  const pendingAgentPlanId = useRef<string | null>(null);
  const requestId = useRef(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const markDirty = (value: boolean) => {
    dirtyRef.current = value;
    setDirty(value);
    setNotice("");
  };
  const apply = (version: ContentPlanVersionDto) => {
    setActivePlanId(version.planId);
    setPlanName(version.brief.name);
    setWeekStart(version.brief.weekStart);
    setFocus(version.brief.focus);
    setAvailableDays(version.brief.availableDays);
    setWeeklyVideoTarget(version.brief.weeklyVideoTarget);
    setDirection(version.direction);
    setItems(version.items);
    setSelectedVersion(version.version);
    markDirty(false);
  };
  const prepareNew = (current: ContentPlanStateDto) => {
    const nextDirection = current.latestDirection;
    setState({ ...current, activePlanId: null, versions: [] });
    setActivePlanId(null);
    setPlanName(defaultPlanName(current.plans.length));
    setWeekStart(currentWeekStart());
    setFocus("");
    setAvailableDays(null);
    setWeeklyVideoTarget(null);
    setDirection(nextDirection);
    setItems(nextDirection ? emptyPlan(nextDirection) : []);
    setSelectedVersion(0);
    markDirty(false);
  };

  const load = async (planId?: string, preserveDraft = false) => {
    const id = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const result = await getContentPlan(planId ? { planId } : undefined);
      if (id !== requestId.current) return;
      if (preserveDraft) {
        setState((current) => current ? {
          ...current,
          plans: result.plans,
          aiConfigured: result.aiConfigured,
          latestDirection: result.latestDirection,
          latestApprovedDirection: result.latestApprovedDirection,
        } : result);
        if (
          result.latestDirection &&
          direction?.id !== result.latestDirection.id
        ) {
          const latestDirection = result.latestDirection;
          setDirection(latestDirection);
          setItems((current) =>
            current.length
              ? rebaseItems(current, latestDirection)
              : emptyPlan(
                  latestDirection,
                  scheduleDays(availableDays, weeklyVideoTarget),
                ),
          );
          markDirty(true);
          setNotice(
            `Đã tự nối các chỉnh sửa đang làm với Định hướng phiên bản ${latestDirection.version}. Nội dung chưa lưu của bạn vẫn được giữ.`,
          );
        }
        return;
      }
      const current = result.versions[0];
      const latestDirection = result.latestDirection;
      if (current && latestDirection && current.direction.id !== latestDirection.id) {
        const rebasedItems = rebaseItems(current.items, latestDirection);
        let aiSyncError: unknown = null;
        if (result.aiConfigured) {
          try {
            const updated = await generateContentPlan({
              baseVersion: current.version,
              brief: current.brief,
              directionId: latestDirection.id,
              instruction: "Cập nhật toàn bộ kế hoạch để phù hợp với Định hướng mới nhất, đồng thời giữ lịch quay và mục tiêu tuần hiện tại.",
              items: rebasedItems,
              planId: current.planId,
            });
            if (id !== requestId.current) return;
            setState(stateWithVersion(result, updated));
            apply(updated);
            setNotice(
              `Đã tự cập nhật ${updated.brief.name} theo Định hướng phiên bản ${latestDirection.version}. Đây là bản nháp để bạn xem lại trước khi chốt.`,
            );
            return;
          } catch (syncError) {
            if (id !== requestId.current) return;
            aiSyncError = syncError;
          }
        }
        try {
          const updated = await saveContentPlan({
            baseVersion: current.version,
            brief: current.brief,
            directionId: latestDirection.id,
            items: rebasedItems,
            planId: current.planId,
            status: "draft",
          });
          if (id !== requestId.current) return;
          setState(stateWithVersion(result, updated));
          apply(updated);
          setNotice(
            result.aiConfigured
              ? `AI chưa thể viết lại nội dung, nên Emsen đã tự nối ${updated.brief.name} với Định hướng phiên bản ${latestDirection.version} và giữ nguyên nội dung trong một bản nháp.`
              : `Đã tự nối ${updated.brief.name} với Định hướng phiên bản ${latestDirection.version} và giữ nguyên nội dung trong một bản nháp. Bạn có thể thêm API key để nhờ AI sắp lại.`,
          );
          return;
        } catch (syncError) {
          if (id !== requestId.current) return;
          const visibleError = syncError instanceof Error ? syncError : aiSyncError;
          setError(
            visibleError instanceof Error
              ? visibleError.message
              : "Chưa thể lưu kế hoạch theo Định hướng mới.",
          );
        }
        setState(result);
        apply(current);
        setDirection(latestDirection);
        setItems(rebasedItems);
        markDirty(true);
        setNotice(
          `Đã chuyển kế hoạch sang Định hướng phiên bản ${latestDirection.version}. Nội dung hiện tại được giữ lại; bạn có thể nhờ AI sắp lại trước khi chốt.`,
        );
        return;
      }
      setState(result);
      if (current) apply(current);
      else prepareNew(result);
    } catch (error) {
      if (id === requestId.current) setError(error instanceof Error ? error.message : "Chưa tải được kế hoạch.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  };

  useEffect(() => {
    const justOpened = active && !wasActive.current;
    wasActive.current = active;
    if (justOpened && !busyRef.current) {
      const pendingPlanId = pendingAgentPlanId.current;
      pendingAgentPlanId.current = null;
      if (pendingPlanId) {
        if (
          dirtyRef.current &&
          !window.confirm(
            "Emsen vừa tạo một bản nháp kế hoạch qua chat. Bỏ các thay đổi chưa lưu để xem bản đó?",
          )
        ) {
          setNotice(
            "Bản Emsen vừa tạo vẫn được lưu an toàn. Các chỉnh sửa hiện tại của bạn đang được giữ lại.",
          );
          void load(activePlanId ?? undefined, true);
          return;
        }
        markDirty(false);
        void load(pendingPlanId);
        return;
      }
      const preserveDraft = dirtyRef.current || (state !== null && activePlanId === null);
      void load(activePlanId ?? undefined, preserveDraft);
    }
    // Refresh on tab entry while retaining local edits and unsaved new plans.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
  useEffect(() => {
    const reloadAfterAgentChange = (event: Event) => {
      const targetPlanId = (event as CustomEvent<{ planId?: string }>).detail?.planId;
      if (!active) {
        pendingAgentPlanId.current = targetPlanId || null;
        return;
      }
      if (dirtyRef.current) {
        if (
          window.confirm(
            "Emsen vừa tạo một bản nháp kế hoạch qua chat. Bạn có thay đổi chưa lưu ở đây. Bỏ các thay đổi này để xem bản Emsen vừa tạo?",
          )
        ) {
          markDirty(false);
          void load(targetPlanId || activePlanId || undefined);
        } else {
          setNotice(
            "Bản Emsen vừa tạo vẫn được lưu an toàn. Các chỉnh sửa hiện tại của bạn đang được giữ lại.",
          );
        }
        return;
      }
      if (active && !busyRef.current) {
        void load(targetPlanId || activePlanId || undefined);
      }
    };
    window.addEventListener(contentPlanUpdatedEvent, reloadAfterAgentChange);
    return () => window.removeEventListener(contentPlanUpdatedEvent, reloadAfterAgentChange);
    // The listener follows the currently selected plan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, activePlanId]);
  useEffect(() => {
    const reloadAfterDirectionChange = () => {
      if (!active || busyRef.current) return;
      const preserveDraft = dirtyRef.current || (state !== null && activePlanId === null);
      void load(activePlanId ?? undefined, preserveDraft);
    };
    window.addEventListener(directionUpdatedEvent, reloadAfterDirectionChange);
    return () => window.removeEventListener(directionUpdatedEvent, reloadAfterDirectionChange);
    // Refresh immediately when chat changes Direction while this tab is visible.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, activePlanId, state]);
  useEffect(() => () => { requestId.current++; }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const canDiscard = () => !dirtyRef.current || window.confirm("Bạn có thay đổi chưa lưu. Bỏ thay đổi để tiếp tục?");
  const rebuildIfBlank = (nextAvailableDays: number[] | null, nextTarget: number | null) => {
    if (!direction || items.some((item) => item.title.trim())) return;
    setItems(emptyPlan(direction, scheduleDays(nextAvailableDays, nextTarget)));
  };
  const run = async (kind: "generate" | "draft" | "approved", itemId?: string) => {
    if (!state || !direction || busyRef.current) return;
    busyRef.current = true;
    setBusy(kind === "generate" ? itemId === undefined ? "all" : `item-${itemId}` : kind);
    setError("");
    setNotice("");
    const id = requestId.current;
    try {
      const input = {
        planId: activePlanId,
        baseVersion: state.versions[0]?.version ?? 0,
        brief: { name: planName, weekStart, focus, availableDays, weeklyVideoTarget },
        directionId: direction.id,
      };
      const version = kind === "generate"
        ? await generateContentPlan({
            ...input,
            ...(items.length ? { items } : {}),
            ...(itemId === undefined ? {} : { itemId }),
          })
        : await saveContentPlan({ ...input, items, status: kind });
      if (id !== requestId.current) return;
      setState((current) => {
        if (!current) return current;
        return stateWithVersion(current, version);
      });
      apply(version);
      setNotice(kind === "approved"
        ? "Đã chốt kế hoạch. Các kịch bản liên kết đã được kiểm tra và đồng bộ an toàn."
        : `Đã lưu phiên bản ${version.version}${kind === "generate" ? " từ AI. Bạn có thể chỉnh trước khi chốt." : "."}`);
    } catch (error) {
      if (id === requestId.current) setError(error instanceof Error ? error.message : "Chưa thể lưu kế hoạch.");
    } finally {
      busyRef.current = false;
      setBusy("");
    }
  };

  return {
    state,
    activePlanId,
    planName,
    direction,
    weekStart,
    focus,
    availableDays,
    weeklyVideoTarget,
    items,
    selectedVersion,
    dirty,
    loading,
    busy,
    error,
    notice,
    run,
    editPlanName: (value: string) => { setPlanName(value); markDirty(true); },
    editFocus: (value: string) => { setFocus(value); markDirty(true); },
    editAvailableDays: (value: number[] | null) => {
      setAvailableDays(value);
      rebuildIfBlank(value, weeklyVideoTarget);
      markDirty(true);
    },
    editWeeklyVideoTarget: (value: number | null) => {
      setWeeklyVideoTarget(value);
      rebuildIfBlank(availableDays, value);
      markDirty(true);
    },
    editItem: (itemId: string, patch: Partial<ContentPlanItemDto>) => {
      setItems((current) => current.map((item) => item.id === itemId ? { ...item, ...patch } : item));
      markDirty(true);
    },
    selectVersion: (version: ContentPlanVersionDto) => { if (canDiscard()) apply(version); },
    selectPlan: (planId: string) => { if (planId !== activePlanId && canDiscard()) void load(planId); },
    startNewPlan: () => { if (state && canDiscard()) prepareNew(state); },
    changeWeek: (value: string) => { if (value && value !== weekStart) { setWeekStart(value); markDirty(true); } },
    reload: () => { if (canDiscard()) void load(activePlanId ?? undefined); },
  };
}
