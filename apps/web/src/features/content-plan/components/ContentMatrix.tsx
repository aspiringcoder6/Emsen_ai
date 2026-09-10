import type { ContentPlanItemDto, DirectionVersionDto } from "@creator-flow/contracts";

const objectives = ["Giá trị", "Kết nối", "Chuyển đổi"] as const;
export function ContentMatrix({ direction, items, onSelectItem }: { direction: DirectionVersionDto; items: ContentPlanItemDto[]; onSelectItem: (itemId: string) => void }) {
  return <section className="min-w-0 rounded-[24px] border border-[#DDEBD6] bg-white p-5 sm:p-6">
    <h3 className="text-lg font-bold">Ma trận nội dung</h3><p className="mt-1 text-xs leading-5 text-[#748A74]">Bấm một ý tưởng để chỉnh chi tiết.</p>
    <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[580px] border-collapse text-left text-xs"><thead><tr className="text-[#937572]"><th className="p-3">Trụ cột / Phân bổ</th>{objectives.map((objective) => <th className="p-3" key={objective}>{objective}</th>)}</tr></thead><tbody>
      {direction.content.pillars.map((pillar, index) => {
        const count = items.filter((item) => item.pillarIndex === index && item.title.trim()).length;
        return <tr key={index} className="border-t border-[#F2E5E0]"><th className="max-w-44 p-3 align-top font-bold text-[#5D4949]">{pillar.name}<span className="mt-1 block font-normal text-[#748A74]">Mục tiêu {pillar.percentage}% · {count}/{items.length} bài</span></th>{objectives.map((objective) => <td className="w-[23%] p-2 align-top" key={objective}>{items.filter((item) => item.pillarIndex === index && item.objective === objective && item.title.trim()).map((item) => <button type="button" key={item.id} onClick={() => onSelectItem(item.id)} className="mb-1.5 block w-full rounded-xl bg-[#FFF5F1] p-2.5 text-left leading-5 text-[#825A58] hover:bg-[#FFE9E3]"><span className="font-bold">Ngày {item.dayIndex + 1} · </span>{item.title}</button>)}</td>)}</tr>;
      })}
    </tbody></table></div><p className="mt-3 text-[11px] text-[#748A74]">Tỷ lệ trụ cột được phân bổ gần đúng theo số video của tuần.</p>
  </section>;
}
