import { useEffect, useMemo, useState } from "react";
import type { CreateScriptRequestDto, ScriptScheduleOptionDto } from "@creator-flow/contracts";
import { CalendarDays, FilePlus2, LoaderCircle, Sparkles, X } from "lucide-react";
import { EmsenAvatar } from "../../../components/branding/EmsenAvatar";
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
  const initialOption = scheduleOptions.find((item) => !item.alreadyLinked) ?? scheduleOptions[0];
  const [source, setSource] = useState<"schedule" | "new">(scheduleOptions.length ? "schedule" : "new");
  const [selectedPlanId, setSelectedPlanId] = useState(initialOption?.contentPlanId ?? "");
  const [selectedId, setSelectedId] = useState(initialOption?.id ?? "");
  const plans = useMemo(() => Array.from(new Map(scheduleOptions.map((item) => [item.contentPlanId, {
    id: item.contentPlanId,
    name: item.contentPlanName,
    weekStart: item.weekStart,
  }])).values()), [scheduleOptions]);
  const planScheduleOptions = useMemo(() => scheduleOptions.filter((item) => item.contentPlanId === selectedPlanId), [scheduleOptions, selectedPlanId]);
  const selected = useMemo(() => scheduleOptions.find((item) => item.id === selectedId), [scheduleOptions, selectedId]);
  const [title, setTitle] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [platform, setPlatform] = useState("TikTok");
  const [format, setFormat] = useState("Video ngắn");
  const [brief, setBrief] = useState("");
  const [useAi, setUseAi] = useState(false);

  useEffect(() => {
    if (selected?.contentPlanId === selectedPlanId) return;
    const next = planScheduleOptions.find((item) => !item.alreadyLinked) ?? planScheduleOptions[0];
    setSelectedId(next?.id ?? "");
  }, [planScheduleOptions, selected, selectedPlanId]);

  const submit = () => {
    if (source === "schedule" && selected) {
      onCreate({
        mode: useAi ? "ai" : "manual",
        title: selected.title,
        brief,
        scheduledFor: selected.scheduledFor,
        platform: selected.platform,
        format: selected.format,
        contentPlanId: selected.contentPlanId,
        contentPlanItemId: selected.contentPlanItemId,
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

  const valid = source === "schedule" ? Boolean(selected && !selected.alreadyLinked) : title.trim().length >= 1;
  return (
    <section className="rounded-[26px] border border-[#CFE1C8] bg-gradient-to-br from-[#F5FAF1] via-white to-[#FFF0EC] p-5 shadow-[0_18px_55px_rgba(67,104,67,0.12)] sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <EmsenAvatar activity="idea" className="h-16 w-16 shrink-0" />
          <div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#3F8240]">Kịch bản mới</p><h3 className="mt-1 text-xl font-bold text-[#284D31] sm:text-2xl">Bạn muốn bắt đầu từ đâu?</h3></div>
        </div>
        <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-xl border border-[#DDE8D6] bg-white p-2 text-[#5E755E]"><X size={18} /></button>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={() => setSource("schedule")} disabled={!scheduleOptions.length} className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition disabled:opacity-40 ${source === "schedule" ? "border-[#72B65D] bg-[#EEF8E9]" : "border-[#E5DED8] bg-white"}`}>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#3F8240]"><CalendarDays size={19} /></span>
          <span><strong className="block text-sm">Từ lịch nội dung</strong><small className="mt-0.5 block text-[11px] font-normal text-[#748A74]">Dùng ý tưởng đã lên lịch</small></span>
        </button>
        <button type="button" onClick={() => setSource("new")} className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition ${source === "new" ? "border-[#72B65D] bg-[#EEF8E9]" : "border-[#E5DED8] bg-white"}`}>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#3F8240]"><FilePlus2 size={19} /></span>
          <span><strong className="block text-sm">Ý tưởng mới</strong><small className="mt-0.5 block text-[11px] font-normal text-[#748A74]">Bắt đầu với trang trống</small></span>
        </button>
      </div>

      {source === "schedule" ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-bold">Kế hoạch nội dung
            <select className={inputClass} value={selectedPlanId} onChange={(event) => setSelectedPlanId(event.target.value)}>
              {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
            </select>
          </label>
          <label className="block text-xs font-bold">Chọn nội dung đã lên lịch
            <select className={inputClass} value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
              {planScheduleOptions.map((option) => <option key={option.id} value={option.id} disabled={option.alreadyLinked}>{formatScriptDate(option.scheduledFor)} · {option.title}{option.alreadyLinked ? " · Đã có kịch bản" : ""}</option>)}
            </select>
          </label>
          {selected && <div className="rounded-xl border border-[#E2EBDD] bg-white px-3 py-2.5 text-xs leading-5 text-[#748A74] sm:col-span-2"><strong className="text-[#31583A]">{selected.contentPlanName}</strong><span className="mx-1.5">·</span>{selected.platform} · {selected.format} · {selected.objective}</div>}
          {selected?.alreadyLinked && <p className="text-xs text-[#9A6B45] sm:col-span-2">Nội dung này đã có kịch bản. Hãy chọn nội dung khác.</p>}
        </div>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-bold sm:col-span-2">Tên kịch bản<input className={inputClass} maxLength={250} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ví dụ: Vì sao video đầu tiên không cần hoàn hảo?" /></label>
          <label className="text-xs font-bold">Ngày dự kiến<input type="date" className={inputClass} value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} /></label>
          <label className="text-xs font-bold">Nền tảng<select className={inputClass} value={platform} onChange={(event) => setPlatform(event.target.value)}><option>TikTok</option><option>Instagram</option><option>YouTube</option><option>Facebook</option><option>Đa nền tảng</option></select></label>
          <label className="text-xs font-bold sm:col-span-2">Định dạng<input className={inputClass} maxLength={120} value={format} onChange={(event) => setFormat(event.target.value)} /></label>
        </div>
      )}

      <label className="mt-5 block text-xs font-bold">Ghi chú cho kịch bản <span className="font-normal text-[#879487]">(không bắt buộc)</span><textarea className={inputClass} rows={2} maxLength={3000} value={brief} onChange={(event) => setBrief(event.target.value)} placeholder="Ví dụ: gần gũi, đi thẳng vào vấn đề…" /></label>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" disabled={!aiConfigured} aria-pressed={useAi} onClick={() => setUseAi((value) => !value)} className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold disabled:opacity-40 ${useAi ? "border-[#6DAE58] bg-[#284D31] text-white" : "border-[#C8DBC1] bg-white text-[#31583A]"}`}><Sparkles size={16} /> {useAi ? "AI sẽ viết bản đầu" : "Nhờ AI gợi ý kịch bản"}</button>
        {!aiConfigured && <button type="button" onClick={onSettings} className="text-xs font-bold text-[#3F8240] underline underline-offset-4">Thêm Google API key</button>}
        <button type="button" disabled={!valid || busy || (useAi && !aiConfigured)} onClick={submit} className="ml-auto inline-flex items-center gap-2 rounded-xl bg-[#4E8052] px-5 py-3 text-sm font-bold text-white disabled:opacity-40">{busy && <LoaderCircle size={16} className="animate-spin" />}{useAi ? "Tạo cùng AI" : "Mở trang viết"}</button>
      </div>
    </section>
  );
}
