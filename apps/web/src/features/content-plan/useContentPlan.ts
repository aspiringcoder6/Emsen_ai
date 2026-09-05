import { useEffect, useRef, useState } from "react";
import type { ContentPlanItemDto, ContentPlanStateDto, ContentPlanVersionDto, DirectionVersionDto } from "@creator-flow/contracts";
import { generateContentPlan, getContentPlan, saveContentPlan } from "./contentPlanApi";
import { currentWeekStart, emptyPlan } from "./contentPlanUtils";

export function useContentPlan(active: boolean) {
  const [weekStart, setWeekStart] = useState(currentWeekStart);
  const [state, setState] = useState<ContentPlanStateDto | null>(null);
  const [direction, setDirection] = useState<DirectionVersionDto | null>(null);
  const [focus, setFocus] = useState("");
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
  const markDirty = (value: boolean) => { dirtyRef.current = value; setDirty(value); setNotice(""); };
  const apply = (version: ContentPlanVersionDto) => {
    setDirection(version.direction); setFocus(version.brief.focus); setItems(version.items); setSelectedVersion(version.version); markDirty(false);
  };
  const load = async (preserveDraft = false) => {
    const id = ++requestId.current;
    setLoading(true); setError("");
    try {
      const result = await getContentPlan(weekStart);
      if (id !== requestId.current) return;
      if (preserveDraft) {
        setState((current) => current ? { ...current, aiConfigured: result.aiConfigured, latestApprovedDirection: result.latestApprovedDirection } : result);
        return;
      }
      setState(result);
      if (result.versions[0]) apply(result.versions[0]);
      else { setDirection(result.latestApprovedDirection); setItems(result.latestApprovedDirection ? emptyPlan(result.latestApprovedDirection) : []); setFocus(""); setSelectedVersion(0); markDirty(false); }
    } catch (error) { if (id === requestId.current) setError(error instanceof Error ? error.message : "Chưa tải được kế hoạch."); }
    finally { if (id === requestId.current) setLoading(false); }
  };
  useEffect(() => { if (active && !busyRef.current) void load(dirtyRef.current); }, [active, weekStart]);
  useEffect(() => () => { requestId.current++; }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const canDiscard = () => !dirtyRef.current || window.confirm("Bạn có thay đổi chưa lưu. Bỏ thay đổi để tiếp tục?");
  const run = async (kind: "generate" | "draft" | "approved", dayIndex?: number) => {
    if (!state || !direction || busyRef.current) return;
    busyRef.current = true; setBusy(kind === "generate" ? dayIndex === undefined ? "all" : `day-${dayIndex}` : kind); setError(""); setNotice("");
    const id = requestId.current;
    try {
      const input = { baseVersion: state.versions[0]?.version ?? 0, brief: { weekStart, focus }, directionId: direction.id };
      const version = kind === "generate"
        ? await generateContentPlan({ ...input, ...(dayIndex === undefined ? {} : { dayIndex, items }) })
        : await saveContentPlan({ ...input, items, status: kind });
      if (id !== requestId.current) return;
      setState((state) => state ? { ...state, versions: [version, ...state.versions] } : state); apply(version);
      setNotice(kind === "approved" ? "Đã chốt kế hoạch 7 ngày. Chưa có bài nào được tự động đăng." : `Đã lưu phiên bản ${version.version}${kind === "generate" ? " từ AI. Bạn có thể chỉnh từng ngày trước khi chốt." : "."}`);
    } catch (error) { if (id === requestId.current) setError(error instanceof Error ? error.message : "Chưa thể lưu kế hoạch."); }
    finally { busyRef.current = false; setBusy(""); }
  };
  return {
    state, direction, weekStart, focus, items, selectedVersion, dirty, loading, busy, error, notice, run,
    editFocus: (value: string) => { setFocus(value); markDirty(true); },
    editItem: (day: number, patch: Partial<ContentPlanItemDto>) => { setItems((items) => items.map((item) => item.dayIndex === day ? { ...item, ...patch } : item)); markDirty(true); },
    selectVersion: (version: ContentPlanVersionDto) => { if (canDiscard()) apply(version); },
    changeWeek: (value: string) => { if (value && value !== weekStart && canDiscard()) { markDirty(false); setWeekStart(value); setState(null); setDirection(null); setItems([]); } },
    reload: () => { if (canDiscard()) void load(); },
    useLatestDirection: () => { if (state?.latestApprovedDirection && canDiscard()) { setDirection(state.latestApprovedDirection); setItems(emptyPlan(state.latestApprovedDirection)); markDirty(true); } },
  };
}
