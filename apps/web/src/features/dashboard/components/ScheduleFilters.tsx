import {
  CalendarDays,
  ListTodo,
  PenLine,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import {
  scheduleKindConfig,
  type ScheduleKind,
  type WeekEvent,
} from "../dashboardData";

type ScheduleFiltersProps = {
  activeFilter: "all" | ScheduleKind;
  events: WeekEvent[];
  onFilterChange: (filter: "all" | ScheduleKind) => void;
};

const filterItems: Array<{
  id: "all" | ScheduleKind;
  label: string;
  icon: LucideIcon;
  color: string;
}> = [
  { id: "all", label: "Tất cả hoạt động", icon: CalendarDays, color: "#46A82D" },
  {
    id: "plan",
    label: "Kế hoạch nội dung",
    icon: ListTodo,
    color: scheduleKindConfig.plan.color,
  },
  {
    id: "script",
    label: "Kịch bản",
    icon: PenLine,
    color: scheduleKindConfig.script.color,
  },
];

export function ScheduleFilters({
  activeFilter,
  events,
  onFilterChange,
}: ScheduleFiltersProps) {
  return (
    <aside className="rounded-[20px] border border-[#DDEBD6] bg-white p-3.5">
      <div className="flex items-center gap-2 px-2 py-2">
        <SlidersHorizontal className="text-[#46A82D]" size={17} />
        <h3 className="text-sm font-bold text-[#31583A]">Menu hiển thị</h3>
      </div>
      <div className="mt-2 space-y-1.5">
        {filterItems.map((filter) => {
          const Icon = filter.icon;
          const count =
            filter.id === "all"
              ? events.length
              : events.filter((event) => event.kind === filter.id).length;
          const active = activeFilter === filter.id;

          return (
            <button
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                active
                  ? "bg-[#E3F2DB] text-[#46A82D]"
                  : "text-[#607760] hover:bg-[#FFF6F3] hover:text-[#31583A]"
              }`}
              key={filter.id}
              onClick={() => onFilterChange(filter.id)}
              type="button"
            >
              <Icon size={17} style={{ color: active ? filter.color : undefined }} />
              <span className="min-w-0 flex-1 text-xs font-bold">{filter.label}</span>
              <span
                className={`grid h-6 min-w-6 place-items-center rounded-lg px-1.5 text-[10px] font-bold ${
                  active ? "bg-white text-[#46A82D]" : "bg-[#F7EFEA] text-[#829782]"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl bg-gradient-to-br from-[#284D31] to-[#674345] p-4 text-white">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#FFC9C6]">
          Tóm tắt tuần
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xl font-bold">{events.length}</p>
            <p className="mt-1 text-[9px] text-white/65">Hoạt động</p>
          </div>
          <div>
            <p className="text-xl font-bold">
              {events.filter((event) => event.kind === "plan").length}
            </p>
            <p className="mt-1 text-[9px] text-white/65">Nội dung</p>
          </div>
          <div>
            <p className="text-xl font-bold">
              {events.filter((event) => event.kind === "script").length}
            </p>
            <p className="mt-1 text-[9px] text-white/65">Kịch bản</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
