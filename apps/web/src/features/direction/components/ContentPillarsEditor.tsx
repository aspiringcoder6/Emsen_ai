import type { ContentPillarDto } from "@creator-flow/contracts";
import { ChevronDown, Layers3, Plus, RefreshCw, Trash2 } from "lucide-react";
import { directionInputClass } from "./DirectionField";

const colors = ["#46A82D", "#73A77A", "#D3A461", "#AF96C6", "#81AFBA"];

type Props = {
  canGenerate: boolean;
  disabled: boolean;
  onChange: (value: ContentPillarDto[]) => void;
  onRegenerate: () => void;
  pillars: ContentPillarDto[];
};

export function ContentPillarsEditor({
  pillars,
  onChange,
  onRegenerate,
  disabled,
  canGenerate,
}: Props) {
  const total = pillars.reduce((sum, pillar) => sum + (Number(pillar.percentage) || 0), 0);
  const edit = (index: number, patch: Partial<ContentPillarDto>) =>
    onChange(
      pillars.map((pillar, currentIndex) =>
        currentIndex === index ? { ...pillar, ...patch } : pillar,
      ),
    );

  return (
    <details className="group rounded-[20px] border border-[#DDEBD6] bg-white">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#F0F7EB] text-[#487D50]">
          <Layers3 size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-[#284D31]">Trụ cột nội dung</span>
          <span className="mt-1 block text-xs text-[#829782]">
            {pillars.length} nhóm · Tổng {total}% {total === 100 ? "· Đã cân đối" : "· Cần về 100%"}
          </span>
        </span>
        <ChevronDown
          className="shrink-0 text-[#829782] transition-transform group-open:rotate-180"
          size={18}
        />
      </summary>

      <div className="border-t border-[#E8F0E4] px-5 pb-5 pt-4">
        <p className="text-xs leading-5 text-[#748A74]">
          Đây là 3–5 nhóm chủ đề bạn sẽ luân phiên chia sẻ. Tổng tỷ lệ là tần suất xuất hiện dự
          kiến của từng nhóm.
        </p>
        <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-[#F1EEE8]" aria-hidden="true">
          {pillars.map((pillar, index) => (
            <div
              key={index}
              style={{
                background: colors[index],
                width: `${(Math.max(0, pillar.percentage) / Math.max(100, total)) * 100}%`,
              }}
            />
          ))}
        </div>
        <p
          className={`mt-2 text-right text-xs font-bold ${total === 100 ? "text-[#487D50]" : "text-[#B1484F]"}`}
          role="status"
        >
          Tổng tỷ lệ: {total}%{total !== 100 ? " · Cần điều chỉnh về 100%" : " · Đã cân đối"}
        </p>

        <div className="mt-4 space-y-3">
          {pillars.map((pillar, index) => (
            <details className="group/pillar rounded-2xl border border-[#E6ECE2] bg-[#FFFDF8]" key={index}>
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                <span
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
                  style={{ background: colors[index] }}
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-[#31583A]">
                  {pillar.name || `Trụ cột ${index + 1}`}
                </span>
                <span className="text-xs font-bold text-[#748A74]">{pillar.percentage}%</span>
                <ChevronDown
                  className="text-[#829782] transition-transform group-open/pillar:rotate-180"
                  size={16}
                />
              </summary>
              <fieldset className="border-t border-[#EEEAE3] p-4" disabled={disabled}>
                <div className="flex flex-wrap items-start gap-3">
                  <label className="min-w-40 flex-1 text-xs font-bold">
                    Tên trụ cột
                    <input
                      className={directionInputClass}
                      maxLength={120}
                      onChange={(event) => edit(index, { name: event.target.value })}
                      placeholder="Ví dụ: Chuyện nghề mỗi ngày"
                      value={pillar.name}
                    />
                  </label>
                  <label className="w-28 text-xs font-bold">
                    Tỷ lệ (%)
                    <input
                      className={directionInputClass}
                      max={100}
                      min={1}
                      onChange={(event) => edit(index, { percentage: Number(event.target.value) })}
                      step={1}
                      type="number"
                      value={pillar.percentage}
                    />
                  </label>
                </div>
                <label className="mt-3 block text-xs font-bold">
                  Nhóm này giúp ích gì cho kênh?
                  <textarea
                    className={directionInputClass}
                    maxLength={1500}
                    onChange={(event) => edit(index, { description: event.target.value })}
                    placeholder="Giải thích vai trò và góc khai thác của nhóm nội dung này."
                    rows={2}
                    value={pillar.description}
                  />
                </label>
                <label className="mt-3 block text-xs font-bold">
                  Ý tưởng minh họa{" "}
                  <span className="font-normal text-[#748A74]">· Mỗi dòng một ý tưởng</span>
                  <textarea
                    className={directionInputClass}
                    maxLength={1502}
                    onChange={(event) => edit(index, { examples: event.target.value.split("\n") })}
                    placeholder="Ví dụ: 3 sai lầm mình từng mắc khi mới bắt đầu"
                    rows={3}
                    value={pillar.examples.join("\n")}
                  />
                </label>
                <button
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-[#A56F6D] hover:bg-[#FFF0ED] disabled:opacity-30"
                  disabled={pillars.length <= 3}
                  onClick={() => onChange(pillars.filter((_, currentIndex) => currentIndex !== index))}
                  type="button"
                >
                  <Trash2 size={14} /> Xóa trụ cột này
                </button>
              </fieldset>
            </details>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            className="inline-flex items-center gap-2 rounded-xl border border-dashed border-[#AFCBA8] px-4 py-2.5 text-xs font-bold hover:bg-[#F1F8EC] disabled:opacity-40"
            disabled={disabled || pillars.length >= 5}
            onClick={() =>
              onChange([
                ...pillars,
                { description: "", examples: [""], name: "", percentage: 10 },
              ])
            }
            type="button"
          >
            <Plus size={15} /> Thêm trụ cột
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold text-[#3F7D3D] hover:bg-[#F1F8EC] disabled:opacity-40"
            disabled={disabled || !canGenerate}
            onClick={onRegenerate}
            type="button"
          >
            <RefreshCw size={13} /> Nhờ Emsen tạo lại các trụ cột
          </button>
        </div>
      </div>
    </details>
  );
}
