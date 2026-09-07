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

  return <section className="mx-auto max-w-[1280px] space-y-5">
    <header className="overflow-hidden rounded-[30px] border border-[#D9E8D4] bg-[#284D31] p-6 text-white shadow-[0_24px_65px_rgba(40,77,49,0.18)] sm:p-8">
      <div className="grid items-end gap-6 lg:grid-cols-[1fr_auto]"><div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#CDE9C2]"><Sparkles size={16} /> Phòng biên kịch</p><h2 className="mt-3 max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">Biến từng ý tưởng thành một câu chuyện có thể quay.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#D8E8D6]">Quản lý các bản đang viết, bắt đầu từ lịch nội dung hoặc một trang trắng, rồi cùng emsen chăm chút từng phần.</p></div><button type="button" onClick={() => setShowCreate(true)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#F3A1B2] px-5 py-3.5 text-sm font-black text-[#284D31] shadow-lg"><Plus size={18} /> Tạo kịch bản mới</button></div>
    </header>

    {error && <p role="alert" className="rounded-xl border border-[#F1C9C2] bg-[#FFF0EC] p-4 text-sm text-[#9A4B42]">{error}</p>}
    {showCreate && workspace && <CreateScriptPanel aiConfigured={workspace.aiConfigured} scheduleOptions={workspace.scheduleOptions} busy={creating} onClose={() => setShowCreate(false)} onCreate={(input) => void handleCreate(input)} onSettings={onSettings} />}

    <section className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-[#DDEBD6] bg-white p-4"><p className="flex items-center gap-2 text-xs font-bold text-[#748A74]"><FileText size={15} /> Tất cả kịch bản</p><strong className="mt-2 block text-2xl text-[#284D31]">{scripts.length}</strong></div>
      <div className="rounded-2xl border border-[#DDEBD6] bg-white p-4"><p className="flex items-center gap-2 text-xs font-bold text-[#748A74]"><Clock3 size={15} /> Đang làm việc</p><strong className="mt-2 block text-2xl text-[#3F8240]">{activeCount}</strong></div>
      <div className="rounded-2xl border border-[#DDEBD6] bg-white p-4"><p className="flex items-center gap-2 text-xs font-bold text-[#748A74]"><CircleCheckBig size={15} /> Đã thực hiện</p><strong className="mt-2 block text-2xl text-[#466D67]">{completedCount}</strong></div>
    </section>

    <section className="rounded-[26px] border border-[#DDEBD6] bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-3"><div className="relative min-w-[220px] flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#829282]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tên, nền tảng…" className="w-full rounded-xl border border-[#E5DED8] bg-[#FFFCF8] py-2.5 pl-9 pr-3 text-sm" /></div><select value={filter} onChange={(event) => setFilter(event.target.value as ScriptStatus | "all")} className="rounded-xl border border-[#E5DED8] bg-[#FFFCF8] px-3 py-2.5 text-sm font-bold"><option value="all">Tất cả trạng thái</option>{scriptStatuses.map((status) => <option key={status} value={status}>{scriptStatusConfig[status].label}</option>)}</select><button type="button" disabled={loading} onClick={() => void load()} className="rounded-xl px-3 py-2.5 text-xs font-bold text-[#3F8240]">Tải lại</button></div>

      {loading && <p className="flex items-center gap-2 py-12 text-sm text-[#748A74]"><LoaderCircle size={17} className="animate-spin" /> Đang mở thư viện…</p>}
      {!loading && filtered.length === 0 && <div className="py-14 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#EEF8E9] text-[#3F8240]"><FileText size={24} /></div><h3 className="mt-4 text-lg font-bold">Chưa có kịch bản trong góc này.</h3><p className="mt-2 text-sm text-[#748A74]">Tạo từ lịch nội dung hoặc bắt đầu với một ý tưởng mới tinh.</p><button type="button" onClick={() => setShowCreate(true)} className="mt-5 rounded-xl bg-[#4E8052] px-5 py-3 text-sm font-bold text-white">Tạo kịch bản đầu tiên</button></div>}
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map((script) => {
        const progress = scriptProgress(script); const status = scriptStatusConfig[script.status];
        return <button type="button" key={script.id} onClick={() => { setDraft(structuredClone(script)); setDirty(false); setError(""); setNotice(""); }} className="group rounded-[22px] border border-[#E5DED8] bg-[#FFFEFB] p-5 text-left transition hover:-translate-y-0.5 hover:border-[#A8CE9A] hover:shadow-[0_16px_40px_rgba(60,90,62,0.1)]">
          <div className="flex items-center justify-between gap-3"><span style={{ color: status.color, background: status.surface }} className="rounded-full px-3 py-1 text-[11px] font-bold">{status.label}</span><span className="text-[11px] text-[#849084]">{script.source === "ai" ? "AI gợi ý" : script.source === "content-plan" ? "Từ lịch" : "Tạo mới"}</span></div>
          <h3 className="mt-4 line-clamp-2 min-h-12 text-base font-bold leading-6 text-[#284D31]">{script.title}</h3><p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-[#748A74]">{script.content.hook || "Hook đang chờ được viết…"}</p>
          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#E7EEE3]"><span className="block h-full rounded-full bg-[#72B65D]" style={{ width: `${progress}%` }} /></div><div className="mt-2 flex justify-between text-[11px] text-[#748A74]"><span>{progress}% nội dung</span><span>{script.content.storyboard.length} keyframe</span></div>
          <div className="mt-4 flex items-center justify-between border-t border-[#EFE8E2] pt-4 text-[11px] text-[#6F806F]"><span className="flex items-center gap-1.5"><CalendarClock size={13} /> {formatScriptDate(script.settings.scheduledFor)}</span><span>{script.settings.platform || "Chưa chọn"}</span></div>
        </button>;
      })}</div>
    </section>
  </section>;
}
