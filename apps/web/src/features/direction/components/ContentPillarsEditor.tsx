import type { ContentPillarDto } from "@creator-flow/contracts";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { directionInputClass } from "./DirectionField";

const colors = ["#46A82D", "#73A77A", "#D3A461", "#AF96C6", "#81AFBA"];
type Props = { pillars: ContentPillarDto[]; onChange: (value: ContentPillarDto[]) => void; onRegenerate: () => void; disabled: boolean; canGenerate: boolean };
export function ContentPillarsEditor({ pillars, onChange, onRegenerate, disabled, canGenerate }: Props) {
  const total = pillars.reduce((sum, pillar) => sum + (Number(pillar.percentage) || 0), 0);
  const edit = (index: number, patch: Partial<ContentPillarDto>) => onChange(pillars.map((pillar, i) => i === index ? { ...pillar, ...patch } : pillar));
  return (
    <section className="rounded-[24px] border border-[#DDEBD6] bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold">Trụ cột nội dung</h3>
        <button type="button" disabled={disabled || !canGenerate} onClick={onRegenerate} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold text-[#3F7D3D] hover:bg-[#F1F8EC] disabled:opacity-40"><RefreshCw size={13} /> Tạo lại các trụ cột</button>
      </div>
      <p className="mt-2 text-xs leading-5 text-[#748A74]">3–5 nhóm nội dung giúp kênh có nhịp riêng. Phân bổ tổng 100% để làm nền cho kế hoạch nội dung.</p>
      <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-[#F6E9E5]" aria-hidden="true">
        {pillars.map((pillar, index) => <div key={index} style={{ width: `${Math.max(0, pillar.percentage) / Math.max(100, total) * 100}%`, background: colors[index] }} />)}
      </div>
      <p className={`mt-2 text-right text-xs font-bold ${total === 100 ? "text-[#487D50]" : "text-[#B1484F]"}`} role="status">Tổng tỷ lệ: {total}%{total !== 100 ? " · Cần điều chỉnh về 100%" : " · Đã cân đối"}</p>
      <div className="mt-4 grid gap-4">
        {pillars.map((pillar, index) => (
          <fieldset key={index} disabled={disabled} className="min-w-0 rounded-2xl border border-[#EFDFDA] bg-[#FFFDF8] p-4">
            <legend className="px-2 text-xs font-bold" style={{ color: colors[index] }}>Trụ cột {index + 1}</legend>
            <div className="flex flex-wrap items-start gap-3">
              <label className="min-w-32 flex-1 text-xs font-bold">Tên trụ cột<input className={directionInputClass} value={pillar.name} maxLength={120} onChange={(event) => edit(index, { name: event.target.value })} placeholder="Ví dụ: Chuyện nghề mỗi ngày" /></label>
              <label className="w-24 text-xs font-bold">Tỷ lệ (%)<input className={directionInputClass} type="number" min={1} max={100} step={1} value={pillar.percentage} onChange={(event) => edit(index, { percentage: Number(event.target.value) })} /></label>
              <button type="button" title="Xóa trụ cột" aria-label={`Xóa trụ cột ${index + 1}`} disabled={pillars.length <= 3} onClick={() => onChange(pillars.filter((_, i) => i !== index))} className="mt-9 rounded-lg p-2 text-[#A56F6D] hover:bg-[#E3F2DB] disabled:opacity-30"><Trash2 size={16} /></button>
            </div>
            <label className="mt-3 block text-xs font-bold">Vai trò & góc khai thác<textarea className={directionInputClass} rows={2} maxLength={1500} value={pillar.description} onChange={(event) => edit(index, { description: event.target.value })} /></label>
            <label className="mt-3 block text-xs font-bold">Ý tưởng minh họa <span className="font-normal text-[#748A74]">(1–3 ý tưởng, mỗi dòng một ý tưởng)</span><textarea className={directionInputClass} rows={3} maxLength={1502} value={pillar.examples.join("\n")} onChange={(event) => edit(index, { examples: event.target.value.split("\n") })} /></label>
          </fieldset>
        ))}
      </div>
      <button type="button" disabled={disabled || pillars.length >= 5} onClick={() => onChange([...pillars, { name: "", description: "", percentage: 10, examples: [""] }])} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-dashed border-[#D9BFBA] px-4 py-2.5 text-xs font-bold hover:bg-[#F1F8EC] disabled:opacity-40"><Plus size={15} /> Thêm trụ cột</button>
    </section>
  );
}
