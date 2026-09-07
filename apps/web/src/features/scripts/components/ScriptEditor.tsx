import { useState } from "react";
import type {
  ScriptAssistSection,
  ScriptDocumentDto,
  ScriptStoryboardFrameDto,
} from "@creator-flow/contracts";
import {
  ArrowLeft,
  Bot,
  ChevronDown,
  ChevronUp,
  Clock3,
  CopyCheck,
  Film,
  LoaderCircle,
  MessageSquareText,
  Plus,
  Save,
  Settings2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { formatScriptDate, scriptStatusConfig, scriptStatuses } from "../scriptConfig";

const inputClass = "mt-2 w-full rounded-xl border border-[#E6D4CE] bg-[#FFFDF8] px-3 py-2.5 text-sm font-normal leading-6 text-[#31583A]";

function AiPrompt({ section, busy, enabled, onAsk, onSettings }: { section: ScriptAssistSection; busy: boolean; enabled: boolean; onAsk: (prompt: string) => void; onSettings: () => void }) {
  const [prompt, setPrompt] = useState("");
  const examples: Record<ScriptAssistSection, string> = {
    hook: "Ngắn hơn và tạo tò mò ngay trong 3 giây đầu",
    body: "Thêm ví dụ gần gũi, giữ lời thoại tự nhiên",
    cta: "Mềm hơn, khuyến khích người xem chia sẻ trải nghiệm",
    storyboard: "Chia thành 5 cảnh dễ quay bằng điện thoại",
  };
  return <aside className="rounded-2xl border border-[#D8E9D2] bg-[#F4FAF0] p-3">
    <p className="flex items-center gap-2 text-xs font-bold text-[#3F8240]"><Bot size={15} /> Emsen giúp bạn sửa nhé</p>
    <textarea disabled={!enabled} value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={3000} rows={2} placeholder={enabled ? examples[section] : "Kết nối AI để dùng trợ lý phần này"} className="mt-2 w-full resize-none rounded-xl border border-[#D9E4D3] bg-white px-3 py-2 text-xs leading-5 disabled:opacity-60" />
    {enabled ? <button type="button" disabled={busy || !prompt.trim()} onClick={() => onAsk(prompt)} className="mt-2 inline-flex items-center gap-2 rounded-lg bg-[#31583A] px-3 py-2 text-xs font-bold text-white disabled:opacity-40">{busy ? <LoaderCircle size={13} className="animate-spin" /> : <Sparkles size={13} />} Đề xuất bản chỉnh</button> : <button type="button" onClick={onSettings} className="mt-2 text-xs font-bold text-[#3F8240] underline underline-offset-4">Kết nối Google AI</button>}
  </aside>;
}

function TextSection({
  title,
  caption,
  value,
  rows,
  section,
  busy,
  aiConfigured,
  onChange,
  onAssist,
  onSettings,
}: {
  title: string;
  caption: string;
  value: string;
  rows: number;
  section: Exclude<ScriptAssistSection, "storyboard">;
  busy: boolean;
  aiConfigured: boolean;
  onChange: (value: string) => void;
  onAssist: (section: ScriptAssistSection, prompt: string) => void;
  onSettings: () => void;
}) {
  return <section className="rounded-[24px] border border-[#DDEBD6] bg-white p-5 sm:p-6">
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
      <label className="text-sm font-bold text-[#284D31]">{title}<span className="mt-1 block text-xs font-normal leading-5 text-[#748A74]">{caption}</span><textarea className={inputClass} rows={rows} value={value} onChange={(event) => onChange(event.target.value)} /></label>
      <AiPrompt section={section} busy={busy} enabled={aiConfigured} onAsk={(prompt) => onAssist(section, prompt)} onSettings={onSettings} />
    </div>
  </section>;
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
  const changeContent = (patch: Partial<ScriptDocumentDto["content"]>) => onChange({ ...draft, content: { ...draft.content, ...patch } });
  const changeSettings = (patch: Partial<ScriptDocumentDto["settings"]>) => onChange({ ...draft, settings: { ...draft.settings, ...patch } });
  const changeAdvanced = (patch: Partial<ScriptDocumentDto["advancedSettings"]>) => onChange({ ...draft, advancedSettings: { ...draft.advancedSettings, ...patch } });
  const updateFrame = (id: string, patch: Partial<ScriptStoryboardFrameDto>) => changeContent({ storyboard: draft.content.storyboard.map((frame) => frame.id === id ? { ...frame, ...patch } : frame) });
  const moveFrame = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= draft.content.storyboard.length) return;
    const frames = [...draft.content.storyboard];
    [frames[index], frames[nextIndex]] = [frames[nextIndex]!, frames[index]!];
    changeContent({ storyboard: frames });
  };
  const addFrame = () => changeContent({ storyboard: [...draft.content.storyboard, {
    id: crypto.randomUUID(), title: `Keyframe ${String(draft.content.storyboard.length + 1).padStart(2, "0")}`,
    visual: "", dialogue: "", direction: "", durationSeconds: 5,
  }] });
  const status = scriptStatusConfig[draft.status];
  const wordCount = `${draft.content.hook} ${draft.content.body} ${draft.content.cta}`.trim().split(/\s+/).filter(Boolean).length;

  return <section className="mx-auto max-w-[1280px] space-y-5">
    <header className="sticky top-0 z-20 rounded-[24px] border border-[#D9E8D4] bg-[rgba(255,254,249,0.94)] p-4 shadow-[0_12px_35px_rgba(55,85,57,0.1)] backdrop-blur-xl">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-xl border border-[#DDE8D6] bg-white px-3 py-2 text-xs font-bold"><ArrowLeft size={15} /> Thư viện</button>
        <div className="min-w-[220px] flex-1"><input value={draft.title} maxLength={250} onChange={(event) => onChange({ ...draft, title: event.target.value })} className="w-full bg-transparent text-lg font-bold text-[#284D31] outline-none sm:text-xl" /><p className="mt-1 text-xs text-[#748A74]">{draft.settings.platform || "Chưa chọn nền tảng"} · {formatScriptDate(draft.settings.scheduledFor)} · {wordCount} từ</p></div>
        <select value={draft.status} onChange={(event) => onChange({ ...draft, status: event.target.value as ScriptDocumentDto["status"] })} style={{ color: status.color, background: status.surface }} className="rounded-xl border-0 px-3 py-2 text-xs font-bold">{scriptStatuses.map((value) => <option key={value} value={value}>{scriptStatusConfig[value].label}</option>)}</select>
        <button type="button" disabled={saving || !dirty || !draft.title.trim()} onClick={onSave} className="inline-flex items-center gap-2 rounded-xl bg-[#4E8052] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40">{saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />} Lưu kịch bản</button>
      </div>
    </header>

    {error && <p role="alert" className="rounded-xl border border-[#F1C9C2] bg-[#FFF0EC] p-4 text-sm text-[#9A4B42]">{error}</p>}
    {notice && <p role="status" className="rounded-xl border border-[#CFE2C7] bg-[#EFF8EB] p-4 text-sm text-[#417447]">{notice}</p>}

    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
      <div className="space-y-4">
        <TextSection title="Hook" caption="Khoảnh khắc đầu tiên để người xem dừng lại." value={draft.content.hook} rows={4} section="hook" busy={assisting === "hook"} aiConfigured={aiConfigured} onChange={(hook) => changeContent({ hook })} onAssist={onAssist} onSettings={onSettings} />
        <TextSection title="Nội dung chính" caption="Luồng ý, dẫn chứng và lời thoại cốt lõi của video." value={draft.content.body} rows={10} section="body" busy={assisting === "body"} aiConfigured={aiConfigured} onChange={(body) => changeContent({ body })} onAssist={onAssist} onSettings={onSettings} />
        <TextSection title="CTA" caption="Bước tiếp theo bạn muốn người xem thực hiện." value={draft.content.cta} rows={4} section="cta" busy={assisting === "cta"} aiConfigured={aiConfigured} onChange={(cta) => changeContent({ cta })} onAssist={onAssist} onSettings={onSettings} />

        <section className="rounded-[24px] border border-[#DDEBD6] bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="flex items-center gap-2 text-sm font-bold text-[#284D31]"><Film size={18} /> Storyboard bằng text</p><p className="mt-1 text-xs leading-5 text-[#748A74]">Mỗi keyframe gồm hình ảnh dự kiến, lời thoại và chỉ dẫn quay. Sinh ảnh minh họa sẽ được bổ sung sau.</p></div><button type="button" onClick={addFrame} disabled={draft.content.storyboard.length >= 16} className="inline-flex items-center gap-2 rounded-xl border border-[#C8DBC1] px-3 py-2 text-xs font-bold disabled:opacity-40"><Plus size={14} /> Thêm keyframe</button></div>
          <div className="mt-5 space-y-3">{draft.content.storyboard.map((frame, index) => <article key={frame.id} className="rounded-2xl border border-[#E8DED8] bg-[#FFFCF8] p-4">
            <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-[#EAF6E4] text-xs font-black text-[#3F8240]">{index + 1}</span><input value={frame.title} maxLength={120} onChange={(event) => updateFrame(frame.id, { title: event.target.value })} className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none" /><button type="button" onClick={() => moveFrame(index, -1)} disabled={index === 0} className="p-1.5 disabled:opacity-20" aria-label="Đưa lên"><ChevronUp size={15} /></button><button type="button" onClick={() => moveFrame(index, 1)} disabled={index === draft.content.storyboard.length - 1} className="p-1.5 disabled:opacity-20" aria-label="Đưa xuống"><ChevronDown size={15} /></button><button type="button" onClick={() => changeContent({ storyboard: draft.content.storyboard.filter((item) => item.id !== frame.id) })} className="p-1.5 text-[#A15B55]" aria-label="Xóa"><Trash2 size={15} /></button></div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-[11px] font-bold">Hình ảnh / hành động<textarea className={inputClass} rows={3} value={frame.visual} onChange={(event) => updateFrame(frame.id, { visual: event.target.value })} /></label><label className="text-[11px] font-bold">Lời thoại keyframe<textarea className={inputClass} rows={3} value={frame.dialogue} onChange={(event) => updateFrame(frame.id, { dialogue: event.target.value })} /></label><label className="text-[11px] font-bold">Chỉ dẫn quay<textarea className={inputClass} rows={2} value={frame.direction} onChange={(event) => updateFrame(frame.id, { direction: event.target.value })} /></label><label className="text-[11px] font-bold">Thời lượng (giây)<input type="number" min={0} max={600} className={inputClass} value={frame.durationSeconds} onChange={(event) => updateFrame(frame.id, { durationSeconds: Math.max(0, Number(event.target.value)) })} /></label></div>
          </article>)}</div>
          <div className="mt-4"><AiPrompt section="storyboard" busy={assisting === "storyboard"} enabled={aiConfigured} onAsk={(prompt) => onAssist("storyboard", prompt)} onSettings={onSettings} /></div>
        </section>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-28">
        <section className="rounded-[24px] border border-[#DDEBD6] bg-white p-5"><h3 className="flex items-center gap-2 text-sm font-bold"><Settings2 size={17} /> Cài đặt kịch bản</h3><div className="mt-4 space-y-4">
          <label className="block text-xs font-bold">Nền tảng<input className={inputClass} maxLength={80} value={draft.settings.platform} onChange={(event) => changeSettings({ platform: event.target.value })} /></label>
          <label className="block text-xs font-bold">Định dạng<input className={inputClass} maxLength={120} value={draft.settings.format} onChange={(event) => changeSettings({ format: event.target.value })} /></label>
          <label className="block text-xs font-bold">Ngày dự kiến<input type="date" className={inputClass} value={draft.settings.scheduledFor ?? ""} onChange={(event) => changeSettings({ scheduledFor: event.target.value || null })} /></label>
          <div className="grid grid-cols-2 gap-3"><label className="text-xs font-bold">Thời lượng<input type="number" min={5} max={3600} className={inputClass} value={draft.settings.targetDurationSeconds} onChange={(event) => changeSettings({ targetDurationSeconds: Number(event.target.value) })} /></label><label className="text-xs font-bold">Tỷ lệ<select className={inputClass} value={draft.settings.aspectRatio} onChange={(event) => changeSettings({ aspectRatio: event.target.value as ScriptDocumentDto["settings"]["aspectRatio"] })}>{["9:16", "4:5", "1:1", "16:9"].map((ratio) => <option key={ratio}>{ratio}</option>)}</select></label></div>
          <label className="block text-xs font-bold">Mục tiêu<textarea className={inputClass} rows={2} value={draft.settings.objective} onChange={(event) => changeSettings({ objective: event.target.value })} /></label>
        </div></section>

        <details className="group rounded-[24px] border border-[#E6DCD5] bg-[#FFFCF8] p-5"><summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold"><span className="flex items-center gap-2"><CopyCheck size={17} /> Cài đặt nâng cao</span><ChevronDown size={16} className="transition group-open:rotate-180" /></summary><div className="mt-4 space-y-4">
          <label className="block text-xs font-bold">Khán giả<textarea className={inputClass} rows={2} value={draft.settings.audience} onChange={(event) => changeSettings({ audience: event.target.value })} /></label>
          <label className="block text-xs font-bold">Giọng điệu<textarea className={inputClass} rows={2} value={draft.settings.tone} onChange={(event) => changeSettings({ tone: event.target.value })} /></label>
          <label className="block text-xs font-bold">Kiểu hook<input className={inputClass} value={draft.advancedSettings.hookStyle} onChange={(event) => changeAdvanced({ hookStyle: event.target.value })} /></label>
          <label className="block text-xs font-bold">Nhịp độ<select className={inputClass} value={draft.advancedSettings.pacing} onChange={(event) => changeAdvanced({ pacing: event.target.value as ScriptDocumentDto["advancedSettings"]["pacing"] })}><option value="slow">Chậm, có khoảng thở</option><option value="balanced">Cân bằng</option><option value="fast">Nhanh, dồn nhịp</option></select></label>
          <label className="block text-xs font-bold">Kiểu CTA<input className={inputClass} value={draft.advancedSettings.ctaStyle} onChange={(event) => changeAdvanced({ ctaStyle: event.target.value })} /></label>
          <label className="block text-xs font-bold">Ngôn ngữ<input className={inputClass} value={draft.advancedSettings.language} onChange={(event) => changeAdvanced({ language: event.target.value })} /></label>
          <label className="block text-xs font-bold">Ghi chú sản xuất<textarea className={inputClass} rows={4} value={draft.advancedSettings.productionNotes} onChange={(event) => changeAdvanced({ productionNotes: event.target.value })} /></label>
        </div></details>

        <section className="rounded-[20px] border border-[#D8E9D2] bg-[#F4FAF0] p-4 text-xs leading-5 text-[#627862]"><p className="flex items-center gap-2 font-bold text-[#3F8240]"><MessageSquareText size={15} /> Trợ lý emsen chỉnh từng phần</p><p className="mt-2">Emsen chỉ chỉnh phần bạn nhờ thôi! Bạn vẫn có quyền quyết định và chốt cuối cùng</p><p className="mt-3 flex items-center gap-2"><Clock3 size={14} /> Cập nhật {new Date(draft.updatedAt).toLocaleString("vi-VN")}</p></section>
      </aside>
    </div>
  </section>;
}
