import { useEffect, useMemo, useState } from "react";
import type { VideoCutAction, VideoCutDraftDto } from "@creator-flow/contracts";
import {
  Check,
  Clock3,
  Eye,
  EyeOff,
  LoaderCircle,
  PlayCircle,
  RotateCcw,
  Save,
  Scissors,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

function timestamp(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

function duration(seconds: number) {
  return seconds >= 60
    ? `${Math.floor(seconds / 60)}p ${Math.round(seconds % 60)}s`
    : `${Math.round(seconds)} giây`;
}

export function SmartCutEditor({
  canRegenerate,
  cutDraft,
  onRegenerate,
  onCreatePreview,
  onSave,
  previewAvailable,
  previewCurrent,
  previewing,
  regenerating,
  targetDurationSeconds,
}: {
  canRegenerate: boolean;
  cutDraft: VideoCutDraftDto;
  onCreatePreview: (decisions: Array<{ action: VideoCutAction; id: string }>) => Promise<void>;
  onRegenerate: () => Promise<void>;
  onSave: (
    decisions: Array<{ action: VideoCutAction; id: string }>,
    status: VideoCutDraftDto["status"],
  ) => Promise<void>;
  regenerating: boolean;
  previewAvailable: boolean;
  previewCurrent: boolean;
  previewing: boolean;
  targetDurationSeconds: number;
}) {
  const [decisions, setDecisions] = useState(cutDraft.decisions);
  const [saving, setSaving] = useState<VideoCutDraftDto["status"] | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setDecisions(cutDraft.decisions);
    setError("");
  }, [cutDraft.revision, cutDraft.decisions]);

  const changed = useMemo(
    () => decisions.some((item, index) => item.action !== cutDraft.decisions[index]?.action),
    [cutDraft.decisions, decisions],
  );
  const removedSeconds = decisions.reduce(
    (total, item) => total + (item.action === "cut" ? item.endSeconds - item.startSeconds : 0),
    0,
  );
  const estimatedSeconds = Math.max(0, cutDraft.originalDurationSeconds - removedSeconds);
  const cutCount = decisions.filter((item) => item.action === "cut").length;
  const previewRequired = cutCount > 0 && (!previewCurrent || changed);
  const suggestedCutCount = decisions.filter((item) => item.suggestedAction === "cut").length;
  const visibleDecisions = showAll
    ? decisions
    : decisions.filter((item) => item.suggestedAction === "cut" || item.action !== item.suggestedAction);

  const setAction = (id: string, action: VideoCutAction) => {
    setDecisions((current) => current.map((item) => item.id === id ? { ...item, action } : item));
  };
  const useSuggestions = () => {
    setDecisions((current) => current.map((item) => ({ ...item, action: item.suggestedAction })));
  };
  const keepEverything = () => {
    setDecisions((current) => current.map((item) => ({ ...item, action: "keep" as const })));
  };
  const save = async (status: VideoCutDraftDto["status"]) => {
    if (status === "approved" && !decisions.some((item) => item.kind === "speech" && item.action === "keep")) {
      setError("Hãy giữ lại ít nhất một đoạn lời nói trước khi duyệt.");
      return;
    }
    setSaving(status);
    setError("");
    try {
      await onSave(decisions.map(({ action, id }) => ({ action, id })), status);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Chưa lưu được bản Smart Cut.");
    } finally {
      setSaving(null);
    }
  };
  const createPreview = async () => {
    setError("");
    try {
      await onCreatePreview(decisions.map(({ action, id }) => ({ action, id })));
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "Chưa tạo được bản xem thử.");
    }
  };

  if (cutDraft.stale) {
    return (
      <section className="rounded-[24px] border border-[#E8CFA8] bg-[#FFF9ED] p-5 shadow-[0_12px_32px_rgba(92,74,44,0.06)]">
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#FFF0CF] text-[#9A6A24]"><RotateCcw size={21} /></span>
          <div className="min-w-[220px] flex-1"><p className="text-sm font-bold text-[#735224]">Lời thoại đã thay đổi</p><p className="mt-1 text-xs leading-5 text-[#8E7046]">Bản cắt cũ vẫn được giữ, nhưng Emsen cần phân tích lại để các điểm nối khớp với lời thoại mới.</p></div>
          <button type="button" disabled={!canRegenerate || regenerating} onClick={() => void onRegenerate()} className="inline-flex items-center gap-2 rounded-xl bg-[#8B672F] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{regenerating ? <LoaderCircle size={16} className="animate-spin" /> : <Sparkles size={16} />} {canRegenerate ? "Tạo lại gợi ý" : "Duyệt lời thoại trước"}</button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[24px] border border-[#DCCFDC] bg-white p-4 shadow-[0_12px_32px_rgba(73,58,70,0.06)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-[#4F3E4C]"><Scissors size={17} className="text-[#8A5D80]" /> Smart Cut</p>
          <p className="mt-1 text-xs leading-5 text-[#81727D]">Emsen chỉ đề xuất. Video gốc không bị thay đổi và bạn có thể giữ lại bất kỳ đoạn nào.</p>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-[10px] font-bold ${cutDraft.status === "approved" ? "bg-[#EAF6E4] text-[#3F8240]" : "bg-[#F3EAF1] text-[#72506B]"}`}>{cutDraft.status === "approved" ? "Đã duyệt" : "Bản nháp"}</span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-2xl bg-[#F7F7F3] p-3"><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#899189]">Video gốc</p><p className="mt-1 text-lg font-bold text-[#405A44]">{duration(cutDraft.originalDurationSeconds)}</p></div>
        <div className="rounded-2xl bg-[#F2F9EE] p-3"><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#6D8B69]">Sau khi cắt</p><p className="mt-1 text-lg font-bold text-[#3F8240]">≈ {duration(estimatedSeconds)}</p></div>
        <div className="rounded-2xl bg-[#F8F4F7] p-3"><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8B7486]">Mục tiêu tham khảo</p><p className="mt-1 text-lg font-bold text-[#72506B]">{duration(targetDurationSeconds)}</p></div>
      </div>

      <div className="mt-4 rounded-2xl border border-[#ECE5EA] bg-[#FBFAFB] p-3">
        <div className="relative h-9 overflow-hidden rounded-xl bg-[#E6EEE3]" aria-label="Timeline Smart Cut">
          {decisions.map((item) => {
            const left = cutDraft.originalDurationSeconds ? item.startSeconds / cutDraft.originalDurationSeconds * 100 : 0;
            const width = cutDraft.originalDurationSeconds ? (item.endSeconds - item.startSeconds) / cutDraft.originalDurationSeconds * 100 : 0;
            return <span key={item.id} title={`${timestamp(item.startSeconds)}–${timestamp(item.endSeconds)} · ${item.action === "cut" ? "Cắt" : "Giữ"}`} className={`absolute inset-y-0 border-x border-white/70 ${item.action === "cut" ? "bg-[#EFA892]" : item.kind === "pause" ? "bg-[#C9D8C5]" : "bg-[#79B76E]"}`} style={{ left: `${left}%`, width: `${Math.max(width, 0.35)}%` }} />;
          })}
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#81727D]"><span><b className="text-[#4A7548]">Xanh:</b> giữ · <b className="text-[#A65E4C]">Cam:</b> đề xuất cắt</span><span>{cutCount} đoạn cắt · bớt khoảng {duration(removedSeconds)}</span></div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] text-[#67806A]"><ShieldCheck size={14} /> Điểm cắt có nhịp đệm; đoạn chưa chắc chắn được giữ mặc định.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={regenerating || previewing} onClick={keepEverything} className="rounded-xl border border-[#D8DED5] px-3 py-2 text-xs font-bold text-[#637264] disabled:opacity-40">Giữ tất cả</button>
          <button type="button" disabled={regenerating || previewing} onClick={useSuggestions} className="rounded-xl border border-[#D8C8D5] px-3 py-2 text-xs font-bold text-[#72506B] disabled:opacity-40">Theo gợi ý AI</button>
          <button type="button" onClick={() => setShowAll((value) => !value)} className="rounded-xl bg-[#F4F4F0] px-3 py-2 text-xs font-bold text-[#647064]">{showAll ? "Chỉ xem đề xuất cắt" : `Xem tất cả (${decisions.length})`}</button>
        </div>
      </div>

      <div className="mt-3 max-h-[560px] space-y-2 overflow-y-auto pr-1">
        {visibleDecisions.length ? visibleDecisions.map((item) => (
          <article key={item.id} className={`rounded-2xl border p-3 transition ${item.action === "cut" ? "border-[#EBC5B9] bg-[#FFF7F4]" : "border-[#D9E8D4] bg-[#FAFDF8]"}`}>
            <div className="flex flex-wrap items-start gap-3">
              <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-[11px] font-bold ${item.action === "cut" ? "bg-[#FBE2DA] text-[#9A5544]" : "bg-[#EAF6E4] text-[#3F8240]"}`}><Clock3 size={12} /> {timestamp(item.startSeconds)}–{timestamp(item.endSeconds)}</span>
              <div className="min-w-[180px] flex-1"><p className="text-sm leading-6 text-[#3D5141]">{item.kind === "pause" ? <em className="text-[#7E887E]">{item.text}</em> : item.text}</p><p className="mt-1 text-[11px] leading-5 text-[#8A7885]">{item.reason}</p></div>
              <button type="button" disabled={regenerating || previewing} aria-pressed={item.action === "keep"} onClick={() => setAction(item.id, item.action === "keep" ? "cut" : "keep")} className={`inline-flex min-w-[104px] items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold disabled:opacity-40 ${item.action === "keep" ? "bg-[#E5F3DF] text-[#39763C]" : "bg-[#F6D9D0] text-[#96513F]"}`}>{item.action === "keep" ? <Eye size={14} /> : <EyeOff size={14} />}{item.action === "keep" ? "Giữ lại" : "Bỏ đoạn"}</button>
            </div>
          </article>
        )) : <div className="rounded-2xl bg-[#F5F8F3] p-5 text-center text-sm text-[#6F7F70]">Emsen không thấy đoạn nào đủ an toàn để tự đề xuất cắt. Bạn có thể mở “Xem tất cả” để tự điều chỉnh.</div>}
      </div>

      {error && <p role="alert" className="mt-3 rounded-xl bg-[#FFF0EC] px-3 py-2.5 text-xs text-[#9A4B42]">{error}</p>}
      {previewRequired && <p className="mt-3 rounded-xl bg-[#EEF6FB] px-3 py-2.5 text-xs leading-5 text-[#496D8B]">Hãy tạo và nghe bản xem thử mới nhất trước khi duyệt. Mỗi lần đổi lựa chọn giữ/cắt, preview cần được tạo lại.</p>}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#EEE5EC] pt-4">
        <button type="button" disabled={!canRegenerate || regenerating || Boolean(saving)} onClick={() => void onRegenerate()} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#806078] disabled:opacity-50">{regenerating ? <LoaderCircle size={14} className="animate-spin" /> : <Sparkles size={14} />} Tạo lại gợi ý</button>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={regenerating || previewing || Boolean(saving)} onClick={() => void createPreview()} className="inline-flex items-center gap-1.5 rounded-xl bg-[#4E8052] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40">{previewing ? <LoaderCircle size={14} className="animate-spin" /> : <PlayCircle size={15} />} {previewAvailable ? "Tạo lại preview" : "Tạo bản xem thử"}</button>
          {changed && <button type="button" disabled={regenerating || previewing || Boolean(saving)} onClick={() => setDecisions(cutDraft.decisions)} className="inline-flex items-center gap-1.5 rounded-xl border border-[#DED5DC] px-3 py-2.5 text-xs font-bold text-[#786A75] disabled:opacity-40"><RotateCcw size={14} /> Hoàn tác</button>}
          <button type="button" disabled={regenerating || previewing || Boolean(saving) || (!changed && cutDraft.status === "draft")} onClick={() => void save("draft")} className="inline-flex items-center gap-1.5 rounded-xl border border-[#CDBDCA] px-4 py-2.5 text-xs font-bold text-[#72506B] disabled:opacity-40">{saving === "draft" ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />} Lưu nháp</button>
          <button type="button" title={previewRequired ? "Hãy tạo và nghe preview mới nhất trước" : undefined} disabled={regenerating || previewing || previewRequired || Boolean(saving) || (!changed && cutDraft.status === "approved")} onClick={() => void save("approved")} className="inline-flex items-center gap-1.5 rounded-xl bg-[#72506B] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40">{saving === "approved" ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={15} />} Duyệt bản cắt</button>
        </div>
      </div>
      <p className="mt-3 text-[10px] leading-4 text-[#9A8E97]">{suggestedCutCount} đề xuất cắt được tạo từ transcript. Khi render, âm thanh sẽ được nối mềm để tránh tiếng “cụp”.</p>
    </section>
  );
}
