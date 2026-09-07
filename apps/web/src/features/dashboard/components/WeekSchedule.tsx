import { CalendarRange } from "lucide-react";
import { useState } from "react";
import {
  type DashboardDestination,
  type DashboardSnapshot,
  getCurrentWeek,
  getWeekEvents,
  type ScheduleKind,
} from "../dashboardData";
import { ProjectOverview } from "./ProjectOverview";
import { ScheduleEventList } from "./ScheduleEventList";
import { ScheduleFilters } from "./ScheduleFilters";
import { WeekCalendarStrip } from "./WeekCalendarStrip";

export function WeekSchedule({ compact, snapshot, onNavigate }: { compact: boolean; snapshot: DashboardSnapshot; onNavigate: (destination: DashboardDestination) => void }) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | ScheduleKind>("all");
  const { days } = getCurrentWeek();
  const events = getWeekEvents(snapshot, days);
  const firstDay = days[0];
  const lastDay = days[6];
  const scopedEvents = events.filter(
    (event) => selectedDay === null || event.dayIndex === selectedDay,
  );
  const visibleEvents = scopedEvents.filter(
    (event) => activeFilter === "all" || event.kind === activeFilter,
  );
  const showProjectOverview = selectedDay === null && activeFilter === "all";
  const selectedDate = selectedDay === null ? null : days[selectedDay]?.date ?? null;
  const weekLabel =
    firstDay && lastDay
      ? `${firstDay.date.toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
        })} – ${lastDay.date.toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })}`
      : "Tuần hiện tại";

  const showWeekOverview = () => {
    setSelectedDay(null);
    setActiveFilter("all");
  };

  return (
    <section className="rounded-[24px] border border-[#DDEBD6] bg-white p-5 shadow-[0_14px_40px_rgba(40,77,49,0.05)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#46A82D]">
            TUẦN NÀY CỦA BẠN
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-[-0.02em] text-[#284D31]">
            Lịch nội dung tuần này
          </h2>
          <p className="mt-1 text-sm text-[#829782]">{weekLabel}</p>
        </div>
        <button
          className={`flex h-10 items-center gap-2 rounded-xl border px-3.5 text-xs font-bold transition ${
            showProjectOverview
              ? "border-[#82C95B] bg-[#E3F2DB] text-[#46A82D]"
              : "border-[#D7E7D1] bg-white text-[#607760] hover:border-[#82C95B] hover:text-[#46A82D]"
          }`}
          onClick={showWeekOverview}
          type="button"
        >
          <CalendarRange size={16} />
          Tổng quan tuần
        </button>
      </div>

      <WeekCalendarStrip
        days={days}
        events={events}
        onSelectDay={(dayIndex) => {
          setSelectedDay(dayIndex);
          setActiveFilter("all");
        }}
        selectedDay={selectedDay}
      />

      <div
        className={`mt-5 grid gap-5 ${
          compact ? "" : "xl:grid-cols-[minmax(0,1fr)_280px]"
        }`}
      >
        <div className="min-w-0 rounded-[20px] border border-[#F0DDDA] bg-[#FFFDF8] p-4 sm:p-5">
          {showProjectOverview ? (
            <ProjectOverview compact={compact} scripts={snapshot.scriptWorkspace.scripts} onNavigate={onNavigate} />
          ) : (
            <ScheduleEventList
              activeFilter={activeFilter}
              days={days}
              events={visibleEvents}
              onClearDay={() => setSelectedDay(null)}
              selectedDate={selectedDate}
              onNavigate={onNavigate}
            />
          )}
        </div>

        <ScheduleFilters
          activeFilter={activeFilter}
          events={scopedEvents}
          onFilterChange={setActiveFilter}
        />
      </div>
    </section>
  );
}
