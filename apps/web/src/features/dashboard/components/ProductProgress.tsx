import { Check, ChevronRight } from "lucide-react";
import type { DashboardDestination, ProductProgressStep } from "../dashboardData";

export function ProductProgress({ steps, onNavigate }: { steps: ProductProgressStep[]; onNavigate: (destination: DashboardDestination) => void }) {
  const score = Math.round(steps.reduce((total, step) => total + (step.state === "done" ? 1 : step.state === "active" ? 0.5 : 0), 0) / steps.length * 100);
  return (
    <section id="dashboard-journey" className="rounded-[24px] border border-[#DDEBD6] bg-white p-5 shadow-[0_14px_40px_rgba(40,77,49,0.05)] sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#46A82D]">Hành trình hiện tại</p><h2 className="mt-1 text-xl font-bold tracking-[-0.02em] text-[#284D31]">Từ chất riêng đến kịch bản có thể quay</h2><p className="mt-2 text-sm text-[#829782]">Mỗi bước mở đúng không gian làm việc và phản ánh dữ liệu bạn đã lưu.</p></div>
        <div className="text-right"><strong className="text-2xl text-[#46A82D]">{score}%</strong><p className="text-[11px] text-[#829782]">tiến độ hành trình</p></div>
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#F3E3DF]"><div className="h-full rounded-full bg-gradient-to-r from-[#67B86F] via-[#82C95B] to-[#46A82D] transition-[width] duration-500" style={{ width: `${score}%` }} /></div>

      <div className="flow-scrollbar mt-7 overflow-x-auto pb-2">
        <div className="flex min-w-[650px] items-start">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return <div className="flex flex-1 items-start" key={step.id}>
              <button type="button" onClick={() => onNavigate(step.id)} className="group relative z-10 flex w-[138px] shrink-0 flex-col items-center rounded-2xl p-2 text-center transition hover:bg-[#F7FBF4]">
                <div className={`grid h-12 w-12 place-items-center rounded-2xl border-2 transition group-hover:-translate-y-0.5 ${step.state === "done" ? "border-[#67B86F] bg-[#EEF8EF] text-[#3F7E49]" : step.state === "active" ? "border-[#82C95B] bg-gradient-to-br from-[#46A82D] to-[#82C95B] text-white shadow-[0_9px_22px_rgba(70,168,45,0.24)]" : "border-[#EEDDD9] bg-[#FFFAF8] text-[#94A794]"}`}>{step.state === "done" ? <Check size={20} /> : <Icon size={20} />}</div>
                <p className="mt-3 text-sm font-bold text-[#31583A]">{step.label}</p><p className={`mt-1 text-[11px] font-semibold ${step.state === "active" ? "text-[#46A82D]" : "text-[#94A794]"}`}>{step.caption}</p><span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-[#4C8750] opacity-0 transition group-hover:opacity-100">Mở <ChevronRight size={12} /></span>
              </button>
              {index < steps.length - 1 ? <div className="mt-8 h-[2px] flex-1 bg-[#F1DFDB]"><div className={`h-full rounded-full ${step.state === "done" ? "w-full bg-gradient-to-r from-[#67B86F] to-[#82C95B]" : "w-0"}`} /></div> : null}
            </div>;
          })}
        </div>
      </div>
    </section>
  );
}
