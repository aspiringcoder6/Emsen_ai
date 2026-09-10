import { CalendarDays, Check, Sparkles, Video } from "lucide-react";
import { EmsenAvatar } from "../../../components/branding/EmsenAvatar";
import { planDate } from "../contentPlanUtils";

const dayLabels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export function WeeklyAvailability({
  weekStart,
  availableDays,
  weeklyVideoTarget,
  disabled,
  onAvailableDaysChange,
  onTargetChange,
}: {
  weekStart: string;
  availableDays: number[] | null;
  weeklyVideoTarget: number | null;
  disabled: boolean;
  onAvailableDaysChange: (value: number[] | null) => void;
  onTargetChange: (value: number | null) => void;
}) {
  const maxTarget = 7;
  const toggleDay = (day: number) => {
    const current = availableDays ?? [];
    if (current.includes(day)) {
      if (current.length === 1) return;
      onAvailableDaysChange(current.filter((value) => value !== day));
    } else {
      onAvailableDaysChange([...current, day].sort((a, b) => a - b));
    }
  };

  return (
    <section className="rounded-[24px] border border-[#D8E9D2] bg-gradient-to-br from-[#F4FAF0] via-white to-[#FFF7F3] p-5 sm:p-6">
      <div className="flex items-center gap-4">
        <EmsenAvatar activity="sitting" className="h-16 w-16 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#3F8240]"><CalendarDays size={15} /> Lịch quay của bạn</p>
          <h3 className="mt-1 text-lg font-bold text-[#284D31]">Tuần này bạn rảnh khi nào?</h3>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" disabled={disabled} aria-pressed={availableDays === null} onClick={() => onAvailableDaysChange(null)} className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition ${availableDays === null ? "border-[#72B65D] bg-[#31583A] text-white" : "border-[#D7E5D1] bg-white text-[#31583A]"}`}><Sparkles size={14} /> AI tự xếp lịch</button>
        <button type="button" disabled={disabled} aria-pressed={availableDays !== null} onClick={() => onAvailableDaysChange(availableDays ?? [0, 1, 2, 3, 4, 5, 6])} className={`rounded-xl border px-3.5 py-2.5 text-xs font-bold transition ${availableDays !== null ? "border-[#72B65D] bg-[#EAF6E4] text-[#31583A]" : "border-[#D7E5D1] bg-white text-[#31583A]"}`}>Tôi chọn ngày rảnh</button>
      </div>

      {availableDays !== null && (
        <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-7" aria-label="Chọn ngày có thể quay">
          {dayLabels.map((label, day) => {
            const selected = availableDays.includes(day);
            return <button type="button" key={label} disabled={disabled} aria-pressed={selected} onClick={() => toggleDay(day)} className={`relative rounded-2xl border px-2 py-3 text-center transition ${selected ? "border-[#72B65D] bg-[#EAF6E4] text-[#31583A]" : "border-[#E6DDD7] bg-white text-[#879487]"}`}>
              {selected && <span className="absolute right-1.5 top-1.5 grid h-4 w-4 place-items-center rounded-full bg-[#4E8052] text-white"><Check size={10} strokeWidth={3} /></span>}
              <strong className="block text-xs">{label}</strong>
              <small className="mt-1 block text-[10px]">{planDate(weekStart, day).split(",").at(-1)?.trim()}</small>
            </button>;
          })}
        </div>
      )}

      <div className="mt-5 border-t border-[#E2EDE0] pt-5">
        <p className="flex items-center gap-2 text-xs font-bold text-[#31583A]"><Video size={15} /> Mục tiêu video trong tuần</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={disabled} aria-pressed={weeklyVideoTarget === null} onClick={() => onTargetChange(null)} className={`rounded-xl border px-3.5 py-2 text-xs font-bold ${weeklyVideoTarget === null ? "border-[#72B65D] bg-[#31583A] text-white" : "border-[#D7E5D1] bg-white text-[#31583A]"}`}>AI tự quyết định</button>
          {Array.from({ length: maxTarget }, (_, index) => index + 1).map((count) => <button type="button" key={count} disabled={disabled} aria-pressed={weeklyVideoTarget === count} onClick={() => onTargetChange(count)} className={`grid h-9 w-9 place-items-center rounded-xl border text-xs font-bold ${weeklyVideoTarget === count ? "border-[#72B65D] bg-[#EAF6E4] text-[#31583A]" : "border-[#E6DDD7] bg-white text-[#748A74]"}`}>{count}</button>)}
        </div>
        <p className="mt-2 text-[11px] text-[#748A74]">{weeklyVideoTarget === null ? "Emsen sẽ chọn khối lượng vừa sức." : `${weeklyVideoTarget} video · có thể gom nhiều video vào cùng một ngày rảnh.`}</p>
      </div>
    </section>
  );
}
