import { Check, Compass, History, LoaderCircle, RefreshCw, Save, Sparkles } from "lucide-react";
import type { DirectionSection } from "@creator-flow/contracts";
import { useDirection } from "../features/direction/useDirection";
import { DirectionField, directionInputClass } from "../features/direction/components/DirectionField";
import { ContentPillarsEditor } from "../features/direction/components/ContentPillarsEditor";
import { DirectionContext } from "../features/direction/components/DirectionContext";

const fields = [
  { key: "positioning", title: "Định vị kênh", hint: "Bạn muốn được nhớ đến vì điều gì? Nội dung mang lại giá trị khác biệt nào?" },
  { key: "tone", title: "Giọng điệu & cách thể hiện", hint: "Cách xưng hô, nhịp kể chuyện, những cách nói nên dùng và cần tránh." },
  { key: "audience", title: "Khán giả bạn muốn đồng hành", hint: "Họ là ai, đang cần gì và vì sao họ muốn quay lại với nội dung của bạn?" },
] as const;

export function DirectionPage({ active, compact, onOpenDna, onContentPlan }: { active: boolean; compact: boolean; onOpenDna: () => void; onContentPlan: () => void }) {
  const direction = useDirection(active);
  const { state, brief, content, selectedVersion, dirty, busy, loading, error, notice } = direction;
  const locked = Boolean(busy) || loading;
  const total = content.pillars.reduce((sum, pillar) => sum + pillar.percentage, 0);
  const valid = Boolean(brief.goal.trim() && content.positioning.trim() && content.tone.trim() && content.audience.trim() && total === 100 && content.pillars.length >= 3 && content.pillars.length <= 5 && new Set(content.pillars.map((pillar) => pillar.name.trim().toLocaleLowerCase("vi-VN"))).size === content.pillars.length && content.pillars.every((pillar) => pillar.name.trim() && pillar.description.trim() && Number.isInteger(pillar.percentage) && pillar.percentage > 0 && pillar.percentage <= 100 && pillar.examples.length >= 1 && pillar.examples.length <= 3 && pillar.examples.every((example) => example.trim() && example.length <= 500)));
  const canGenerate = Boolean(state?.aiConfigured && state.creatorDna.profile.niche.trim() && brief.goal.trim());
  const latest = state?.versions[0];
  const selected = state?.versions.find((version) => version.version === selectedVersion);
  const approved = state?.versions.find((version) => version.status === "approved");
  const regenerate = (section: DirectionSection | "all") => { void direction.run("generate", section); };
  return (
    <section hidden={!active} className="mx-auto max-w-6xl space-y-5">
      <header className="relative overflow-hidden rounded-[28px] border border-[#DDEBD6] bg-gradient-to-br from-white via-[#FFF6F2] to-[#F0F6EB] p-6 sm:p-8">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-[#467E43]"><Compass size={17} /> Bước 02 · Định hướng sáng tạo</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#284D31]">Để chất riêng có một hướng đi.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#607760]">Từ những điều làm nên bạn, cùng emsen định hình một kênh có cá tính, có người đồng hành và có câu chuyện để kể mỗi ngày.</p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-[#607760]">{["01 · Creator DNA", "02 · Định hướng", "03 · Kế hoạch nội dung"].map((label, index) => <span key={label} className={`rounded-full px-3 py-2 ${index === 1 ? "bg-[#284D31] text-white" : "bg-white/80"}`}>{label}</span>)}</div>
      </header>
      {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#F3C9C6] bg-[#EAF6E4] p-4 text-sm text-[#A04449]">{error}<button type="button" disabled={locked} className="shrink-0 rounded-lg border border-[#E0A8A4] px-3 py-1.5 font-bold" onClick={direction.reload}>Tải bản mới nhất</button></div>}
      {notice && <p role="status" className="rounded-2xl border border-[#D4E4CD] bg-[#F2F8ED] p-4 text-sm text-[#487D50]">{notice}</p>}
      {loading && !state && <p role="status" className="flex items-center gap-2 p-8 text-sm"><LoaderCircle size={20} className="animate-spin" /> Đang mở định hướng của bạn…</p>}
      {state && <div className={`grid items-start gap-5 ${compact ? "" : "xl:grid-cols-[minmax(0,1fr)_280px]"}`}>
        <div className="min-w-0 space-y-5">
          <section className="rounded-[24px] border border-[#DDEBD6] bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-lg font-bold">Bạn muốn kênh lớn lên như thế nào?</h3><span className="rounded-full bg-[#FFF0ED] px-3 py-1 text-[11px] font-bold text-[#467E43]">{dirty ? "Có thay đổi chưa lưu" : selected ? `Phiên bản ${selected.version} · ${selected.status === "approved" ? "Đã chốt" : "Bản nháp"}` : "Bắt đầu định hướng mới"}</span></div>
            <fieldset disabled={locked} className="mt-4">
              <label className="block text-xs font-bold">Mục tiêu của kênh <span className="text-[#B04E53]">*</span><textarea className={directionInputClass} maxLength={1000} rows={2} placeholder="Ví dụ: Xây cộng đồng yêu nấu ăn tại nhà bằng những công thức đơn giản, dễ làm." value={brief.goal} onChange={(event) => direction.editBrief({ ...brief, goal: event.target.value })} /></label>
              <label className="mt-4 block text-xs font-bold">Mong muốn thêm <span className="font-normal text-[#748A74]">· Không bắt buộc</span><textarea className={directionInputClass} rows={2} maxLength={4000} placeholder="Sản phẩm, nguồn lực, phong cách muốn thử hoặc điều bạn muốn điều chỉnh…" value={brief.notes} onChange={(event) => direction.editBrief({ ...brief, notes: event.target.value })} /></label>
            </fieldset>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => regenerate("all")} disabled={locked || !canGenerate} className="inline-flex items-center gap-2 rounded-xl bg-[#284D31] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#654649] disabled:opacity-40">{busy === "all" ? <LoaderCircle size={17} className="animate-spin" /> : <Sparkles size={17} />}{latest ? "Tạo đề xuất mới" : "Đề xuất từ Creator DNA"}</button>
              <p className="max-w-sm text-xs leading-5 text-[#748A74]">{!state.aiConfigured ? "AI chưa sẵn sàng. Bạn có thể tự viết định hướng bên dưới." : !state.creatorDna.profile.niche.trim() ? "Bổ sung chủ đề trong Creator DNA để nhận đề xuất AI." : "Mỗi đề xuất được lưu thành bản nháp mới để bạn xem lại và chỉnh sửa."}</p>
            </div>
          </section>
          {selected && selected.version !== latest?.version && <p className="rounded-2xl bg-[#FFF3DD] p-4 text-sm text-[#846432]">Bạn đang xem phiên bản {selected.version}. Lưu hoặc chốt sẽ tạo phiên bản mới từ nội dung này.</p>}
          {fields.map((field) => <DirectionField key={field.key} title={field.title} hint={field.hint} value={content[field.key]} onChange={(value) => direction.editContent({ ...content, [field.key]: value })} onRegenerate={() => regenerate(field.key)} disabled={locked} canGenerate={canGenerate && valid} />)}
          <ContentPillarsEditor pillars={content.pillars} onChange={(pillars) => direction.editContent({ ...content, pillars })} onRegenerate={() => regenerate("pillars")} disabled={locked} canGenerate={canGenerate && valid} />
          <div className="rounded-[24px] border border-[#DDEBD6] bg-white p-5">
            {!valid && <p className="mb-4 text-xs leading-5 text-[#748A74]">Điền mục tiêu, 3 phần định hướng và 3–5 trụ cột có tên, mô tả, 1–3 ý tưởng. Tổng tỷ lệ cần bằng 100% để lưu hoặc tạo lại từng phần.</p>}
            {busy && <p role="status" className="mb-4 flex items-center gap-2 text-sm text-[#467E43]"><LoaderCircle size={16} className="animate-spin" />{busy === "draft" || busy === "approved" ? "Đang lưu định hướng…" : "emsen đang tìm hướng đi phù hợp với bạn…"}</p>}
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" disabled={locked || !valid} onClick={() => void direction.run("draft")} className="inline-flex items-center gap-2 rounded-xl border border-[#C8DBC1] px-4 py-3 text-sm font-bold disabled:opacity-40"><Save size={17} /> Lưu bản nháp</button>
              <button type="button" disabled={locked || !valid || (!dirty && selected?.status === "approved" && selected.version === latest?.version)} onClick={() => void direction.run("approved")} className="inline-flex items-center gap-2 rounded-xl bg-[#527F56] px-5 py-3 text-sm font-bold text-white hover:bg-[#426947] disabled:opacity-40"><Check size={17} /> Chốt định hướng này</button>
            </div>
            <p className="mt-3 text-xs leading-5 text-[#748A74]">Bản đã chốt là đầu vào cho kế hoạch nội dung tiếp theo. Bạn vẫn có thể tạo phiên bản mới bất cứ lúc nào.</p>
            {approved && <button type="button" onClick={onContentPlan} className="mt-3 rounded-xl bg-[#FFF0EC] px-4 py-2.5 text-sm font-bold text-[#3F8240]">Lập kế hoạch từ định hướng đã chốt →</button>}
          </div>
        </div>
        <div className="min-w-0 space-y-5">
          <DirectionContext state={state} onOpenDna={onOpenDna} />
          <section className="rounded-[24px] border border-[#DDEBD6] bg-white p-5">
            <h3 className="flex items-center gap-2 font-bold"><History size={18} /> Lịch sử định hướng</h3>
            <p className="mt-2 text-xs leading-5 text-[#748A74]">{approved ? `Phiên bản ${approved.version} là bản đã chốt gần nhất.` : "Chưa có bản được chốt. Hãy xem lại đề xuất trước khi chọn hướng đi."}</p>
            <div className="flow-scrollbar mt-4 max-h-96 space-y-2 overflow-y-auto">
              {state.versions.length === 0 && <p className="py-5 text-center text-xs text-[#748A74]">Những bước trưởng thành của kênh sẽ ở đây.</p>}
              {state.versions.map((version) => <button type="button" key={version.id} disabled={locked} aria-pressed={version.version === selectedVersion} onClick={() => direction.selectVersion(version)} className={`w-full rounded-xl border p-3 text-left transition ${version.version === selectedVersion ? "border-[#73B55E] bg-[#FFF3F0]" : "border-[#F0E4DF] hover:bg-[#FFFAF7]"}`}><span className="flex items-center justify-between gap-2 text-xs font-bold">Phiên bản {version.version}<span className={version.status === "approved" ? "text-[#527F56]" : "text-[#467E43]"}>{version.status === "approved" ? "Đã chốt" : "Nháp"}</span></span><span className="mt-1 block text-[11px] text-[#748A74]">{version.source === "ai" ? "Đề xuất AI" : "Bạn đã lưu"} · {new Date(version.createdAt).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span></button>)}
            </div>
            {selected && <p className="mt-4 border-t border-[#F0E4DF] pt-3 text-[11px] leading-5 text-[#748A74]">Creator DNA lúc lưu: {selected.dnaSnapshot.profile.niche || "Chưa có chủ đề"} · {selected.dnaSnapshot.learning.signals.length} tín hiệu.</p>}
            <button type="button" onClick={direction.reload} disabled={locked} className="mt-3 inline-flex items-center gap-1.5 rounded-lg p-1 text-xs font-bold text-[#467E43]"><RefreshCw size={13} /> Tải bản mới nhất</button>
          </section>
        </div>
      </div>}
    </section>
  );
}
