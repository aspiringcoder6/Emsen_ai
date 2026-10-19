import { speechSlotStatus, speechUnitBudget, type SpeechTimingOptions } from "@creator-flow/contracts";

export function SpeechTimingHint({ value, seconds, options = {} }: { value: string; seconds: number; options?: SpeechTimingOptions }) {
  const timing = speechSlotStatus(value, seconds, options);
  if (!timing.count) return <p className="mt-1.5 text-[11px] leading-5 text-[#879487]">Không thoại · ghi rõ thao tác và âm thanh cần quay.</p>;
  const budget = speechUnitBudget(seconds, options);
  return <p className={`mt-1.5 text-[11px] leading-5 ${timing.status === "balanced" ? "text-[#748A74]" : "text-[#A06F3F]"}`}>
    {timing.count} {timing.unit} · đọc ước tính {timing.minSeconds}–{timing.maxSeconds}s / phân bổ {seconds}s
    {timing.status === "short" ? ` · Thoại còn ngắn, gợi ý ${budget.min}–${budget.max} ${timing.unit}; nếu giữ cảnh, hãy ghi rõ hành động cho thời gian còn lại.` : timing.status === "long" ? " · Thoại dài so với cảnh, cần rút gọn hoặc chia lại thời gian." : ""}
  </p>;
}
