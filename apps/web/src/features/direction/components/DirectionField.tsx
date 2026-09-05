import { RefreshCw } from "lucide-react";

export const directionInputClass = "mt-2 w-full rounded-2xl border border-[#DCE9D7] bg-[#FFFDF8] px-4 py-3 text-sm leading-6 text-[#31583A] placeholder:text-[#AE9490] disabled:opacity-60";

type Props = {
  title: string; hint: string; value: string; onChange: (value: string) => void;
  onRegenerate: () => void; disabled: boolean; canGenerate: boolean;
};
export function DirectionField({ title, hint, value, onChange, onRegenerate, disabled, canGenerate }: Props) {
  return (
    <section className="rounded-[24px] border border-[#DDEBD6] bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-bold text-[#284D31]">{title}</h3>
        <button type="button" onClick={onRegenerate} disabled={disabled || !canGenerate} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold text-[#3F7D3D] hover:bg-[#F1F8EC] disabled:opacity-40" aria-label={`AI tạo lại ${title.toLocaleLowerCase("vi-VN")}`}><RefreshCw size={13} /> Tạo lại phần này</button>
      </div>
      <label className="mt-2 block text-xs leading-5 text-[#748A74]">{hint}
        <textarea aria-label={title} className={`${directionInputClass} min-h-36 resize-y`} value={value} maxLength={4000} onChange={(event) => onChange(event.target.value)} disabled={disabled} />
      </label>
    </section>
  );
}
