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
  CalendarClock,
  CircleCheckBig,
  Clock3,
  FileText,
  LoaderCircle,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { assistScript, createScript, getScriptWorkspace, updateScript } from "../features/scripts/scriptApi";
import { formatScriptDate, scriptProgress, scriptStatusConfig, scriptStatuses } from "../features/scripts/scriptConfig";
import { CreateScriptPanel } from "../features/scripts/components/CreateScriptPanel";
import { ScriptEditor } from "../features/scripts/components/ScriptEditor";
import { EmsenAvatar } from "../components/branding/EmsenAvatar";

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
  const [draft, setDraft] = useState<ScriptDocumentDto | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [assisting, setAssisting] = useState<ScriptAssistSection | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try { setWorkspace(await getScriptWorkspace()); }
    catch (error) { setError(error instanceof Error ? error.message : "Chưa tải được thư viện kịch bản."); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (active && !workspace) void load(); }, [active]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const scripts = workspace?.scripts ?? [];
  const filtered = useMemo(() => scripts.filter((script) => {
    if (filter !== "all" && script.status !== filter) return false;
    const needle = query.trim().toLocaleLowerCase("vi-VN");
    return !needle || `${script.title} ${script.settings.platform} ${script.settings.format}`.toLocaleLowerCase("vi-VN").includes(needle);
  }), [scripts, filter, query]);
  const activeCount = scripts.filter((script) => ["draft", "in-progress", "ready"].includes(script.status)).length;
  const completedCount = scripts.filter((script) => script.status === "completed").length;

  const replaceScript = (script: ScriptDocumentDto) => setWorkspace((current) => current ? {
    ...current,
    scripts: [script, ...current.scripts.filter((item) => item.id !== script.id)],
    scheduleOptions: current.scheduleOptions.map((option) => option.contentPlanVersionId === script.planReference?.contentPlanVersionId && option.dayIndex === script.planReference.dayIndex ? { ...option, alreadyLinked: true } : option),
  } : current);

  const handleCreate = async (input: CreateScriptRequestDto) => {
    setCreating(true); setError("");
    try {
      const created = await createScript(input);
      replaceScript(created); setDraft(structuredClone(created)); setDirty(false); setShowCreate(false);
      setNotice(input.mode === "ai" ? "Emsen đã giúp bạn chuẩn bị bản đầu. Bạn là người quyết định bản cuối." : "Đã mở trang viết mới.");
    } catch (error) { setError(error instanceof Error ? error.message : "Chưa thể tạo kịch bản."); }
    finally { setCreating(false); }
  };

  const save = async () => {
    if (!draft || saving) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const saved = await updateScript(draft.id, updateRequest(draft));
      replaceScript(saved); setDraft(structuredClone(saved)); setDirty(false); setNotice("Đã lưu kịch bản và cài đặt.");
    } catch (error) { setError(error instanceof Error ? error.message : "Chưa thể lưu kịch bản."); }
    finally { setSaving(false); }
  };

  const askAi = async (section: ScriptAssistSection, prompt: string) => {
    if (!draft || assisting) return;
    setAssisting(section); setError(""); setNotice("");
    try {
      const result = await assistScript(draft.id, { section, instruction: prompt, draft: updateRequest(draft) });
      setDraft((current) => current ? { ...current, content: { ...current.content, ...result.patch }, model: result.model } : current);
      setDirty(true); setNotice("Đã đặt đề xuất AI vào bản đang làm. Hãy đọc lại và lưu khi bạn thấy phù hợp.");
    } catch (error) { setError(error instanceof Error ? error.message : "AI chưa thể hỗ trợ phần này."); }
    finally { setAssisting(null); }
  };

  const leaveEditor = () => {
    if (dirty && !window.confirm("Bạn có thay đổi chưa lưu. Quay lại thư viện và bỏ các thay đổi này?")) return;
    setDraft(null); setDirty(false); setError(""); setNotice("");
  };

  if (!active) return null;
  if (draft) return <ScriptEditor draft={draft} dirty={dirty} saving={saving} assisting={assisting} error={error} notice={notice} aiConfigured={workspace?.aiConfigured ?? false} onBack={leaveEditor} onChange={(next) => { setDraft(next); setDirty(true); setNotice(""); }} onSave={() => void save()} onAssist={(section, prompt) => void askAi(section, prompt)} onSettings={onSettings} />;

  return <section className="mx-auto max-w-[1280px] space-y-4">
    <header className="overflow-hidden rounded-[26px] border border-[#D9E8D4] bg-gradient-to-r from-[#EFF8EB] via-white to-[#FFF2EE] px-5 py-4 shadow-[0_16px_45px_rgba(55,85,57,0.09)] sm:px-6">
      <div className="flex flex-wrap items-center gap-4">
        <EmsenAvatar activity="writing" className="h-20 w-20 shrink-0" eager />
        <div className="min-w-[220px] flex-1"><p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#3F8240]"><Sparkles size={14} /> Phòng biên kịch</p><h2 className="mt-1 text-2xl font-bold text-[#284D31] sm:text-3xl">Kịch bản của bạn</h2><p className="mt-1 text-sm text-[#748A74]">Viết nhanh, chỉnh sâu khi cần, rồi xuất để mang đi quay.</p></div>
        <button type="button" onClick={() => setShowCreate(true)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#4E8052] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_25px_rgba(55,100,58,0.18)]"><Plus size={18} /> Tạo kịch bản</button>
      </div>
    </header>

    {error && <p role="alert" className="rounded-xl border border-[#F1C9C2] bg-[#FFF0EC] p-4 text-sm text-[#9A4B42]">{error}</p>}
    {showCreate && workspace && <CreateScriptPanel aiConfigured={workspace.aiConfigured} scheduleOptions={workspace.scheduleOptions} busy={creating} onClose={() => setShowCreate(false)} onCreate={(input) => void handleCreate(input)} onSettings={onSettings} />}

    <section className="flex flex-wrap gap-2">
      <div className="inline-flex items-center gap-2 rounded-full border border-[#DDEBD6] bg-white px-4 py-2 text-xs text-[#748A74]"><FileText size={14} /><strong className="text-[#284D31]">{scripts.length}</strong> Tất cả</div>
      <div className="inline-flex items-center gap-2 rounded-full border border-[#DDEBD6] bg-white px-4 py-2 text-xs text-[#748A74]"><Clock3 size={14} /><strong className="text-[#3F8240]">{activeCount}</strong> Đang làm</div>
      <div className="inline-flex items-center gap-2 rounded-full border border-[#DDEBD6] bg-white px-4 py-2 text-xs text-[#748A74]"><CircleCheckBig size={14} /><strong className="text-[#466D67]">{completedCount}</strong> Đã quay</div>
    </section>

    <section className="rounded-[26px] border border-[#DDEBD6] bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-3"><div className="relative min-w-[220px] flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#829282]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tên, nền tảng…" className="w-full rounded-xl border border-[#E5DED8] bg-[#FFFCF8] py-2.5 pl-9 pr-3 text-sm" /></div><select value={filter} onChange={(event) => setFilter(event.target.value as ScriptStatus | "all")} className="rounded-xl border border-[#E5DED8] bg-[#FFFCF8] px-3 py-2.5 text-sm font-bold"><option value="all">Tất cả trạng thái</option>{scriptStatuses.map((status) => <option key={status} value={status}>{scriptStatusConfig[status].label}</option>)}</select><button type="button" disabled={loading} onClick={() => void load()} className="rounded-xl px-3 py-2.5 text-xs font-bold text-[#3F8240]">Tải lại</button></div>

      {loading && <p className="flex items-center gap-2 py-12 text-sm text-[#748A74]"><LoaderCircle size={17} className="animate-spin" /> Đang mở thư viện…</p>}
      {!loading && filtered.length === 0 && <div className="py-14 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#EEF8E9] text-[#3F8240]"><FileText size={24} /></div><h3 className="mt-4 text-lg font-bold">Chưa có kịch bản</h3><p className="mt-1 text-sm text-[#748A74]">Bắt đầu từ lịch hoặc một ý tưởng mới.</p><button type="button" onClick={() => setShowCreate(true)} className="mt-5 rounded-xl bg-[#4E8052] px-5 py-3 text-sm font-bold text-white">Tạo kịch bản đầu tiên</button></div>}
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map((script) => {
        const progress = scriptProgress(script); const status = scriptStatusConfig[script.status];
        return <button type="button" key={script.id} onClick={() => { setDraft(structuredClone(script)); setDirty(false); setError(""); setNotice(""); }} className="group rounded-[22px] border border-[#E5DED8] bg-[#FFFEFB] p-5 text-left transition hover:-translate-y-0.5 hover:border-[#A8CE9A] hover:shadow-[0_16px_40px_rgba(60,90,62,0.1)]">
          <div className="flex items-center justify-between gap-3"><span style={{ color: status.color, background: status.surface }} className="rounded-full px-3 py-1 text-[11px] font-bold">{status.label}</span><span className="text-[11px] text-[#849084]">{script.source === "ai" ? "AI gợi ý" : script.source === "content-plan" ? "Từ lịch" : "Tạo mới"}</span></div>
          <h3 className="mt-4 line-clamp-2 min-h-12 text-base font-bold leading-6 text-[#284D31]">{script.title}</h3>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#E7EEE3]"><span className="block h-full rounded-full bg-[#72B65D]" style={{ width: `${progress}%` }} /></div><div className="mt-2 flex justify-between text-[11px] text-[#748A74]"><span>{progress}% hoàn thiện</span><span>{script.content.storyboard.length} cảnh</span></div>
          <div className="mt-4 flex items-center justify-between border-t border-[#EFE8E2] pt-4 text-[11px] text-[#6F806F]"><span className="flex items-center gap-1.5"><CalendarClock size={13} /> {formatScriptDate(script.settings.scheduledFor)}</span><span>{script.settings.platform || "Chưa chọn"}</span></div>
        </button>;
      })}</div>
    </section>
  </section>;
}
