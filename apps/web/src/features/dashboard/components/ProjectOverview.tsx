import type { ScriptDocumentDto } from "@creator-flow/contracts";
import { ArrowRight, CalendarClock, PenLine } from "lucide-react";
import { formatScriptDate, scriptProgress, scriptStatusConfig } from "../../scripts/scriptConfig";
import type { DashboardDestination } from "../dashboardData";

export function ProjectOverview({ compact, scripts, onNavigate }: { compact: boolean; scripts: ScriptDocumentDto[]; onNavigate: (destination: DashboardDestination) => void }) {
  const working = scripts.filter((script) => ["draft", "in-progress", "ready"].includes(script.status)).slice(0, 6);
  return <>
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold text-[#284D31]">Kịch bản đang làm việc</h3><p className="mt-1 text-xs text-[#A58F8B]">{working.length ? `${working.length} kịch bản cần bạn tiếp tục` : "Chưa có kịch bản đang làm"}</p></div><button type="button" onClick={() => onNavigate("scripts")} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-[#3F8240]">Mở thư viện <ArrowRight size={14} /></button></div>
    {working.length ? <div className={`mt-5 grid gap-3 ${compact ? "md:grid-cols-2" : "lg:grid-cols-3"}`}>{working.map((script) => {
      const progress = scriptProgress(script); const status = scriptStatusConfig[script.status];
      return <button type="button" onClick={() => onNavigate("scripts")} className="group rounded-2xl border border-[#F0DFDB] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-[#A8C99B] hover:shadow-[0_10px_28px_rgba(70,168,45,0.08)]" key={script.id}>
        <div className="flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#4E8052] text-white"><PenLine size={19} /></div><div className="min-w-0"><h4 className="line-clamp-2 text-sm font-bold leading-5 text-[#31583A]">{script.title}</h4><p className="mt-1 text-[11px] text-[#94A794]">{script.settings.platform || "Chưa chọn nền tảng"} · {script.settings.format || "Chưa chọn định dạng"}</p></div></div>
        <div className="mt-4 flex items-center justify-between gap-2 text-xs"><span className="rounded-full px-2 py-1 font-bold" style={{ color: status.color, background: status.surface }}>{status.label}</span><span className="font-bold text-[#46A82D]">{progress}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#F6E8E5]"><div className="h-full rounded-full bg-gradient-to-r from-[#46A82D] to-[#82C95B]" style={{ width: `${progress}%` }} /></div><p className="mt-4 flex items-center gap-1.5 border-t border-[#F6EAE7] pt-3 text-[11px] text-[#829782]"><CalendarClock size={13} /> {formatScriptDate(script.settings.scheduledFor)} · {script.content.storyboard.length} keyframe</p>
      </button>;
    })}</div> : <button type="button" onClick={() => onNavigate("scripts")} className="mt-5 flex min-h-40 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[#D7E5D0] bg-white text-center"><PenLine size={24} className="text-[#72B65D]" /><span className="mt-3 text-sm font-bold text-[#526952]">Bắt đầu kịch bản đầu tiên</span><span className="mt-1 text-xs text-[#94A794]">Tạo từ lịch đã chốt hoặc một ý tưởng mới.</span></button>}
  </>;
}
