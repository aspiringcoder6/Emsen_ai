import { useEffect, useRef, useState } from "react";
import type {
  ContentPlanItemDto,
  ContentPlanStateDto,
  ContentPlanVersionDto,
  DirectionVersionDto,
} from "@creator-flow/contracts";
import { generateContentPlan, getContentPlan, saveContentPlan } from "./contentPlanApi";
import { currentWeekStart, emptyPlan, scheduleDays } from "./contentPlanUtils";

function defaultPlanName(count: number) {
  return `Kế hoạch nội dung ${String(count + 1).padStart(2, "0")}`;
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
    const nextDirection = current.latestApprovedDirection;
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
          latestApprovedDirection: result.latestApprovedDirection,
        } : result);
        return;
      }
      setState(result);
      if (result.versions[0]) apply(result.versions[0]);
      else prepareNew(result);
    } catch (error) {
      if (id === requestId.current) setError(error instanceof Error ? error.message : "Chưa tải được kế hoạch.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (active && !state && !busyRef.current) void load();
  }, [active, state]);
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
        const summary = {
          id: version.planId,
          name: version.brief.name,
          weekStart: version.brief.weekStart,
          latestVersion: version.version,
          latestStatus: version.status,
          updatedAt: version.createdAt,
        };
        return {
          ...current,
          activePlanId: version.planId,
          versions: [version, ...current.versions],
          plans: [summary, ...current.plans.filter((plan) => plan.id !== version.planId)],
        };
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
    useLatestDirection: () => {
      if (state?.latestApprovedDirection && canDiscard()) {
        setDirection(state.latestApprovedDirection);
        setItems(emptyPlan(state.latestApprovedDirection, scheduleDays(availableDays, weeklyVideoTarget)));
        markDirty(true);
      }
    },
  };
}
