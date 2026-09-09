import { ChevronDown, RefreshCw } from "lucide-react";

export const directionInputClass =
  "mt-2 w-full rounded-2xl border border-[#DCE9D7] bg-[#FFFDF8] px-4 py-3 text-sm leading-6 text-[#31583A] outline-none transition placeholder:text-[#AE9490] focus:border-[#82C95B] focus:bg-white focus:ring-4 focus:ring-[#82C95B]/10 disabled:opacity-60";

type Props = {
  canGenerate: boolean;
  disabled: boolean;
  hint: string;
  onChange: (value: string) => void;
  onRegenerate: () => void;
  title: string;
  value: string;
};

export function DirectionField({
  title,
  hint,
  value,
  onChange,
  onRegenerate,
  disabled,
  canGenerate,
}: Props) {
  return (
    <details className="group rounded-[20px] border border-[#DDEBD6] bg-white">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-[#284D31]">{title}</span>
          <span className="mt-1 line-clamp-1 block text-xs text-[#829782]">
            {value || "Chưa có nội dung · Nhấn để bổ sung"}
          </span>
        </span>
        <ChevronDown
          className="shrink-0 text-[#829782] transition-transform group-open:rotate-180"
          size={18}
        />
      </summary>
      <div className="border-t border-[#E8F0E4] px-5 pb-5 pt-4">
        <p className="text-xs leading-5 text-[#748A74]">{hint}</p>
        <textarea
          aria-label={title}
          className={`${directionInputClass} min-h-32 resize-y`}
          disabled={disabled}
          maxLength={4000}
          onChange={(event) => onChange(event.target.value)}
          value={value}
        />
        <button
          aria-label={`AI tạo lại ${title.toLocaleLowerCase("vi-VN")}`}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-[#3F7D3D] hover:bg-[#F1F8EC] disabled:opacity-40"
          disabled={disabled || !canGenerate}
          onClick={onRegenerate}
          type="button"
        >
          <RefreshCw size={13} /> Nhờ Emsen viết lại phần này
        </button>
      </div>
    </details>
  );
}
