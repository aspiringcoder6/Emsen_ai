import { useEffect, useMemo, useState } from "react";
import type { VideoTranscriptDto } from "@creator-flow/contracts";
import { Check, Clock3, FilePenLine, LoaderCircle, RotateCcw, Save } from "lucide-react";

function formatTimestamp(seconds: number) {
  const wholeSeconds = Math.max(0, Math.floor(seconds));
  return `${Math.floor(wholeSeconds / 60)}:${String(wholeSeconds % 60).padStart(2, "0")}`;
}

export function TranscriptEditor({
  transcript,
  onSave,
}: {
  transcript: VideoTranscriptDto;
  onSave: (segments: VideoTranscriptDto["segments"], status: VideoTranscriptDto["status"]) => Promise<void>;
}) {
  const [segments, setSegments] = useState(transcript.segments);
  const [saving, setSaving] = useState<"draft" | "approved" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setSegments(transcript.segments);
    setError("");
  }, [transcript.revision, transcript.segments]);

  const changed = useMemo(
    () => JSON.stringify(segments) !== JSON.stringify(transcript.segments),
    [segments, transcript.segments],
  );
  const wordCount = segments.reduce((total, segment) => total + segment.text.trim().split(/\s+/).filter(Boolean).length, 0);

  const save = async (status: VideoTranscriptDto["status"]) => {
    if (segments.some((segment) => !segment.text.trim())) {
      setError("Mỗi mốc thời gian cần có lời thoại. Hãy điền nội dung hoặc gộp đoạn trước khi lưu.");
      return;
    }
    setSaving(status);
    setError("");
    try {
      await onSave(segments.map((segment) => ({ ...segment, text: segment.text.trim() })), status);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Chưa lưu được lời thoại.");
    } finally {
      setSaving(null);
    }
  };

  return (
    <section className="rounded-[24px] border border-[#DCCFDC] bg-white p-4 shadow-[0_12px_32px_rgba(73,58,70,0.06)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-[#4F3E4C]"><FilePenLine size={17} className="text-[#8A5D80]" /> Lời thoại từ video</p>
          <p className="mt-1 text-xs leading-5 text-[#81727D]">Nghe lại video rồi sửa những từ Emsen nhận chưa đúng. Timestamp đã được giữ sẵn.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1.5 text-[10px] font-bold ${transcript.status === "approved" ? "bg-[#EAF6E4] text-[#3F8240]" : "bg-[#F3EAF1] text-[#72506B]"}`}>{transcript.status === "approved" ? "Đã duyệt" : "Bản nháp"}</span>
          <span className="rounded-full bg-[#F5F5F1] px-3 py-1.5 text-[10px] font-bold text-[#738073]">{segments.length} đoạn · {wordCount} từ</span>
        </div>
      </div>

      {segments.length ? <div className="mt-4 max-h-[560px] space-y-2 overflow-y-auto pr-1">
        {segments.map((segment, index) => (
          <div key={segment.id} className="grid gap-2 rounded-2xl border border-[#ECE3EA] bg-[#FFFDFE] p-3 sm:grid-cols-[116px_minmax(0,1fr)]">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#F1E8EF] px-2.5 py-1.5 font-mono text-[11px] font-bold text-[#72506B]"><Clock3 size={12} /> {formatTimestamp(segment.startSeconds)}–{formatTimestamp(segment.endSeconds)}</span>
              <p className="mt-2 pl-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#A296A0]">Đoạn {index + 1}</p>
            </div>
            <textarea
              aria-label={`Lời thoại đoạn ${index + 1}`}
              rows={2}
              maxLength={2_000}
              value={segment.text}
              onChange={(event) => setSegments((current) => current.map((item) => item.id === segment.id ? { ...item, text: event.target.value } : item))}
              className="min-h-[72px] w-full resize-y rounded-xl border border-[#E6DDE4] bg-white px-3 py-2.5 text-sm leading-6 text-[#3D5141] outline-none transition focus:border-[#A8769D] focus:ring-2 focus:ring-[#E9DDE7]"
            />
          </div>
        ))}
      </div> : <div className="mt-4 rounded-2xl bg-[#F8F5F7] p-5 text-center text-sm text-[#81727D]">Video không có lời nói rõ để tạo transcript.</div>}

      {error && <p role="alert" className="mt-3 rounded-xl bg-[#FFF0EC] px-3 py-2.5 text-xs text-[#9A4B42]">{error}</p>}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#EEE5EC] pt-4">
        <p className="text-[11px] text-[#91838E]">AI có thể nghe nhầm tên riêng hoặc tiếng nói nhỏ — bạn luôn là người duyệt cuối.</p>
        <div className="flex flex-wrap gap-2">
          {changed && <button type="button" disabled={Boolean(saving)} onClick={() => setSegments(transcript.segments)} className="inline-flex items-center gap-1.5 rounded-xl border border-[#DED5DC] px-3 py-2.5 text-xs font-bold text-[#786A75]"><RotateCcw size={14} /> Hoàn tác</button>}
          <button type="button" disabled={Boolean(saving) || !segments.length || (!changed && transcript.status === "draft")} onClick={() => void save("draft")} className="inline-flex items-center gap-1.5 rounded-xl border border-[#CDBDCA] px-4 py-2.5 text-xs font-bold text-[#72506B] disabled:opacity-40">{saving === "draft" ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />} Lưu bản nháp</button>
          <button type="button" disabled={Boolean(saving) || !segments.length || (!changed && transcript.status === "approved")} onClick={() => void save("approved")} className="inline-flex items-center gap-1.5 rounded-xl bg-[#72506B] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40">{saving === "approved" ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={15} />} Duyệt lời thoại</button>
        </div>
      </div>
    </section>
  );
}
