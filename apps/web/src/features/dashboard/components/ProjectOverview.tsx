import { Clapperboard } from "lucide-react";
import { weeklyProjects } from "../dashboardData";

export function ProjectOverview({ compact }: { compact: boolean }) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-[#284D31]">Tổng quan tiến độ project</h3>
          <p className="mt-1 text-xs text-[#A58F8B]">
            3 project đang chạy trong tuần hiện tại
          </p>
        </div>
        <span className="rounded-full bg-[#EEF8EF] px-3 py-1.5 text-xs font-bold text-[#3F7E49]">
          Đúng tiến độ
        </span>
      </div>

      <div
        className={`mt-5 grid gap-3 ${compact ? "md:grid-cols-2" : "lg:grid-cols-3"}`}
      >
        {weeklyProjects.map((project) => (
          <article
            className="group rounded-2xl border border-[#F0DFDB] bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#A8C99B] hover:shadow-[0_10px_28px_rgba(70,168,45,0.08)]"
            key={project.name}
          >
            <div className="flex items-start gap-3">
              <div
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white"
                style={{ backgroundColor: project.color }}
              >
                <Clapperboard size={19} />
              </div>
              <div className="min-w-0">
                <h4 className="line-clamp-2 text-sm font-bold leading-5 text-[#31583A]">
                  {project.name}
                </h4>
                <p className="mt-0.5 text-xs text-[#94A794]">{project.creator}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-[#607760]">{project.stage}</span>
              <span className="font-bold text-[#46A82D]">{project.progress}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#F6E8E5]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#46A82D] to-[#82C95B]"
                style={{ width: `${project.progress}%` }}
              />
            </div>
            <div className="mt-4 border-t border-[#F6EAE7] pt-3 text-[11px] text-[#829782]">
              <p className="font-bold text-[#526952]">{project.tasks}</p>
              <p className="mt-1">{project.schedule}</p>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
