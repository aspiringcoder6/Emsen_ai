import type { DirectionStateDto } from "@creator-flow/contracts";
import { ChevronDown, Dna, Leaf } from "lucide-react";

export function DirectionContext({
  state,
  onOpenDna,
}: {
  onOpenDna: () => void;
  state: DirectionStateDto;
}) {
  const { profile, learning } = state.creatorDna;
  return (
    <details className="group rounded-[20px] border border-[#DCE7D6] bg-white">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#F0F7EB] text-[#487D50]">
          <Dna size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-[#284D31]">Creator DNA Emsen đang dùng</span>
          <span className="mt-1 block text-xs text-[#829782]">
            {profile.niche || "Chưa có chủ đề"} · {learning.signals.length} tín hiệu đã học
          </span>
        </span>
        <ChevronDown
          className="text-[#829782] transition-transform group-open:rotate-180"
          size={18}
        />
      </summary>
      <div className="border-t border-[#E8F0E4] px-5 pb-5 pt-4">
        <p className="text-xs leading-5 text-[#75856E]">
          Đây là thông tin nền giúp các đề xuất mang đúng chất riêng của bạn.
        </p>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          {[
            ["Chủ đề", profile.niche],
            ["Nền tảng", profile.platforms.join(" · ")],
            ["Chất giọng", profile.toneTraits.join(" · ")],
            ["Khán giả", profile.audience],
            ["Điều cần tránh", profile.boundaries],
          ].map(([label, value]) => (
            <div className="rounded-xl bg-[#F8FBF5] p-3" key={label}>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-[#75856E]">{label}</dt>
              <dd className="mt-1 whitespace-pre-wrap break-words text-xs leading-5">
                {value || "Chưa bổ sung"}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 flex items-center gap-2 text-xs text-[#487D50]">
          <Leaf size={15} /> {learning.signals.length} tín hiệu đã tích lũy
        </p>
        <button
          className="mt-4 rounded-xl border border-[#CCDCC6] bg-white px-4 py-2.5 text-xs font-bold text-[#487D50] hover:bg-[#EFF6EB]"
          onClick={onOpenDna}
          type="button"
        >
          Bổ sung Creator DNA
        </button>
      </div>
    </details>
  );
}
