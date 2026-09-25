import { useEffect, useMemo, useState } from "react";
import type {
  CreateScriptRequestDto,
  ScriptBrainstormRequestDto,
  ScriptBrainstormResponseDto,
  ScriptScheduleOptionDto,
} from "@creator-flow/contracts";
import {
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  FilePlus2,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import { EmsenAvatar } from "../../../components/branding/EmsenAvatar";
import { AiProgressStatus } from "../../../components/feedback/AiProgressStatus";
import { brainstormScript } from "../scriptApi";
import { formatScriptDate } from "../scriptConfig";
import { recommendedScriptWords, scriptDurationPresets } from "../scriptDuration";

const inputClass = "mt-2 w-full rounded-xl border border-[#E6D4CE] bg-white px-3 py-2.5 text-sm font-normal text-[#31583A] outline-none focus:border-[#72B65D] focus:ring-2 focus:ring-[#DDEED6]";

const ctaStyles = [
  "Bình luận / chia sẻ quan điểm",
  "Theo dõi để xem thêm nội dung",
  "Lưu lại để xem sau",
  "Chia sẻ cho người khác",
  "Xem phần / video tiếp theo",
  "Inbox hoặc tìm hiểu thêm",
  "Click link / đăng ký / mua hàng",
  "Không cần CTA trực tiếp",
];

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
  const [title, setTitle] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [platform, setPlatform] = useState("TikTok");
  const [format, setFormat] = useState("Video ngắn");
  const [brief, setBrief] = useState("");
  const [duration, setDuration] = useState(30);
  const [customDuration, setCustomDuration] = useState(false);
  const [creatorExperience, setCreatorExperience] = useState("");
  const [ctaStyle, setCtaStyle] = useState(ctaStyles[0]!);
  const [useAi, setUseAi] = useState(aiConfigured);
  const [brainstorming, setBrainstorming] = useState(false);
  const [brainstormError, setBrainstormError] = useState("");
  const [brainstormResult, setBrainstormResult] = useState<(ScriptBrainstormResponseDto & { fingerprint: string }) | null>(null);
  const [selectedConceptId, setSelectedConceptId] = useState("");

  const plans = useMemo(() => Array.from(new Map(scheduleOptions.map((item) => [item.contentPlanId, {
    id: item.contentPlanId,
    name: item.contentPlanName,
    weekStart: item.weekStart,
  }])).values()), [scheduleOptions]);
  const planScheduleOptions = useMemo(
    () => scheduleOptions.filter((item) => item.contentPlanId === selectedPlanId),
    [scheduleOptions, selectedPlanId],
  );
  const selected = useMemo(
    () => scheduleOptions.find((item) => item.id === selectedId),
    [scheduleOptions, selectedId],
  );

  useEffect(() => {
    if (selected?.contentPlanId === selectedPlanId) return;
    const next = planScheduleOptions.find((item) => !item.alreadyLinked) ?? planScheduleOptions[0];
    setSelectedId(next?.id ?? "");
  }, [planScheduleOptions, selected, selectedPlanId]);

  const buildRequest = (): ScriptBrainstormRequestDto => source === "schedule" && selected
    ? {
        title: selected.title,
        brief,
        scheduledFor: selected.scheduledFor,
        platform: selected.platform,
        format: selected.format,
        targetDurationSeconds: duration,
        creatorExperience,
        ctaStyle,
        contentPlanId: selected.contentPlanId,
        contentPlanItemId: selected.contentPlanItemId,
        dayIndex: selected.dayIndex,
      }
    : {
        title,
        brief,
        scheduledFor: scheduledFor || null,
        platform,
        format,
        targetDurationSeconds: duration,
        creatorExperience,
        ctaStyle,
      };

  const currentRequest = buildRequest();
  const fingerprint = JSON.stringify(currentRequest);
  const activeResult = brainstormResult?.fingerprint === fingerprint ? brainstormResult : null;
  const selectedConcept = activeResult?.concepts.find((concept) => concept.id === selectedConceptId);
  const words = recommendedScriptWords(duration);
  const validSource = source === "schedule"
    ? Boolean(selected && !selected.alreadyLinked)
    : title.trim().length >= 1;
  const validDuration = Number.isInteger(duration) && duration >= 5 && duration <= 3600;

  const askForConcepts = async () => {
    if (!validSource || !validDuration || brainstorming) return;
    setBrainstorming(true);
    setBrainstormError("");
    try {
      const result = await brainstormScript(currentRequest);
      setBrainstormResult({ ...result, fingerprint });
      setSelectedConceptId(result.recommendedId);
    } catch (error) {
      setBrainstormError(error instanceof Error ? error.message : "Emsen chưa gợi ý được góc triển khai.");
    } finally {
      setBrainstorming(false);
    }
  };

  const submit = () => {
    onCreate({
      ...currentRequest,
      mode: useAi ? "ai" : "manual",
      ...(useAi && selectedConcept ? { selectedConcept } : {}),
    });
  };

  return (
    <section className="rounded-[26px] border border-[#CFE1C8] bg-gradient-to-br from-[#F5FAF1] via-white to-[#FFF0EC] p-5 shadow-[0_18px_55px_rgba(67,104,67,0.12)] sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <EmsenAvatar activity={activeResult ? "checklist" : "idea"} className="h-16 w-16 shrink-0" />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#3F8240]">Kịch bản mới</p>
            <h3 className="mt-1 text-xl font-bold text-[#284D31] sm:text-2xl">Chọn ý tưởng, rồi chọn góc kể</h3>
            <p className="mt-1 text-xs text-[#748A74]">Emsen sẽ mở nhiều hướng để bạn không bị mắc kẹt ở một công thức.</p>
          </div>
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
          <span><strong className="block text-sm">Ý tưởng mới</strong><small className="mt-0.5 block text-[11px] font-normal text-[#748A74]">Bắt đầu với điều bạn muốn kể</small></span>
        </button>
      </div>

      {source === "schedule" ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-bold">Kế hoạch nội dung
            <select className={inputClass} value={selectedPlanId} onChange={(event) => setSelectedPlanId(event.target.value)}>
              {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
            </select>
          </label>
          <label className="block text-xs font-bold">Nội dung muốn phát triển
            <select className={inputClass} value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
              {planScheduleOptions.map((option) => <option key={option.id} value={option.id} disabled={option.alreadyLinked}>{formatScriptDate(option.scheduledFor)} · {option.title}{option.alreadyLinked ? " · Đã có kịch bản" : ""}</option>)}
            </select>
          </label>
          {selected && <div className="rounded-xl border border-[#E2EBDD] bg-white px-3 py-2.5 text-xs leading-5 text-[#748A74] sm:col-span-2"><strong className="text-[#31583A]">{selected.contentPlanName}</strong><span className="mx-1.5">·</span>{selected.platform} · {selected.format} · {selected.objective}</div>}
          {selected?.alreadyLinked && <p className="text-xs text-[#9A6B45] sm:col-span-2">Nội dung này đã có kịch bản. Hãy chọn nội dung khác.</p>}
        </div>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-bold sm:col-span-2">Bạn muốn kể điều gì?<input className={inputClass} maxLength={250} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ví dụ: Vì sao video đầu tiên không cần hoàn hảo?" /></label>
          <label className="text-xs font-bold">Ngày dự kiến<input type="date" className={inputClass} value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} /></label>
          <label className="text-xs font-bold">Nền tảng<select className={inputClass} value={platform} onChange={(event) => setPlatform(event.target.value)}><option>TikTok</option><option>Instagram</option><option>YouTube</option><option>Facebook</option><option>Đa nền tảng</option></select></label>
          <label className="text-xs font-bold sm:col-span-2">Định dạng<input className={inputClass} maxLength={120} value={format} onChange={(event) => setFormat(event.target.value)} /></label>
        </div>
      )}

      <div className="mt-5 rounded-2xl border border-[#E1EADC] bg-white p-4">
        <div className="flex items-center gap-2 text-xs font-bold text-[#31583A]"><Clock3 size={15} /> Video dài bao lâu?</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {scriptDurationPresets.map((seconds) => <button key={seconds} type="button" onClick={() => { setDuration(seconds); setCustomDuration(false); }} className={`rounded-xl border px-3 py-2 text-xs font-bold ${!customDuration && duration === seconds ? "border-[#72B65D] bg-[#EAF6E4] text-[#31583A]" : "border-[#E5DED8] text-[#748A74]"}`}>{seconds} giây</button>)}
          <button type="button" onClick={() => setCustomDuration(true)} className={`rounded-xl border px-3 py-2 text-xs font-bold ${customDuration ? "border-[#72B65D] bg-[#EAF6E4] text-[#31583A]" : "border-[#E5DED8] text-[#748A74]"}`}>Tùy chỉnh</button>
          {customDuration && <label className="flex items-center gap-2 text-xs text-[#748A74]"><input aria-label="Thời lượng tùy chỉnh" type="number" min={5} max={3600} value={duration} onChange={(event) => setDuration(Number(event.target.value))} className="w-20 rounded-xl border border-[#E5DED8] px-3 py-2 text-[#31583A]" /> giây</label>}
        </div>
        {validDuration && <p className="mt-2 text-[11px] text-[#879487]">Gợi ý khoảng {words.min}–{words.max} từ để lời nói thoải mái.</p>}
      </div>

      <label className="mt-5 block text-xs font-bold">Ghi chú cho kịch bản <span className="font-normal text-[#879487]">(không bắt buộc)</span><textarea className={inputClass} rows={2} maxLength={3000} value={brief} onChange={(event) => setBrief(event.target.value)} placeholder="Thông điệp, điều cần tránh hoặc cảm giác bạn muốn tạo…" /></label>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" disabled={!aiConfigured} aria-pressed={useAi} onClick={() => setUseAi((value) => !value)} className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold disabled:opacity-40 ${useAi ? "border-[#6DAE58] bg-[#284D31] text-white" : "border-[#C8DBC1] bg-white text-[#31583A]"}`}><Sparkles size={16} /> {useAi ? "Đang làm cùng Emsen" : "Nhờ Emsen phát triển"}</button>
        {!aiConfigured && <button type="button" onClick={onSettings} className="text-xs font-bold text-[#3F8240] underline underline-offset-4">Kết nối AI</button>}
      </div>
      <p className="mt-2 text-[11px] leading-5 text-[#748A74]">
        {useAi
          ? "Emsen sẽ đề xuất một bản Hook – Nội dung – CTA hoàn chỉnh trước, sau đó bạn chỉnh dần từng phần."
          : "Bạn sẽ mở một khung viết để tự phát triển nội dung từ đầu."}
      </p>

      {useAi && (
        <section className="mt-4 rounded-[22px] border border-[#CFE3C8] bg-[#F4FAF0] p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <EmsenAvatar activity={activeResult ? "checklist" : "writing"} className="h-12 w-12 shrink-0" />
            <div className="min-w-0 flex-1"><p className="text-sm font-bold text-[#31583A]">Cho Emsen một chi tiết chỉ bạn mới có</p><p className="mt-1 text-xs leading-5 text-[#748A74]">Một lần thất bại, khoảnh khắc nhận ra điều gì đó, hoặc quan điểm bạn thật sự tin.</p></div>
          </div>
          <textarea value={creatorExperience} onChange={(event) => setCreatorExperience(event.target.value)} maxLength={4000} rows={3} placeholder="Ví dụ: Tôi từng quay 12 video nhưng không đăng vì cứ nghĩ chúng chưa đủ tốt…" className={`${inputClass} resize-y`} />

          <details className="mt-3 rounded-xl border border-[#DCE8D7] bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-xs font-bold text-[#557058]">Tùy chọn CTA <ChevronDown size={14} /></summary>
            <div className="border-t border-[#E8EEE5] p-3"><select aria-label="Kiểu CTA" className="w-full rounded-xl border border-[#E5DED8] bg-white px-3 py-2.5 text-xs" value={ctaStyle} onChange={(event) => setCtaStyle(event.target.value)}>{ctaStyles.map((style) => <option key={style}>{style}</option>)}</select></div>
          </details>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" disabled={!validSource || !validDuration || brainstorming} onClick={() => void askForConcepts()} className="inline-flex items-center gap-2 rounded-xl bg-[#31583A] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40">{brainstorming ? <LoaderCircle size={15} className="animate-spin" /> : activeResult ? <RefreshCw size={15} /> : <Sparkles size={15} />}{brainstorming ? "Đang mở các hướng…" : activeResult ? "Gợi ý lại 6 góc" : "Gợi ý 6 góc triển khai"}</button>
            <span className="text-[11px] text-[#748A74]">Bạn chọn hướng phù hợp, Emsen mới viết bản đầy đủ.</span>
          </div>
          {brainstorming ? (
            <div className="mt-4">
              <AiProgressStatus label="Emsen đang mở các hướng triển khai" />
            </div>
          ) : null}
          {brainstormError && <p role="alert" className="mt-3 rounded-xl bg-[#FFF0EC] p-3 text-xs text-[#9A4B42]">{brainstormError}</p>}
          {brainstormResult && !activeResult && <p className="mt-3 rounded-xl bg-[#FFF7E8] p-3 text-xs text-[#7C6238]">Thông tin đã thay đổi. Hãy để Emsen gợi ý lại để các góc bám đúng nội dung mới.</p>}

          {activeResult && <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {activeResult.concepts.map((concept) => {
              const chosen = concept.id === selectedConceptId;
              const recommended = concept.id === activeResult.recommendedId;
              return <article key={concept.id} className={`rounded-2xl border bg-white p-3 transition ${chosen ? "border-[#72B65D] ring-2 ring-[#DDEED6]" : "border-[#E4E8DF]"}`}>
                <button type="button" onClick={() => setSelectedConceptId(concept.id)} className="w-full text-left">
                  <div className="flex items-center gap-2"><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${chosen ? "border-[#72B65D] bg-[#72B65D] text-white" : "border-[#CCD8C8] text-transparent"}`}><Check size={13} /></span><strong className="min-w-0 flex-1 text-xs text-[#31583A]">{concept.label}</strong>{recommended && <span className="rounded-full bg-[#FFF0EC] px-2 py-1 text-[9px] font-bold text-[#A15B55]">Emsen đề xuất</span>}</div>
                  <p className="mt-2 text-sm font-bold leading-5 text-[#284D31]">“{concept.hook}”</p>
                  <p className="mt-2 text-[11px] leading-5 text-[#748A74]"><strong className="text-[#5D6F5D]">Điểm căng:</strong> {concept.tension}</p>
                </button>
                <details className="mt-2 border-t border-[#EFE8E2] pt-2"><summary className="cursor-pointer text-[10px] font-bold text-[#3F8240]">Xem hướng phát triển</summary><div className="mt-2 space-y-1.5 text-[11px] leading-5 text-[#748A74]"><p>{concept.development}</p><p><strong className="text-[#557058]">Emsen muốn hỏi:</strong> {concept.creatorPrompt}</p><p><strong className="text-[#557058]">Vì sao hợp với bạn:</strong> {concept.whyItFits}</p></div></details>
              </article>;
            })}
          </div>}
        </section>
      )}

      <div className="mt-5 flex justify-end">
        <button type="button" disabled={!validSource || !validDuration || busy || brainstorming || (useAi && (!aiConfigured || !selectedConcept))} onClick={submit} className="inline-flex items-center gap-2 rounded-xl bg-[#4E8052] px-5 py-3 text-sm font-bold text-white disabled:opacity-40">{busy && <LoaderCircle size={16} className="animate-spin" />}{useAi ? "Phát triển góc đã chọn" : "Mở trang viết"}</button>
      </div>
      {busy ? (
        <div className="mt-4">
          <AiProgressStatus label="Emsen đang phát triển kịch bản đầu tiên" />
        </div>
      ) : null}
    </section>
  );
}
