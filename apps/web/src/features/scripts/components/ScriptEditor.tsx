import { useEffect, useState } from "react";
import type {
  ScriptAssistSection,
  ScriptDocumentDto,
  ScriptStoryboardFrameDto,
} from "@creator-flow/contracts";
import {
  ArrowLeft,
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Clipboard,
  Clock3,
  Download,
  FileJson,
  Film,
  LoaderCircle,
  Plus,
  Save,
  Settings2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { EmsenAvatar } from "../../../components/branding/EmsenAvatar";
import { downloadScript, scriptAsText } from "../scriptExport";
import { formatScriptDate, scriptStatusConfig, scriptStatuses } from "../scriptConfig";

const inputClass = "mt-2 w-full rounded-xl border border-[#E6D4CE] bg-[#FFFDF8] px-3 py-2.5 text-sm font-normal leading-6 text-[#31583A] outline-none transition focus:border-[#72B65D] focus:ring-2 focus:ring-[#DDEED6]";

function AiPrompt({
  section,
  busy,
  enabled,
  onAsk,
  onClose,
  onSettings,
}: {
  section: ScriptAssistSection;
  busy: boolean;
  enabled: boolean;
  onAsk: (prompt: string) => void;
  onClose: () => void;
  onSettings: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  const examples: Record<ScriptAssistSection, string> = {
    hook: "Ngắn hơn và tạo tò mò ngay trong 3 giây đầu",
    body: "Thêm ví dụ gần gũi, giữ lời thoại tự nhiên",
    cta: "Mềm hơn, khuyến khích người xem chia sẻ trải nghiệm",
    storyboard: "Chia thành 5 cảnh dễ quay bằng điện thoại",
  };

  return (
    <aside className="mt-3 rounded-2xl border border-[#CFE3C8] bg-[#F4FAF0] p-3 sm:p-4">
      <div className="flex items-center gap-3">
        <EmsenAvatar activity="idea" className="h-11 w-11 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-xs font-bold text-[#3F8240]"><Bot size={14} /> Chỉnh cùng Emsen</p>
          <p className="mt-0.5 truncate text-[11px] text-[#748A74]">{examples[section]}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Đóng trợ lý" className="rounded-lg p-1.5 text-[#748A74] hover:bg-white"><X size={15} /></button>
      </div>

      {enabled ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            maxLength={3000}
            rows={2}
            placeholder="Bạn muốn chỉnh thế nào?"
            className="min-w-0 flex-1 resize-none rounded-xl border border-[#D9E4D3] bg-white px-3 py-2 text-xs leading-5 outline-none focus:border-[#72B65D]"
          />
          <button type="button" disabled={busy || !prompt.trim()} onClick={() => onAsk(prompt)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#31583A] px-3.5 py-2.5 text-xs font-bold text-white disabled:opacity-40">
            {busy ? <LoaderCircle size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {busy ? "Đang chỉnh" : "Gửi Emsen"}
          </button>
        </div>
      ) : (
        <button type="button" onClick={onSettings} className="mt-3 rounded-xl border border-[#C8DBC1] bg-white px-3 py-2 text-xs font-bold text-[#3F8240]">Kết nối AI để dùng</button>
      )}
    </aside>
  );
}
function TextSection({
  number,
  title,
  value,
  rows,
  placeholder,
  section,
  busy,
  aiConfigured,
  onChange,
  onAssist,
  onSettings,
}: {
  number: number;
  title: string;
  value: string;
  rows: number;
  placeholder: string;
  section: Exclude<ScriptAssistSection, "storyboard">;
  busy: boolean;
  aiConfigured: boolean;
  onChange: (value: string) => void;
  onAssist: (section: ScriptAssistSection, prompt: string) => void;
  onSettings: () => void;
}) {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const words = value.trim().split(/\s+/).filter(Boolean).length;

  return (
    <section className="rounded-[22px] border border-[#DDEBD6] bg-white p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-xs font-black ${value.trim() ? "bg-[#EAF6E4] text-[#3F8240]" : "bg-[#F2EEE9] text-[#8A7E73]"}`}>
          {value.trim() ? <Check size={15} strokeWidth={3} /> : number}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-[#284D31]">{title}</h3>
          <p className="text-[11px] text-[#879487]">{words ? `${words} từ` : "Chưa viết"}</p>
        </div>
        <button
          type="button"
          aria-expanded={assistantOpen}
          onClick={() => setAssistantOpen((value) => !value)}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${assistantOpen ? "bg-[#EAF6E4] text-[#31583A]" : "border border-[#D7E5D1] text-[#3F8240] hover:bg-[#F4FAF0]"}`}
        >
          <Sparkles size={14} /> <span className="hidden sm:inline">Nhờ Emsen</span>
        </button>
      </div>
      <textarea
        aria-label={title}
        className="mt-3 w-full resize-y rounded-2xl border border-[#E8DED8] bg-[#FFFDF9] px-4 py-3 text-sm font-normal leading-6 text-[#31583A] outline-none transition placeholder:text-[#A3AAA1] focus:border-[#72B65D] focus:ring-2 focus:ring-[#DDEED6]"
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      {assistantOpen && <AiPrompt section={section} busy={busy} enabled={aiConfigured} onAsk={(prompt) => onAssist(section, prompt)} onClose={() => setAssistantOpen(false)} onSettings={onSettings} />}
    </section>
  );
}

function copyWithFallback(value: string) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Không thể sao chép");
}

export function ScriptEditor({
  draft,
  dirty,
  saving,
  assisting,
  error,
  notice,
  aiConfigured,
  onBack,
  onChange,
  onSave,
  onAssist,
  onSettings,
}: {
  draft: ScriptDocumentDto;
  dirty: boolean;
  saving: boolean;
  assisting: ScriptAssistSection | null;
  error: string;
  notice: string;
  aiConfigured: boolean;
  onBack: () => void;
  onChange: (next: ScriptDocumentDto) => void;
  onSave: () => void;
  onAssist: (section: ScriptAssistSection, prompt: string) => void;
  onSettings: () => void;
}) {
  const [storyboardAssistantOpen, setStoryboardAssistantOpen] = useState(false);
  const [exportNotice, setExportNotice] = useState("");

  useEffect(() => {
    if (notice) setExportNotice("");
  }, [notice]);

  const applyChange = (next: ScriptDocumentDto) => {
    setExportNotice("");
    onChange(next);
  };
  const changeContent = (patch: Partial<ScriptDocumentDto["content"]>) => applyChange({ ...draft, content: { ...draft.content, ...patch } });
  const changeSettings = (patch: Partial<ScriptDocumentDto["settings"]>) => applyChange({ ...draft, settings: { ...draft.settings, ...patch } });
  const changeAdvanced = (patch: Partial<ScriptDocumentDto["advancedSettings"]>) => applyChange({ ...draft, advancedSettings: { ...draft.advancedSettings, ...patch } });
  const updateFrame = (id: string, patch: Partial<ScriptStoryboardFrameDto>) => changeContent({ storyboard: draft.content.storyboard.map((frame) => frame.id === id ? { ...frame, ...patch } : frame) });
  const moveFrame = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= draft.content.storyboard.length) return;
    const frames = [...draft.content.storyboard];
    [frames[index], frames[nextIndex]] = [frames[nextIndex]!, frames[index]!];
    changeContent({ storyboard: frames });
  };
  const addFrame = () => changeContent({ storyboard: [...draft.content.storyboard, {
    id: crypto.randomUUID(),
    title: `Keyframe ${String(draft.content.storyboard.length + 1).padStart(2, "0")}`,
    visual: "",
    dialogue: "",
    direction: "",
    durationSeconds: 5,
  }] });

  const closeExportMenu = (trigger: HTMLElement) => trigger.closest("details")?.removeAttribute("open");
  const exportFile = (format: "txt" | "json", trigger: HTMLElement) => {
    downloadScript(draft, format);
    setExportNotice(format === "txt" ? "Đã tải bản văn bản." : "Đã tải bản dữ liệu để sao lưu.");
    closeExportMenu(trigger);
  };
  const copyScript = async (trigger: HTMLElement) => {
    try {
      const value = scriptAsText(draft);
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
      else copyWithFallback(value);
      setExportNotice("Đã sao chép toàn bộ kịch bản.");
    } catch {
      setExportNotice("Chưa thể sao chép. Bạn có thể tải tệp văn bản thay thế.");
    }
    closeExportMenu(trigger);
  };

  const status = scriptStatusConfig[draft.status];
  const primarySections = [draft.content.hook, draft.content.body, draft.content.cta];
  const completedSections = primarySections.filter((value) => value.trim()).length;
  const wordCount = primarySections.join(" ").trim().split(/\s+/).filter(Boolean).length;
  const storyboardDuration = draft.content.storyboard.reduce((total, frame) => total + frame.durationSeconds, 0);

  return (
    <section className="mx-auto max-w-[1280px] space-y-4">
      <header className="sticky top-0 z-20 rounded-[22px] border border-[#D9E8D4] bg-[rgba(255,254,249,0.96)] p-3 shadow-[0_12px_35px_rgba(55,85,57,0.1)] backdrop-blur-xl sm:p-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-xl border border-[#DDE8D6] bg-white px-3 py-2.5 text-xs font-bold"><ArrowLeft size={15} /> <span className="hidden sm:inline">Thư viện</span></button>
          <div className="min-w-[190px] flex-1">
            <input value={draft.title} maxLength={250} placeholder="Tên kịch bản" onChange={(event) => applyChange({ ...draft, title: event.target.value })} className="w-full bg-transparent text-base font-bold text-[#284D31] outline-none sm:text-xl" />
            <p className="mt-0.5 truncate text-[11px] text-[#748A74]">{draft.settings.platform || "Chưa chọn nền tảng"} · {formatScriptDate(draft.settings.scheduledFor)} · {wordCount} từ</p>
          </div>

          <details className="relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl border border-[#DDE8D6] bg-white px-3 py-2.5 text-xs font-bold text-[#31583A]"><Download size={15} /> Xuất <ChevronDown size={13} /></summary>
            <div className="absolute right-0 z-40 mt-2 w-56 rounded-2xl border border-[#DDE8D6] bg-white p-2 shadow-[0_18px_50px_rgba(48,74,50,0.18)]">
              <button type="button" onClick={(event) => void copyScript(event.currentTarget)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold hover:bg-[#F4FAF0]"><Clipboard size={15} className="text-[#3F8240]" /> Sao chép toàn bộ</button>
              <button type="button" onClick={(event) => exportFile("txt", event.currentTarget)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold hover:bg-[#F4FAF0]"><Download size={15} className="text-[#3F8240]" /> Văn bản (.txt)</button>
              <button type="button" onClick={(event) => exportFile("json", event.currentTarget)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold hover:bg-[#F4FAF0]"><FileJson size={15} className="text-[#8B557D]" /> Bản sao lưu (.json)</button>
            </div>
          </details>

          <select value={draft.status} aria-label="Trạng thái kịch bản" onChange={(event) => applyChange({ ...draft, status: event.target.value as ScriptDocumentDto["status"] })} style={{ color: status.color, background: status.surface }} className="rounded-xl border-0 px-3 py-2.5 text-xs font-bold">{scriptStatuses.map((value) => <option key={value} value={value}>{scriptStatusConfig[value].label}</option>)}</select>
          <button type="button" disabled={saving || !dirty || !draft.title.trim()} onClick={onSave} className="inline-flex items-center gap-2 rounded-xl bg-[#4E8052] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40">{saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />} <span className="hidden sm:inline">Lưu</span></button>
        </div>
      </header>

      {error && <p role="alert" className="rounded-xl border border-[#F1C9C2] bg-[#FFF0EC] p-3 text-sm text-[#9A4B42]">{error}</p>}
      {(notice || exportNotice) && <p role="status" className="rounded-xl border border-[#CFE2C7] bg-[#EFF8EB] p-3 text-sm text-[#417447]">{exportNotice || notice}</p>}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_310px]">
        <div className="space-y-3">
          <section className="flex items-center gap-4 rounded-[22px] border border-[#D8E9D2] bg-[#F4FAF0] px-4 py-3">
            <EmsenAvatar activity={completedSections === 3 ? "checklist" : "writing"} className="h-14 w-14 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-[#31583A]">{completedSections === 3 ? "Ba phần chính đã sẵn sàng" : `Hoàn thiện ${3 - completedSections} phần chính`}</p>
                <span className="shrink-0 text-xs font-bold text-[#3F8240]">{completedSections}/3</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#DCEAD6]"><span className="block h-full rounded-full bg-[#72B65D] transition-all" style={{ width: `${(completedSections / 3) * 100}%` }} /></div>
            </div>
          </section>

          <TextSection number={1} title="Hook" value={draft.content.hook} rows={3} placeholder="Câu mở đầu khiến người xem dừng lại…" section="hook" busy={assisting === "hook"} aiConfigured={aiConfigured} onChange={(hook) => changeContent({ hook })} onAssist={onAssist} onSettings={onSettings} />
          <TextSection number={2} title="Nội dung" value={draft.content.body} rows={8} placeholder="Nói điều chính như đang trò chuyện với người xem…" section="body" busy={assisting === "body"} aiConfigured={aiConfigured} onChange={(body) => changeContent({ body })} onAssist={onAssist} onSettings={onSettings} />
          <TextSection number={3} title="CTA" value={draft.content.cta} rows={3} placeholder="Bạn muốn người xem làm gì tiếp theo?" section="cta" busy={assisting === "cta"} aiConfigured={aiConfigured} onChange={(cta) => changeContent({ cta })} onAssist={onAssist} onSettings={onSettings} />

          <details className="group rounded-[22px] border border-[#DDEBD6] bg-white">
            <summary className="flex cursor-pointer list-none items-center gap-3 p-4 sm:p-5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#F3EAF1] text-[#8B557D]"><Film size={18} /></span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-[#284D31]">Storyboard</h3>
                <p className="text-[11px] text-[#879487]">{draft.content.storyboard.length} cảnh · {storyboardDuration} giây</p>
              </div>
              <span className="hidden text-xs font-bold text-[#748A74] sm:inline">Chỉnh cảnh quay</span>
              <ChevronDown size={17} className="text-[#748A74] transition group-open:rotate-180" />
            </summary>

            <div className="border-t border-[#E8EEE5] p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={addFrame} disabled={draft.content.storyboard.length >= 16} className="inline-flex items-center gap-2 rounded-xl border border-[#C8DBC1] px-3 py-2 text-xs font-bold disabled:opacity-40"><Plus size={14} /> Thêm cảnh</button>
                <button type="button" aria-expanded={storyboardAssistantOpen} onClick={() => setStoryboardAssistantOpen((value) => !value)} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ${storyboardAssistantOpen ? "bg-[#EAF6E4] text-[#31583A]" : "border border-[#D7E5D1] text-[#3F8240]"}`}><Sparkles size={14} /> Nhờ Emsen chia cảnh</button>
              </div>
              {storyboardAssistantOpen && <AiPrompt section="storyboard" busy={assisting === "storyboard"} enabled={aiConfigured} onAsk={(prompt) => onAssist("storyboard", prompt)} onClose={() => setStoryboardAssistantOpen(false)} onSettings={onSettings} />}

              <div className="mt-4 space-y-2">
                {draft.content.storyboard.map((frame, index) => (
                  <details key={frame.id} className="rounded-2xl border border-[#E8DED8] bg-[#FFFCF8]">
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-3 sm:px-4">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#EAF6E4] text-xs font-black text-[#3F8240]">{index + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-bold text-[#31583A]">{frame.title || `Cảnh ${index + 1}`}</span>
                      <span className="text-[11px] text-[#879487]">{frame.durationSeconds}s</span>
                      <ChevronDown size={15} className="text-[#879487]" />
                    </summary>
                    <div className="border-t border-[#EFE8E2] p-3 sm:p-4">
                      <div className="flex items-end gap-2">
                        <label className="min-w-0 flex-1 text-[11px] font-bold">Tên cảnh<input className={inputClass} maxLength={120} value={frame.title} onChange={(event) => updateFrame(frame.id, { title: event.target.value })} /></label>
                        <button type="button" onClick={() => moveFrame(index, -1)} disabled={index === 0} className="mb-0.5 rounded-lg p-2 disabled:opacity-20" aria-label="Đưa cảnh lên"><ChevronUp size={16} /></button>
                        <button type="button" onClick={() => moveFrame(index, 1)} disabled={index === draft.content.storyboard.length - 1} className="mb-0.5 rounded-lg p-2 disabled:opacity-20" aria-label="Đưa cảnh xuống"><ChevronDown size={16} /></button>
                        <button type="button" onClick={() => changeContent({ storyboard: draft.content.storyboard.filter((item) => item.id !== frame.id) })} className="mb-0.5 rounded-lg p-2 text-[#A15B55]" aria-label="Xóa cảnh"><Trash2 size={16} /></button>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <label className="text-[11px] font-bold">Hình ảnh / hành động<textarea className={inputClass} rows={3} value={frame.visual} onChange={(event) => updateFrame(frame.id, { visual: event.target.value })} /></label>
                        <label className="text-[11px] font-bold">Lời thoại<textarea className={inputClass} rows={3} value={frame.dialogue} onChange={(event) => updateFrame(frame.id, { dialogue: event.target.value })} /></label>
                        <label className="text-[11px] font-bold">Chỉ dẫn quay<textarea className={inputClass} rows={2} value={frame.direction} onChange={(event) => updateFrame(frame.id, { direction: event.target.value })} /></label>
                        <label className="text-[11px] font-bold">Thời lượng (giây)<input type="number" min={0} max={600} className={inputClass} value={frame.durationSeconds} onChange={(event) => updateFrame(frame.id, { durationSeconds: Math.max(0, Number(event.target.value)) })} /></label>
                      </div>
                    </div>
                  </details>
                ))}
                {!draft.content.storyboard.length && <p className="rounded-xl border border-dashed border-[#D8E1D3] p-5 text-center text-xs text-[#879487]">Chưa có cảnh. Thêm thủ công hoặc nhờ Emsen.</p>}
              </div>
            </div>
          </details>
        </div>

        <aside className="space-y-3 xl:sticky xl:top-24">
          <details className="group rounded-[22px] border border-[#DDEBD6] bg-white">
            <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#EAF6E4] text-[#3F8240]"><Settings2 size={17} /></span>
              <div className="min-w-0 flex-1"><h3 className="text-sm font-bold">Thông tin quay</h3><p className="truncate text-[11px] text-[#879487]">{draft.settings.platform || "Chưa chọn"} · {formatScriptDate(draft.settings.scheduledFor)}</p></div>
              <ChevronDown size={16} className="transition group-open:rotate-180" />
            </summary>
            <div className="space-y-4 border-t border-[#E8EEE5] p-4">
              <label className="block text-xs font-bold">Nền tảng<input className={inputClass} maxLength={80} value={draft.settings.platform} onChange={(event) => changeSettings({ platform: event.target.value })} /></label>
              <label className="block text-xs font-bold">Định dạng<input className={inputClass} maxLength={120} value={draft.settings.format} onChange={(event) => changeSettings({ format: event.target.value })} /></label>
              <label className="block text-xs font-bold">Ngày quay<input type="date" className={inputClass} value={draft.settings.scheduledFor ?? ""} onChange={(event) => changeSettings({ scheduledFor: event.target.value || null })} /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-bold">Thời lượng<input type="number" min={5} max={3600} className={inputClass} value={draft.settings.targetDurationSeconds} onChange={(event) => changeSettings({ targetDurationSeconds: Number(event.target.value) })} /></label>
                <label className="text-xs font-bold">Tỷ lệ<select className={inputClass} value={draft.settings.aspectRatio} onChange={(event) => changeSettings({ aspectRatio: event.target.value as ScriptDocumentDto["settings"]["aspectRatio"] })}>{["9:16", "4:5", "1:1", "16:9"].map((ratio) => <option key={ratio}>{ratio}</option>)}</select></label>
              </div>
              <label className="block text-xs font-bold">Mục tiêu<textarea className={inputClass} rows={2} value={draft.settings.objective} onChange={(event) => changeSettings({ objective: event.target.value })} /></label>
            </div>
          </details>

          <details className="group rounded-[22px] border border-[#E6DCD5] bg-[#FFFCF8]">
            <summary className="flex cursor-pointer list-none items-center justify-between p-4 text-sm font-bold"><span className="flex items-center gap-2"><Settings2 size={16} /> Chỉnh nâng cao</span><ChevronDown size={16} className="transition group-open:rotate-180" /></summary>
            <div className="space-y-4 border-t border-[#EFE8E2] p-4">
              <label className="block text-xs font-bold">Khán giả<textarea className={inputClass} rows={2} value={draft.settings.audience} onChange={(event) => changeSettings({ audience: event.target.value })} /></label>
              <label className="block text-xs font-bold">Giọng điệu<textarea className={inputClass} rows={2} value={draft.settings.tone} onChange={(event) => changeSettings({ tone: event.target.value })} /></label>
              <label className="block text-xs font-bold">Kiểu hook<input className={inputClass} value={draft.advancedSettings.hookStyle} onChange={(event) => changeAdvanced({ hookStyle: event.target.value })} /></label>
              <label className="block text-xs font-bold">Nhịp độ<select className={inputClass} value={draft.advancedSettings.pacing} onChange={(event) => changeAdvanced({ pacing: event.target.value as ScriptDocumentDto["advancedSettings"]["pacing"] })}><option value="slow">Chậm</option><option value="balanced">Cân bằng</option><option value="fast">Nhanh</option></select></label>
              <label className="block text-xs font-bold">Kiểu CTA<input className={inputClass} value={draft.advancedSettings.ctaStyle} onChange={(event) => changeAdvanced({ ctaStyle: event.target.value })} /></label>
              <label className="block text-xs font-bold">Ngôn ngữ<input className={inputClass} value={draft.advancedSettings.language} onChange={(event) => changeAdvanced({ language: event.target.value })} /></label>
              <label className="block text-xs font-bold">Ghi chú sản xuất<textarea className={inputClass} rows={4} value={draft.advancedSettings.productionNotes} onChange={(event) => changeAdvanced({ productionNotes: event.target.value })} /></label>
            </div>
          </details>

          <section className="flex items-center gap-3 rounded-[20px] border border-[#D8E9D2] bg-[#F4FAF0] p-3">
            <EmsenAvatar emotion="content" className="h-12 w-12 shrink-0" />
            <div className="min-w-0 text-xs text-[#627862]"><p className="font-bold text-[#3F8240]">Cần chỉnh câu nào?</p><p className="mt-0.5">Bấm “Nhờ Emsen” ngay tại phần đó.</p></div>
          </section>
          <p className="flex items-center justify-center gap-2 text-[11px] text-[#879487]"><Clock3 size={13} /> Cập nhật {new Date(draft.updatedAt).toLocaleString("vi-VN")}</p>
        </aside>
      </div>
    </section>
  );
}
