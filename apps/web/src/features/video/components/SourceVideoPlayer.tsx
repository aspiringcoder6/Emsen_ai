import { useEffect, useState } from "react";
import type { VideoAssetDto, VideoPlaybackTicketDto } from "@creator-flow/contracts";
import { LoaderCircle, Play, RefreshCw, Video } from "lucide-react";
import { getVideoPlayback } from "../videoApi";

export function SourceVideoPlayer({
  assets,
  projectId,
}: {
  assets: VideoAssetDto[];
  projectId: string;
}) {
  const [tickets, setTickets] = useState<VideoPlaybackTicketDto[]>([]);
  const [selectedId, setSelectedId] = useState(assets[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setTickets([]);
    setSelectedId(assets[0]?.id ?? "");
    setError("");
  }, [projectId]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const next = await Promise.all(assets.map((asset) => getVideoPlayback(projectId, asset.id)));
      setTickets(next);
      setSelectedId((current) => next.some((ticket) => ticket.assetId === current) ? current : next[0]?.assetId ?? "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Chưa mở lại được video thô.");
    } finally {
      setLoading(false);
    }
  };

  const selectedTicket = tickets.find((ticket) => ticket.assetId === selectedId);
  const selectedAsset = assets.find((asset) => asset.id === selectedId);

  return (
    <section className="rounded-[24px] border border-[#DDEBD6] bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="flex items-center gap-2 text-sm font-bold text-[#284D31]"><Video size={17} className="text-[#3F8240]" /> Nghe lại video gốc</p><p className="mt-1 text-xs text-[#748A74]">Phát từng clip để đối chiếu khi sửa lời thoại.</p></div>
        {tickets.length > 0 && <button type="button" disabled={loading} onClick={() => void load()} className="inline-flex items-center gap-1.5 rounded-xl border border-[#D7E3D3] px-3 py-2 text-xs font-bold text-[#5A765D] disabled:opacity-50"><RefreshCw size={14} /> Làm mới liên kết</button>}
      </div>

      {!tickets.length ? <button type="button" disabled={loading || !assets.length} onClick={() => void load()} className="mt-4 flex w-full items-center justify-center gap-3 rounded-2xl border border-[#D5E5CF] bg-[#F6FBF3] px-5 py-6 text-sm font-bold text-[#3F7145] disabled:opacity-50">{loading ? <LoaderCircle size={21} className="animate-spin" /> : <span className="grid h-10 w-10 place-items-center rounded-full bg-[#4E8052] text-white"><Play size={17} fill="currentColor" /></span>} {loading ? "Đang mở video…" : "Mở video để kiểm tra lời thoại"}</button> : <div className="mt-4 grid items-start gap-3 md:grid-cols-[minmax(220px,0.72fr)_minmax(280px,1.28fr)]">
        <div className="space-y-2">{assets.map((asset, index) => <button type="button" key={asset.id} onClick={() => setSelectedId(asset.id)} className={`w-full rounded-xl border px-3 py-2.5 text-left ${asset.id === selectedId ? "border-[#91BD82] bg-[#F0F8EC]" : "border-[#E3EBDF] bg-white"}`}><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#879487]">Clip {index + 1}</p><p className="mt-1 truncate text-xs font-bold text-[#31583A]">{asset.fileName}</p></button>)}</div>
        {selectedTicket && <div className="overflow-hidden rounded-2xl bg-black"><video key={selectedTicket.playbackUrl} src={selectedTicket.playbackUrl} controls playsInline preload="metadata" className="mx-auto aspect-[9/16] max-h-[480px] w-full bg-black object-contain" /><p className="truncate bg-[#172019] px-3 py-2 text-center text-[10px] text-white/60">{selectedAsset?.fileName}</p></div>}
      </div>}
      {error && <p role="alert" className="mt-3 rounded-xl bg-[#FFF0EC] px-3 py-2.5 text-xs text-[#9A4B42]">{error}</p>}
    </section>
  );
}
