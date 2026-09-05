import type { ContentPlanItemDto, DirectionVersionDto } from "@creator-flow/contracts";
import { RefreshCw } from "lucide-react";
import { planDate } from "../contentPlanUtils";

const inputClass = "mt-2 w-full rounded-xl border border-[#E6D4CE] bg-[#FFFDF8] px-3 py-2.5 text-sm font-normal leading-6";
export function PlanDayEditor({ item, direction, weekStart, disabled, canGenerate, onChange, onRegenerate }: {
  item: ContentPlanItemDto; direction: DirectionVersionDto; weekStart: string; disabled: boolean; canGenerate: boolean;
  onChange: (patch: Partial<ContentPlanItemDto>) => void; onRegenerate: () => void;
}) {
  return <section id="plan-day-editor" className="scroll-mt-6 rounded-[24px] border border-[#DDEBD6] bg-white p-5 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold text-[#3F8240]">NGÀY {item.dayIndex + 1} · {planDate(weekStart, item.dayIndex)}</p><h3 className="mt-1 text-xl font-bold">Chăm chút từng ý tưởng</h3></div><button type="button" disabled={disabled || !canGenerate} onClick={onRegenerate} className="inline-flex items-center gap-2 rounded-xl bg-[#FFF0EC] px-3 py-2 text-xs font-bold text-[#3F8240] disabled:opacity-40"><RefreshCw size={14} /> Tạo lại ngày này</button></div>
    <fieldset disabled={disabled} className="mt-5 space-y-4">
      <label className="block text-xs font-bold">Tên nội dung<input className={inputClass} value={item.title} maxLength={250} onChange={(event) => onChange({ title: event.target.value })} placeholder="Một ý tưởng nhỏ, một giá trị rõ ràng…" /></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold">Trụ cột<select className={inputClass} value={item.pillarIndex} onChange={(event) => onChange({ pillarIndex: Number(event.target.value) })}>{direction.content.pillars.map((pillar, index) => <option value={index} key={index}>{pillar.name}</option>)}</select></label><label className="text-xs font-bold">Mục đích<select className={inputClass} value={item.objective} onChange={(event) => onChange({ objective: event.target.value as ContentPlanItemDto["objective"] })}>{["Giá trị", "Kết nối", "Chuyển đổi"].map((value) => <option key={value}>{value}</option>)}</select></label><label className="text-xs font-bold">Nền tảng<input className={inputClass} maxLength={80} value={item.platform} onChange={(event) => onChange({ platform: event.target.value })} /></label><label className="text-xs font-bold">Định dạng<input className={inputClass} maxLength={120} value={item.format} onChange={(event) => onChange({ format: event.target.value })} /></label></div>
      {([
        ["angle", "Góc khai thác & thông điệp", 2000], ["hook", "Mở đầu gợi ý (hook)", 1000],
        ["cta", "Lời kêu gọi hành động (CTA)", 1000], ["productionNotes", "Ghi chú chuẩn bị · không bắt buộc", 2000],
      ] as const).map(([key, label, max]) => <label key={key} className="block text-xs font-bold">{label}<textarea className={inputClass} rows={3} maxLength={max} value={item[key]} onChange={(event) => onChange({ [key]: event.target.value })} /></label>)}
    </fieldset>
  </section>;
}
