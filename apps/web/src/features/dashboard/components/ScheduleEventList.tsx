import { CalendarDays } from "lucide-react";
import {
  type DashboardDestination,
  scheduleKindConfig,
  type ScheduleKind,
  type WeekDay,
  type WeekEvent,
} from "../dashboardData";

type ScheduleEventListProps = {
  activeFilter: "all" | ScheduleKind;
  days: WeekDay[];
  events: WeekEvent[];
  onClearDay: () => void;
  selectedDate: Date | null;
  onNavigate: (destination: DashboardDestination) => void;
};

export function ScheduleEventList({
  activeFilter,
  days,
  events,
  onClearDay,
  selectedDate,
  onNavigate,
}: ScheduleEventListProps) {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-[#284D31]">
            {selectedDate
              ? selectedDate.toLocaleDateString("vi-VN", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                })
              : `${
                  activeFilter === "all"
                    ? "Hoạt động"
                    : scheduleKindConfig[activeFilter].label
                } trong tuần`}
          </h3>
          <p className="mt-1 text-xs text-[#A58F8B]">{events.length} hoạt động phù hợp</p>
        </div>
        {selectedDate ? (
          <button
            className="text-xs font-bold text-[#46A82D] hover:underline"
            onClick={onClearDay}
            type="button"
          >
            Bỏ chọn ngày
          </button>
        ) : null}
      </div>

      <div className="mt-5 space-y-3">
        {events.map((event) => {
          const config = scheduleKindConfig[event.kind];
          const EventIcon = config.icon;
          const eventDay = days[event.dayIndex];

          return (
            <button
              type="button"
              onClick={() => onNavigate(event.destination)}
              className="flex w-full flex-col gap-4 rounded-2xl border border-[#F0DFDB] bg-white p-4 text-left transition hover:border-[#A8C99B] hover:shadow-[0_8px_24px_rgba(70,168,45,0.07)] sm:flex-row sm:items-center"
              key={`${event.dayIndex}-${event.time}-${event.title}`}
            >
              <div className="flex shrink-0 items-center gap-3 sm:w-[116px]">
                <div
                  className="grid h-10 w-10 place-items-center rounded-xl"
                  style={{ backgroundColor: config.surface, color: config.color }}
                >
                  <EventIcon size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#31583A]">{event.time}</p>
                  <p className="text-[10px] font-semibold text-[#94A794]">
                    {eventDay?.label} · {eventDay?.date.getDate()}
                  </p>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-full px-2 py-1 text-[10px] font-bold"
                    style={{ backgroundColor: config.surface, color: config.color }}
                  >
                    {config.label}
                  </span>
                </div>
                <h4 className="mt-2 text-sm font-bold text-[#31583A]">{event.title}</h4>
                <p className="mt-1 text-xs text-[#829782]">{event.subtitle}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-xs font-bold text-[#607760]">
                <span className="h-2 w-2 rounded-full bg-[#67B86F]" />
                {event.status}
              </div>
            </button>
          );
        })}

        {events.length === 0 ? (
          <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-[#E2CBC6] bg-white text-center">
            <div>
              <CalendarDays className="mx-auto text-[#9CB48E]" size={28} />
              <p className="mt-3 text-sm font-bold text-[#526952]">
                Chưa có hoạt động phù hợp
              </p>
              <p className="mt-1 text-xs text-[#94A794]">
                Chọn bộ lọc khác hoặc quay lại tổng quan tuần.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
