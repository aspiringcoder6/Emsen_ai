import { useEffect, useMemo, useState } from "react";
import type {
  CreateScriptRequestDto,
  ScriptAssistSection,
  ScriptDocumentDto,
  ScriptStatus,
  ScriptWorkspaceDto,
  UpdateScriptRequestDto,
} from "@creator-flow/contracts";
import {
  AlertTriangle,
  CalendarClock,
  CircleCheckBig,
  Clock3,
  FileText,
  FolderKanban,
  LoaderCircle,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { EmsenAvatar } from "../components/branding/EmsenAvatar";
import { assistScript, createScript, deleteScript, getScriptWorkspace, updateScript } from "../features/scripts/scriptApi";
import { formatScriptDate, scriptProgress, scriptStatusConfig, scriptStatuses } from "../features/scripts/scriptConfig";
import { CreateScriptPanel } from "../features/scripts/components/CreateScriptPanel";
import { ScriptEditor } from "../features/scripts/components/ScriptEditor";

function updateRequest(script: ScriptDocumentDto): UpdateScriptRequestDto {
  return {
    revision: script.revision,
    title: script.title,
    status: script.status,
    content: script.content,
    settings: script.settings,
    advancedSettings: script.advancedSettings,
  };
}

export function ScriptsPage({ active, onSettings }: { active: boolean; onSettings: () => void }) {
  const [workspace, setWorkspace] = useState<ScriptWorkspaceDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ScriptStatus | "all">("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [draft, setDraft] = useState<ScriptDocumentDto | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [assisting, setAssisting] = useState<ScriptAssistSection | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<ScriptDocumentDto | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = async (refreshOpenScript = false) => {
    setLoading(true);
    setError("");
    try {
      const nextWorkspace = await getScriptWorkspace();
      setWorkspace(nextWorkspace);
      if (refreshOpenScript && draft && !dirty) {
        const refreshed = nextWorkspace.scripts.find((script) => script.id === draft.id);
        setDraft(refreshed ? structuredClone(refreshed) : null);
        if (!refreshed) setNotice("Kịch bản đang mở không còn tồn tại.");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Chưa tải được thư viện kịch bản.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (active && !dirty) void load(Boolean(draft));
  }, [active]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    if (!deleteCandidate) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape" && !deleting) setDeleteCandidate(null); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [deleteCandidate, deleting]);

  const scripts = workspace?.scripts ?? [];
  const planOptions = useMemo(() => Array.from(new Map(scripts.flatMap((script) => script.planReference
    ? [[script.planReference.contentPlanId, script.planReference.planName] as const]
    : [])).entries()), [scripts]);
  useEffect(() => {
    if (planFilter !== "all" && planFilter !== "independent" && !planOptions.some(([id]) => id === planFilter)) {
      setPlanFilter("all");
    }
  }, [planFilter, planOptions]);
  const filtered = useMemo(() => scripts.filter((script) => {
    if (filter !== "all" && script.status !== filter) return false;
    if (planFilter === "independent" && script.planReference) return false;
    if (planFilter !== "all" && planFilter !== "independent" && script.planReference?.contentPlanId !== planFilter) return false;
    const needle = query.trim().toLocaleLowerCase("vi-VN");
    return !needle || `${script.title} ${script.settings.platform} ${script.settings.format} ${script.planReference?.planName ?? ""}`.toLocaleLowerCase("vi-VN").includes(needle);
  }), [scripts, filter, planFilter, query]);
  const groups = useMemo(() => {
    const result = new Map<string, { id: string; name: string; weekStart: string | null; scripts: ScriptDocumentDto[] }>();
    for (const script of filtered) {
      const id = script.planReference?.contentPlanId ?? "independent";
      const group = result.get(id) ?? {
        id,
        name: script.planReference?.planName ?? "Kịch bản độc lập",
        weekStart: script.planReference?.weekStart ?? null,
        scripts: [],
      };
      group.scripts.push(script);
      result.set(id, group);
    }
    return [...result.values()];
  }, [filtered]);
  const activeCount = scripts.filter((script) => ["draft", "in-progress", "ready"].includes(script.status)).length;
  const completedCount = scripts.filter((script) => script.status === "completed").length;

  const replaceScript = (script: ScriptDocumentDto) => setWorkspace((current) => current ? {
    ...current,
    scripts: [script, ...current.scripts.filter((item) => item.id !== script.id)],
    scheduleOptions: current.scheduleOptions.map((option) => option.contentPlanId === script.planReference?.contentPlanId && option.contentPlanItemId === script.planReference.contentPlanItemId ? { ...option, alreadyLinked: true } : option),
  } : current);

  const handleCreate = async (input: CreateScriptRequestDto) => {
    setCreating(true);
    setError("");
    try {
      const created = await createScript(input);
      replaceScript(created);
      setDraft(structuredClone(created));
      setDirty(false);
      setShowCreate(false);
      setNotice(input.mode === "ai" ? "Emsen đã chuẩn bị bản đầu. Bạn là người quyết định bản cuối." : "Đã mở trang viết mới.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Chưa thể tạo kịch bản.");
    } finally {
      setCreating(false);
    }
  };

  const save = async () => {
    if (!draft || saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const saved = await updateScript(draft.id, updateRequest(draft));
      replaceScript(saved);
      setDraft(structuredClone(saved));
      setDirty(false);
      setNotice("Đã lưu kịch bản và cài đặt.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Chưa thể lưu kịch bản.");
    } finally {
      setSaving(false);
    }
  };

  const askAi = async (section: ScriptAssistSection, prompt: string) => {
    if (!draft || assisting) return;
    setAssisting(section);
    setError("");
    setNotice("");
    try {
      const result = await assistScript(draft.id, { section, instruction: prompt, draft: updateRequest(draft) });
      setDraft((current) => current ? { ...current, content: { ...current.content, ...result.patch }, model: result.model } : current);
      setDirty(true);
      setNotice("Đã đặt đề xuất AI vào bản đang làm. Hãy đọc lại và lưu khi phù hợp.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "AI chưa thể hỗ trợ phần này.");
    } finally {
      setAssisting(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteCandidate || deleting) return;
    setDeleting(true);
    setError("");
    try {
      await deleteScript(deleteCandidate.id);
      setWorkspace((current) => {
        if (!current) return current;
        const remaining = current.scripts.filter((script) => script.id !== deleteCandidate.id);
        return {
          ...current,
          scripts: remaining,
          scheduleOptions: current.scheduleOptions.map((option) => ({
            ...option,
            alreadyLinked: remaining.some((script) => script.planReference?.contentPlanId === option.contentPlanId && script.planReference.contentPlanItemId === option.contentPlanItemId),
          })),
        };
      });
      if (draft?.id === deleteCandidate.id) {
        setDraft(null);
        setDirty(false);
      }
      setDeleteCandidate(null);
      setNotice(`Đã xóa “${deleteCandidate.title}”.`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Chưa thể xóa kịch bản.");
    } finally {
      setDeleting(false);
    }
  };

  const leaveEditor = () => {
    if (dirty && !window.confirm("Bạn có thay đổi chưa lưu. Quay lại thư viện và bỏ các thay đổi này?")) return;
    setDraft(null);
    setDirty(false);
    setError("");
    setNotice("");
  };
  const openScript = (script: ScriptDocumentDto) => {
    setDraft(structuredClone(script));
    setDirty(false);
    setError("");
    setNotice("");
  };

  if (!active) return null;

  return <>
    {draft ? (
      <ScriptEditor
        draft={draft}
        dirty={dirty}
        saving={saving}
        assisting={assisting}
        error={error}
        notice={notice}
        aiConfigured={workspace?.aiConfigured ?? false}
        onBack={leaveEditor}
        onChange={(next) => { setDraft(next); setDirty(true); setNotice(""); }}
        onSave={() => void save()}
        onDelete={() => setDeleteCandidate(draft)}
        onAssist={(section, prompt) => void askAi(section, prompt)}
        onSettings={onSettings}
      />
    ) : (
      <section className="mx-auto max-w-[1280px] space-y-4">
        <header className="overflow-hidden rounded-[26px] border border-[#D9E8D4] bg-gradient-to-r from-[#EFF8EB] via-white to-[#FFF2EE] px-5 py-4 shadow-[0_16px_45px_rgba(55,85,57,0.09)] sm:px-6">
          <div className="flex flex-wrap items-center gap-4">
            <EmsenAvatar activity="writing" className="h-20 w-20 shrink-0" eager />
            <div className="min-w-[220px] flex-1"><p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#3F8240]"><Sparkles size={14} /> Phòng biên kịch</p><h2 className="mt-1 text-2xl font-bold text-[#284D31] sm:text-3xl">Kịch bản của bạn</h2><p className="mt-1 text-sm text-[#748A74]">Mỗi kế hoạch có một góc kịch bản riêng, dễ tìm và dễ theo dõi.</p></div>
            <button type="button" onClick={() => setShowCreate(true)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#4E8052] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_25px_rgba(55,100,58,0.18)]"><Plus size={18} /> Tạo kịch bản</button>
          </div>
        </header>

        {error && <p role="alert" className="rounded-xl border border-[#F1C9C2] bg-[#FFF0EC] p-4 text-sm text-[#9A4B42]">{error}</p>}
        {notice && <p role="status" className="rounded-xl border border-[#CFE2C7] bg-[#EFF8EB] p-4 text-sm text-[#417447]">{notice}</p>}
        {showCreate && workspace && <CreateScriptPanel aiConfigured={workspace.aiConfigured} scheduleOptions={workspace.scheduleOptions} busy={creating} onClose={() => setShowCreate(false)} onCreate={(input) => void handleCreate(input)} onSettings={onSettings} />}

        <section className="flex flex-wrap gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#DDEBD6] bg-white px-4 py-2 text-xs text-[#748A74]"><FileText size={14} /><strong className="text-[#284D31]">{scripts.length}</strong> Tất cả</div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#DDEBD6] bg-white px-4 py-2 text-xs text-[#748A74]"><Clock3 size={14} /><strong className="text-[#3F8240]">{activeCount}</strong> Đang làm</div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#DDEBD6] bg-white px-4 py-2 text-xs text-[#748A74]"><CircleCheckBig size={14} /><strong className="text-[#466D67]">{completedCount}</strong> Đã quay</div>
        </section>

        <section className="rounded-[26px] border border-[#DDEBD6] bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#829282]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm kịch bản…" className="w-full rounded-xl border border-[#E5DED8] bg-[#FFFCF8] py-2.5 pl-9 pr-3 text-sm" /></div>
            <select value={planFilter} onChange={(event) => setPlanFilter(event.target.value)} className="rounded-xl border border-[#E5DED8] bg-[#FFFCF8] px-3 py-2.5 text-sm font-bold"><option value="all">Tất cả kế hoạch</option>{planOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}<option value="independent">Kịch bản độc lập</option></select>
            <select value={filter} onChange={(event) => setFilter(event.target.value as ScriptStatus | "all")} className="rounded-xl border border-[#E5DED8] bg-[#FFFCF8] px-3 py-2.5 text-sm font-bold"><option value="all">Tất cả trạng thái</option>{scriptStatuses.map((status) => <option key={status} value={status}>{scriptStatusConfig[status].label}</option>)}</select>
            <button type="button" disabled={loading} onClick={() => void load()} className="rounded-xl px-3 py-2.5 text-xs font-bold text-[#3F8240]">Tải lại</button>
          </div>

          {loading && <p className="flex items-center gap-2 py-12 text-sm text-[#748A74]"><LoaderCircle size={17} className="animate-spin" /> Đang mở thư viện…</p>}
          {!loading && filtered.length === 0 && <div className="py-14 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#EEF8E9] text-[#3F8240]"><FileText size={24} /></div><h3 className="mt-4 text-lg font-bold">Chưa có kịch bản</h3><p className="mt-1 text-sm text-[#748A74]">Bắt đầu từ lịch hoặc một ý tưởng mới.</p><button type="button" onClick={() => setShowCreate(true)} className="mt-5 rounded-xl bg-[#4E8052] px-5 py-3 text-sm font-bold text-white">Tạo kịch bản đầu tiên</button></div>}

          <div className="mt-5 space-y-7">
            {groups.map((group) => <section key={group.id}>
              <div className="mb-3 flex items-center gap-3 border-b border-[#EFE8E2] pb-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#EAF6E4] text-[#3F8240]"><FolderKanban size={17} /></span><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-bold text-[#284D31]">{group.name}</h3><p className="text-[11px] text-[#879487]">{group.scripts.length} kịch bản{group.weekStart ? ` · Tuần ${formatScriptDate(group.weekStart)}` : ""}</p></div></div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {group.scripts.map((script) => {
                  const progress = scriptProgress(script);
                  const status = scriptStatusConfig[script.status];
                  const syncState = script.planReference?.sync.state;
                  return <article key={script.id} className="relative rounded-[22px] border border-[#E5DED8] bg-[#FFFEFB] transition hover:-translate-y-0.5 hover:border-[#A8CE9A] hover:shadow-[0_16px_40px_rgba(60,90,62,0.1)]">
                    <button type="button" onClick={() => setDeleteCandidate(script)} aria-label={`Xóa ${script.title}`} className="absolute right-3 top-3 z-10 rounded-lg p-2 text-[#A15B55] opacity-70 hover:bg-[#FFF0EC] hover:opacity-100"><Trash2 size={15} /></button>
                    <button type="button" onClick={() => openScript(script)} className="block w-full p-5 text-left">
                      <div className="flex items-center gap-2 pr-9"><span style={{ color: status.color, background: status.surface }} className="rounded-full px-3 py-1 text-[11px] font-bold">{status.label}</span>{syncState === "updated" && <span className="rounded-full bg-[#EAF6E4] px-2.5 py-1 text-[10px] font-bold text-[#3F8240]">Đã đồng bộ</span>}{syncState === "source-removed" && <span className="rounded-full bg-[#FFF3DD] px-2.5 py-1 text-[10px] font-bold text-[#856B3A]">Lịch đã đổi</span>}</div>
                      <h4 className="mt-4 line-clamp-2 min-h-12 text-base font-bold leading-6 text-[#284D31]">{script.title}</h4>
                      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#E7EEE3]"><span className="block h-full rounded-full bg-[#72B65D]" style={{ width: `${progress}%` }} /></div>
                      <div className="mt-2 flex justify-between text-[11px] text-[#748A74]"><span>{progress}% hoàn thiện</span><span>{script.content.storyboard.length} cảnh</span></div>
                      <div className="mt-4 flex items-center justify-between border-t border-[#EFE8E2] pt-4 text-[11px] text-[#6F806F]"><span className="flex items-center gap-1.5"><CalendarClock size={13} /> {formatScriptDate(script.settings.scheduledFor)}</span><span>{script.settings.platform || "Chưa chọn"}</span></div>
                    </button>
                  </article>;
                })}
              </div>
            </section>)}
          </div>
        </section>
      </section>
    )}

    {deleteCandidate && <div className="fixed inset-0 z-[80] grid place-items-center bg-[rgba(28,44,31,0.48)] p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !deleting) setDeleteCandidate(null); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="delete-script-title" className="w-full max-w-md rounded-[26px] border border-[#EAD9D2] bg-[#FFFEFB] p-5 shadow-[0_28px_80px_rgba(34,52,36,0.28)] sm:p-6">
        <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#FFF0EC] text-[#A15B55]"><AlertTriangle size={21} /></span><div className="min-w-0 flex-1"><h2 id="delete-script-title" className="text-lg font-bold text-[#284D31]">Xóa kịch bản này?</h2><p className="mt-1 text-sm leading-6 text-[#748A74]">“{deleteCandidate.title}” sẽ bị xóa vĩnh viễn{draft?.id === deleteCandidate.id && dirty ? ", gồm cả thay đổi chưa lưu" : ""}.</p></div><button type="button" disabled={deleting} onClick={() => setDeleteCandidate(null)} aria-label="Đóng" className="rounded-lg p-1.5 text-[#748A74]"><X size={17} /></button></div>
        {error && <p role="alert" className="mt-4 rounded-xl bg-[#FFF0EC] p-3 text-xs text-[#9A4B42]">{error}</p>}
        <div className="mt-6 flex justify-end gap-2"><button type="button" disabled={deleting} onClick={() => setDeleteCandidate(null)} className="rounded-xl border border-[#DDE8D6] px-4 py-2.5 text-sm font-bold">Giữ lại</button><button type="button" disabled={deleting} onClick={() => void confirmDelete()} className="inline-flex items-center gap-2 rounded-xl bg-[#A15B55] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{deleting ? <LoaderCircle size={16} className="animate-spin" /> : <Trash2 size={16} />} Xóa kịch bản</button></div>
      </section>
    </div>}
  </>;
}
