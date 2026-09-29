import { useEffect, useState } from "react";
import type { VideoFinalOutputDto, VideoPlaybackTicketDto } from "@creator-flow/contracts";
import { AlertTriangle, CheckCircle2, Download, LoaderCircle, RefreshCw } from "lucide-react";
import { getVideoDownload, getVideoPlayback } from "../videoApi";

function duration(seconds: number) {
  const rounded = Math.max(0, Math.round(seconds));
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
}

function fileSize(bytes: number) {
  if (bytes < 1_000_000) return `${Math.max(1, Math.round(bytes / 1_000))} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

export function FinalVideoPlayer({ output, projectId }: { output: VideoFinalOutputDto; projectId: string }) {
  const [ticket, setTicket] = useState<VideoPlaybackTicketDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setTicket(await getVideoPlayback(projectId, output.assetId));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Chưa mở được video hoàn chỉnh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setTicket(null);
    void load();
  }, [output.assetId, projectId]);

  const download = async () => {
    setDownloading(true);
    setError("");
    try {
      const downloadTicket = await getVideoDownload(projectId, output.assetId);
      const anchor = document.createElement("a");
      anchor.href = downloadTicket.downloadUrl;
      anchor.download = downloadTicket.fileName;
      anchor.rel = "noopener";
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Chưa tải được video hoàn chỉnh.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className={`rounded-[24px] border p-4 shadow-[0_12px_32px_rgba(55,85,57,0.06)] sm:p-5 ${output.stale ? "border-[#E8CFA8] bg-[#FFF9ED]" : "border-[#BFDDB5] bg-gradient-to-br from-[#F2F9EE] to-white"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-[#31583A]">{output.stale ? <AlertTriangle size={17} className="text-[#A16E25]" /> : <CheckCircle2 size={17} className="text-[#4E8052]" />} {output.stale ? "Bản xuất trước" : "Video đã sẵn sàng"}</p>
          <p className="mt-1 text-xs leading-5 text-[#748A74]">{duration(output.durationSeconds)} · 720 × 1280 · {fileSize(output.sizeBytes)}</p>
        </div>
        <div className="flex items-center gap-2">
          {ticket && <button type="button" disabled={loading} onClick={() => void load()} className="inline-flex items-center gap-1.5 rounded-xl border border-[#D7E3D3] px-3 py-2 text-xs font-bold text-[#5A765D] disabled:opacity-50"><RefreshCw size={14} /> Làm mới</button>}
          <button type="button" disabled={downloading} onClick={() => void download()} className="inline-flex items-center gap-1.5 rounded-xl bg-[#4E8052] px-3.5 py-2 text-xs font-bold text-white disabled:opacity-60">{downloading ? <LoaderCircle size={14} className="animate-spin" /> : <Download size={14} />} Tải MP4</button>
        </div>
      </div>
      {output.stale && <p className="mt-3 rounded-xl bg-[#FFF0CF] px-3 py-2.5 text-xs leading-5 text-[#84612D]">Bạn đã đổi Smart Cut hoặc kiểu caption. Bản này vẫn tải được; hãy xuất bản mới để áp dụng thay đổi.</p>}
      <div className="mt-4 overflow-hidden rounded-2xl bg-[#101611]">
        {ticket ? <video key={ticket.playbackUrl} src={ticket.playbackUrl} controls playsInline preload="metadata" className="mx-auto aspect-[9/16] max-h-[680px] w-full bg-black object-contain" /> : <div className="grid min-h-[320px] place-items-center text-sm font-bold text-white/80">{loading ? <span className="flex items-center gap-2"><LoaderCircle size={20} className="animate-spin" /> Đang mở video…</span> : <button type="button" onClick={() => void load()} className="rounded-xl bg-white/10 px-4 py-2">Mở video</button>}</div>}
      </div>
      {error && <p role="alert" className="mt-3 rounded-xl bg-[#FFF0EC] px-3 py-2.5 text-xs text-[#9A4B42]">{error}</p>}
    </section>
  );
}
