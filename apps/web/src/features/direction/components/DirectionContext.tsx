import type { DirectionStateDto } from "@creator-flow/contracts";
import { Dna, Leaf } from "lucide-react";

export function DirectionContext({ state, onOpenDna }: { state: DirectionStateDto; onOpenDna: () => void }) {
  const { profile, learning } = state.creatorDna;
  return (
    <aside className="rounded-[24px] border border-[#DCE7D6] bg-[#F6FAF3] p-5">
      <div className="flex items-center gap-2 text-[#487D50]"><Dna size={19} /><h3 className="font-bold">Gốc rễ của định hướng</h3></div>
      <p className="mt-2 text-xs leading-5 text-[#75856E]">emsen tham khảo Creator DNA và những điều đã học từ bạn.</p>
      <dl className="mt-5 space-y-4 text-sm">
        {[["Chủ đề", profile.niche], ["Nền tảng", profile.platforms.join(" · ")], ["Chất giọng", profile.toneTraits.join(" · ")], ["Khán giả", profile.audience], ["Điều cần tránh", profile.boundaries]].map(([label, value]) => <div key={label}><dt className="text-[11px] font-bold uppercase tracking-wide text-[#75856E]">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words leading-6">{value || "Chưa bổ sung"}</dd></div>)}
      </dl>
      <p className="mt-5 flex items-center gap-2 text-xs text-[#487D50]"><Leaf size={15} /> {learning.signals.length} tín hiệu đã tích lũy</p>
      <button type="button" onClick={onOpenDna} className="mt-4 w-full rounded-xl border border-[#CCDCC6] bg-white px-3 py-2.5 text-xs font-bold text-[#487D50] hover:bg-[#EFF6EB]">Bổ sung Creator DNA</button>
    </aside>
  );
}
