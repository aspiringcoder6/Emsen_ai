import { LoaderCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const progressSteps = [
  { at: 0, detail: "Đang đọc yêu cầu và phần bạn muốn giữ lại…" },
  { at: 28, detail: "Đang chọn cấu trúc và nhịp phù hợp…" },
  { at: 58, detail: "Đang viết và kiểm tra độ dài lời thoại…" },
  { at: 82, detail: "Đang hoàn thiện bản đề xuất…" },
];

export function AiProgressStatus({
  label = "Emsen đang hoàn thiện",
  compact = false,
}: {
  label?: string;
  compact?: boolean;
}) {
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 92) return current;
        const increment = current < 40 ? 7 : current < 72 ? 4 : 2;
        return Math.min(92, current + increment);
      });
    }, 700);
    return () => window.clearInterval(timer);
  }, []);

  const detail = useMemo(
    () => [...progressSteps].reverse().find((step) => progress >= step.at)?.detail,
    [progress],
  );

  return (
    <div
      aria-live="polite"
      aria-busy="true"
      className={`rounded-2xl border border-[#CFE3C8] bg-[#F4FAF0] ${compact ? "p-3" : "p-4"}`}
      role="status"
    >
      <div className="flex items-center gap-3">
        <LoaderCircle className="shrink-0 animate-spin text-[#46A82D]" size={compact ? 17 : 20} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-xs font-bold text-[#31583A]">{label}</p>
            <span className="shrink-0 text-xs font-black tabular-nums text-[#3F8240]">
              {progress}%
            </span>
          </div>
          {!compact ? <p className="mt-1 text-[11px] text-[#748A74]">{detail}</p> : null}
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#DCEAD6]">
            <span
              className="block h-full rounded-full bg-gradient-to-r from-[#46A82D] to-[#82C95B] transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
