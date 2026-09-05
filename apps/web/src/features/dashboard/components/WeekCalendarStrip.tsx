import { weeklyEvents, type WeekDay } from "../dashboardData";

type WeekCalendarStripProps = {
  days: WeekDay[];
  selectedDay: number | null;
  onSelectDay: (dayIndex: number) => void;
};

export function WeekCalendarStrip({
  days,
  selectedDay,
  onSelectDay,
}: WeekCalendarStripProps) {
  return (
    <div className="flow-scrollbar mt-6 overflow-x-auto pb-2">
      <div className="grid min-w-[700px] grid-cols-7 gap-2">
        {days.map((day) => {
          const eventCount = weeklyEvents.filter(
            (event) => event.dayIndex === day.index,
          ).length;
          const active = selectedDay === day.index;

          return (
            <button
              aria-label={`Xem lịch ${day.label} ngày ${day.date.getDate()}`}
              aria-pressed={active}
              className={`relative min-h-[94px] rounded-2xl border px-3 py-3 text-left transition ${
                active
                  ? "border-[#46A82D] bg-gradient-to-br from-[#46A82D] to-[#82C95B] text-white shadow-[0_10px_24px_rgba(70,168,45,0.2)]"
                  : day.isToday
                    ? "border-[#B8DCAB] bg-[#FFF4F1] text-[#31583A]"
                    : "border-[#F0DDDA] bg-[#FFFDF8] text-[#31583A] hover:-translate-y-0.5 hover:border-[#B8DCAB] hover:bg-[#F7FBF3]"
              }`}
              key={day.index}
              onClick={() => onSelectDay(day.index)}
              type="button"
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-[11px] font-bold uppercase tracking-[0.12em] ${
                    active ? "text-white/75" : "text-[#A58F8B]"
                  }`}
                >
                  {day.label}
                </span>
                {day.isToday ? (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                      active ? "bg-white/18 text-white" : "bg-[#FFE7E4] text-[#46A82D]"
                    }`}
                  >
                    Hôm nay
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-2xl font-bold tracking-[-0.04em]">
                {day.date.getDate()}
              </p>
              <div className="mt-2 flex items-center gap-1">
                {Array.from({ length: Math.min(eventCount, 4) }, (_, dotIndex) => (
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      active ? "bg-white/80" : "bg-[#82C95B]"
                    }`}
                    key={dotIndex}
                  />
                ))}
                {eventCount === 0 ? (
                  <span
                    className={`text-[10px] ${
                      active ? "text-white/65" : "text-[#C2ADA9]"
                    }`}
                  >
                    Trống
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
