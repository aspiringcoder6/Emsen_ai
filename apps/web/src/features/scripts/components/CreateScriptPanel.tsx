import { useMemo, useState } from "react";
import type { CreateScriptRequestDto, ScriptScheduleOptionDto } from "@creator-flow/contracts";
import { CalendarDays, FilePlus2, LoaderCircle, Sparkles, X } from "lucide-react";
import { formatScriptDate } from "../scriptConfig";

const inputClass = "mt-2 w-full rounded-xl border border-[#E6D4CE] bg-white px-3 py-2.5 text-sm font-normal text-[#31583A]";

export function CreateScriptPanel({
  aiConfigured,
  scheduleOptions,
  busy,
  onClose,
  onCreate,
  onSettings,
}: {
  aiConfigured: boolean;
  scheduleOptions: ScriptScheduleOptionDto[];
  busy: boolean;
  onClose: () => void;
  onCreate: (input: CreateScriptRequestDto) => void;
  onSettings: () => void;
}) {
  const [source, setSource] = useState<"schedule" | "new">(scheduleOptions.length ? "schedule" : "new");
  const [selectedId, setSelectedId] = useState(scheduleOptions.find((item) => !item.alreadyLinked)?.id ?? scheduleOptions[0]?.id ?? "");
  const selected = useMemo(() => scheduleOptions.find((item) => item.id === selectedId), [scheduleOptions, selectedId]);
  const [title, setTitle] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [platform, setPlatform] = useState("TikTok");
  const [format, setFormat] = useState("Video ngắn");
  const [brief, setBrief] = useState("");
  const [useAi, setUseAi] = useState(false);

  const submit = () => {
    if (source === "schedule" && selected) {
      onCreate({
        mode: useAi ? "ai" : "manual",
        title: selected.title,
        brief,
        scheduledFor: selected.scheduledFor,
        platform: selected.platform,
        format: selected.format,
        contentPlanVersionId: selected.contentPlanVersionId,
        dayIndex: selected.dayIndex,
      });
      return;
    }
    onCreate({
      mode: useAi ? "ai" : "manual",
      title,
      brief,
      scheduledFor: scheduledFor || null,
      platform,
      format,
    });
  };

  const valid = source === "schedule" ? Boolean(selected) : title.trim().length >= 1;
  return (
    <section className="rounded-[28px] border border-[#CFE1C8] bg-gradient-to-br from-[#F5FAF1] via-white to-[#FFF0EC] p-5 shadow-[0_18px_55px_rgba(67,104,67,0.12)] sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#3F8240]">Kịch bản mới</p>
          <h3 className="mt-2 text-2xl font-bold text-[#284D31]">Bắt đầu từ một hạt giống.</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#748A74]">Chọn một nội dung trong lịch đã chốt, hoặc mở một trang trắng kèm lịch mới.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-xl border border-[#DDE8D6] bg-white p-2 text-[#5E755E]"><X size={18} /></button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => setSource("schedule")} disabled={!scheduleOptions.length} className={`rounded-2xl border p-4 text-left transition disabled:opacity-40 ${source === "schedule" ? "border-[#72B65D] bg-[#EEF8E9]" : "border-[#E5DED8] bg-white"}`}>
          <CalendarDays size={20} className="text-[#3F8240]" />
          <span className="mt-3 block text-sm font-bold">Từ lịch nội dung</span>
          <span className="mt-1 block text-xs leading-5 text-[#748A74]">Mang theo hook, CTA, nền tảng và ngày dự kiến.</span>
        </button>
        <button type="button" onClick={() => setSource("new")} className={`rounded-2xl border p-4 text-left transition ${source === "new" ? "border-[#72B65D] bg-[#EEF8E9]" : "border-[#E5DED8] bg-white"}`}>
          <FilePlus2 size={20} className="text-[#3F8240]" />
          <span className="mt-3 block text-sm font-bold">Kịch bản mới tinh</span>
          <span className="mt-1 block text-xs leading-5 text-[#748A74]">Tạo ý tưởng độc lập và đặt một lịch mới nếu muốn.</span>
        </button>
      </div>

      {source === "schedule" ? (
        <label className="mt-5 block text-xs font-bold">Chọn nội dung đã lên lịch
          <select className={inputClass} value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
            {scheduleOptions.map((option) => <option key={option.id} value={option.id}>{formatScriptDate(option.scheduledFor)} · {option.title}{option.alreadyLinked ? " · Đã có kịch bản" : ""}</option>)}
          </select>
          {selected && <span className="mt-2 block text-xs font-normal leading-5 text-[#748A74]">{selected.platform} · {selected.format} · {selected.objective}</span>}
        </label>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-bold sm:col-span-2">Tên kịch bản<input className={inputClass} maxLength={250} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ví dụ: Vì sao video đầu tiên không cần hoàn hảo?" /></label>
          <label className="text-xs font-bold">Ngày dự kiến<input type="date" className={inputClass} value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} /></label>
          <label className="text-xs font-bold">Nền tảng<select className={inputClass} value={platform} onChange={(event) => setPlatform(event.target.value)}><option>TikTok</option><option>Instagram</option><option>YouTube</option><option>Facebook</option><option>Đa nền tảng</option></select></label>
          <label className="text-xs font-bold sm:col-span-2">Định dạng<input className={inputClass} maxLength={120} value={format} onChange={(event) => setFormat(event.target.value)} /></label>
        </div>
      )}

      <label className="mt-5 block text-xs font-bold">Bạn muốn kịch bản này đi theo hướng nào? · không bắt buộc<textarea className={inputClass} rows={3} maxLength={3000} value={brief} onChange={(event) => setBrief(event.target.value)} placeholder="Ví dụ: gần gũi, vào thẳng nỗi đau, kết thúc bằng một câu hỏi để mở thảo luận…" /></label>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" disabled={!aiConfigured} aria-pressed={useAi} onClick={() => setUseAi((value) => !value)} className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold disabled:opacity-40 ${useAi ? "border-[#6DAE58] bg-[#284D31] text-white" : "border-[#C8DBC1] bg-white text-[#31583A]"}`}><Sparkles size={16} /> {useAi ? "AI sẽ viết bản đầu" : "Nhờ AI gợi ý kịch bản"}</button>
        {!aiConfigured && <button type="button" onClick={onSettings} className="text-xs font-bold text-[#3F8240] underline underline-offset-4">Thêm Google API key</button>}
        <button type="button" disabled={!valid || busy || (useAi && !aiConfigured)} onClick={submit} className="ml-auto inline-flex items-center gap-2 rounded-xl bg-[#4E8052] px-5 py-3 text-sm font-bold text-white disabled:opacity-40">{busy && <LoaderCircle size={16} className="animate-spin" />}{useAi ? "Tạo cùng AI" : "Mở trang viết"}</button>
      </div>
    </section>
  );
}
