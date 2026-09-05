import { useEffect, useRef, useState } from "react";
import type { DirectionBriefDto, DirectionContentDto, DirectionSection, DirectionStateDto, DirectionVersionDto } from "@creator-flow/contracts";
import { generateDirection, getDirection, saveDirection } from "./directionApi";

const emptyContent: DirectionContentDto = {
  positioning: "", tone: "", audience: "",
  pillars: [40, 35, 25].map((percentage) => ({ name: "", description: "", percentage, examples: [""] })),
};

export function useDirection(active: boolean) {
  const [state, setState] = useState<DirectionStateDto | null>(null);
  const [brief, setBrief] = useState<DirectionBriefDto>({ goal: "", notes: "" });
  const [content, setContent] = useState<DirectionContentDto>(emptyContent);
  const [selectedVersion, setSelectedVersion] = useState(0);
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  const busyRef = useRef(false);
  const mounted = useRef(true);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const markDirty = (value: boolean) => { dirtyRef.current = value; setDirty(value); setNotice(""); };
  const applyVersion = (version: DirectionVersionDto) => {
    setBrief(version.brief); setContent(version.content); setSelectedVersion(version.version); markDirty(false);
  };
  const load = async (preserveDraft = false) => {
    setLoading(true); setError("");
    try {
      const result = await getDirection();
      if (!mounted.current) return;
      setState((current) => preserveDraft && current ? { ...current, aiConfigured: result.aiConfigured, creatorDna: result.creatorDna } : result);
      if (!preserveDraft && result.versions[0]) applyVersion(result.versions[0]);
    } catch (error) {
      if (mounted.current) setError(error instanceof Error ? error.message : "Chưa thể tải định hướng.");
    } finally { if (mounted.current) setLoading(false); }
  };
  useEffect(() => {
    if (active && !busyRef.current) void load(dirtyRef.current);
    // Retain edits while navigating between workspace tabs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const run = async (kind: "draft" | "approved" | "generate", section: DirectionSection | "all" = "all") => {
    if (!state || busyRef.current) return;
    busyRef.current = true;
    setBusy(kind === "generate" ? section : kind); setError(""); setNotice("");
    try {
      const baseVersion = state.versions[0]?.version ?? 0;
      const result = kind === "generate"
        ? await generateDirection({ baseVersion, brief, section, ...(section !== "all" ? { content } : {}) })
        : await saveDirection({ baseVersion, brief, content, status: kind });
      if (!mounted.current) return;
      setState((current) => current ? { ...current, creatorDna: result.dnaSnapshot, versions: [result, ...current.versions] } : current);
      applyVersion(result);
      setNotice(kind === "approved" ? "Đã chốt định hướng. Phiên bản này sẵn sàng cho bước lập kế hoạch nội dung." : `Đã lưu phiên bản ${result.version}${kind === "generate" ? " từ đề xuất AI. Bạn hãy xem lại trước khi chốt." : "."}`);
    } catch (error) {
      if (mounted.current) setError(error instanceof Error ? error.message : "Chưa thể lưu định hướng.");
    } finally { busyRef.current = false; if (mounted.current) setBusy(""); }
  };

  return {
    state, brief, content, selectedVersion, dirty, loading, busy, error, notice, load, run,
    editBrief: (value: DirectionBriefDto) => { setBrief(value); markDirty(true); },
    editContent: (value: DirectionContentDto) => { setContent(value); markDirty(true); },
    selectVersion: (version: DirectionVersionDto) => {
      if (!dirty || window.confirm("Bạn có thay đổi chưa lưu. Bỏ những thay đổi này để xem phiên bản đã chọn?")) applyVersion(version);
    },
    reload: () => {
      if (!dirty || window.confirm("Tải lại sẽ thay thế các thay đổi chưa lưu bằng phiên bản mới nhất. Tiếp tục?")) void load();
    },
  };
}
