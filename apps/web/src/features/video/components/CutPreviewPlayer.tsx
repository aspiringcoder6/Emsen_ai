import { useEffect, useState } from "react";
import type { VideoCutPreviewDto, VideoPlaybackTicketDto } from "@creator-flow/contracts";
import { AlertTriangle, LoaderCircle, Play, RefreshCw, Video } from "lucide-react";
import { getVideoPlayback } from "../videoApi";

function duration(seconds: number) {
  const rounded = Math.max(0, Math.round(seconds));
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
}

export function CutPreviewPlayer({
  preview,
  projectId,
}: {
  preview: VideoCutPreviewDto;
  projectId: string;
}) {
  const [ticket, setTicket] = useState<VideoPlaybackTicketDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setTicket(await getVideoPlayback(projectId, preview.assetId));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Chưa mở được bản preview.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setTicket(null);
    void load();
  }, [preview.assetId, projectId]);

  return (
    <section className={`rounded-[24px] border p-4 shadow-[0_12px_32px_rgba(55,85,57,0.06)] sm:p-5 ${preview.stale ? "border-[#E8CFA8] bg-[#FFF9ED]" : "border-[#CFE2C7] bg-white"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="flex items-center gap-2 text-sm font-bold text-[#31583A]"><Video size={17} className="text-[#4E8052]" /> Bản xem thử Smart Cut</p><p className="mt-1 text-xs leading-5 text-[#748A74]">Preview nhẹ {duration(preview.durationSeconds)} · âm thanh được làm mềm tại mỗi điểm nối.</p></div>
        <div className="flex items-center gap-2">
          {preview.stale && <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF0CF] px-2.5 py-1 text-[10px] font-bold text-[#94641F]"><AlertTriangle size={12} /> Bản cũ</span>}
          {ticket && <button type="button" disabled={loading} onClick={() => void load()} className="inline-flex items-center gap-1.5 rounded-xl border border-[#D7E3D3] px-3 py-2 text-xs font-bold text-[#5A765D] disabled:opacity-50"><RefreshCw size={14} /> Làm mới</button>}
        </div>
      </div>

      {preview.stale && <p className="mt-3 rounded-xl bg-[#FFF3D9] px-3 py-2.5 text-xs leading-5 text-[#84612D]">Bạn đã thay đổi lựa chọn giữ/cắt sau khi preview này được tạo. Hãy tạo bản xem thử mới trước khi duyệt.</p>}

      <div className="mt-4 overflow-hidden rounded-2xl bg-[#101611]">
        {ticket ? <video key={ticket.playbackUrl} src={ticket.playbackUrl} controls playsInline preload="metadata" className="mx-auto aspect-[9/16] max-h-[620px] w-full bg-black object-contain" /> : <button type="button" disabled={loading} onClick={() => void load()} className="grid min-h-[300px] w-full place-items-center text-sm font-bold text-white/80 disabled:opacity-60"><span className="flex flex-col items-center gap-3">{loading ? <LoaderCircle size={26} className="animate-spin" /> : <span className="grid h-12 w-12 place-items-center rounded-full bg-white/15"><Play size={20} fill="currentColor" /></span>}{loading ? "Đang mở preview…" : "Mở bản xem thử"}</span></button>}
      </div>
      {error && <p role="alert" className="mt-3 rounded-xl bg-[#FFF0EC] px-3 py-2.5 text-xs text-[#9A4B42]">{error}</p>}
      <p className="mt-3 text-[10px] leading-4 text-[#8C978C]">Đây là proxy 360×640 để duyệt nhanh; video xuất cuối sẽ dùng chất lượng cao hơn.</p>
    </section>
  );
}
