import { useEffect, useRef, useState } from "react";
import { CalendarDays, Check, FolderKanban, LoaderCircle, Plus, Save, Sparkles } from "lucide-react";
import { useContentPlan } from "../features/content-plan/useContentPlan";
import { isPlanComplete, isScheduleCompatible, planDate } from "../features/content-plan/contentPlanUtils";
import { ContentMatrix } from "../features/content-plan/components/ContentMatrix";
import { PlanDayEditor } from "../features/content-plan/components/PlanDayEditor";
import { WeeklyAvailability } from "../features/content-plan/components/WeeklyAvailability";

export function ContentPlanPage({
  active,
  onDirection,
  onSettings,
}: {
  active: boolean;
  onDirection: () => void;
  onSettings: () => void;
}) {
  const plan = useContentPlan(active);
  const [selectedItemId, setSelectedItemId] = useState("");
  const editor = useRef<HTMLDivElement>(null);
  const {
    state,
    activePlanId,
    planName,
    direction,
    weekStart,
    focus,
    availableDays,
    weeklyVideoTarget,
    items,
    loading,
    busy,
    dirty,
    selectedVersion,
    error,
    notice,
  } = plan;
  const locked = loading || Boolean(busy);
  const complete = isPlanComplete(items);
  const scheduleCompatible = isScheduleCompatible(items, availableDays, weeklyVideoTarget);
  const readyToSave = complete && scheduleCompatible && Boolean(planName.trim());
  const selected = items.find((item) => item.id === selectedItemId);
  const selectedRecord = state?.versions.find((version) => version.version === selectedVersion);

  useEffect(() => {
    if (items.length && !items.some((item) => item.id === selectedItemId)) {
      setSelectedItemId(items[0]!.id);
    }
  }, [items, selectedItemId]);

  const showItem = (itemId: string) => {
    setSelectedItemId(itemId);
    editor.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section hidden={!active} className="mx-auto max-w-6xl space-y-5">
      <header className="rounded-[28px] border border-[#DDEBD6] bg-gradient-to-br from-white via-[#FFF5F0] to-[#F0F6EA] p-6 sm:p-8">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#3F8240]"><CalendarDays size={17} /> Bước 03 · Kế hoạch nội dung</p>
        <h2 className="mt-3 text-3xl font-bold text-[#284D31]">Lên lịch vừa sức với bạn.</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#748A74]">Chọn ngày có thể quay, đặt mục tiêu nếu muốn và để Emsen sắp phần còn lại.</p>
      </header>

      {state && (
        <section className="rounded-[22px] border border-[#DDEBD6] bg-white p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <label className="text-xs font-bold text-[#31583A]">
              <span className="flex items-center gap-2"><FolderKanban size={15} /> Kế hoạch nội dung</span>
              <select value={activePlanId ?? "new"} disabled={locked} onChange={(event) => event.target.value !== "new" && plan.selectPlan(event.target.value)} className="mt-2 w-full rounded-xl border border-[#E6D4CE] bg-[#FFFDF8] px-3 py-2.5 text-sm font-normal">
                {activePlanId === null && <option value="new">{planName} · Chưa lưu</option>}
                {state.plans.map((item) => <option key={item.id} value={item.id}>{item.name} · {planDate(item.weekStart, 0)}</option>)}
              </select>
            </label>
            <button type="button" disabled={locked} onClick={plan.startNewPlan} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#C8DBC1] bg-[#F4FAF0] px-4 py-2.5 text-xs font-bold text-[#31583A]"><Plus size={15} /> Kế hoạch mới</button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <label className="text-xs font-bold">Tên kế hoạch<input value={planName} maxLength={120} disabled={locked} onChange={(event) => plan.editPlanName(event.target.value)} className="mt-2 w-full rounded-xl border border-[#E6D4CE] bg-[#FFFDF8] px-3 py-2.5 text-sm font-normal" /></label>
            <label className="text-xs font-bold">Tuần bắt đầu<input type="date" min="2000-01-01" max="2099-12-25" value={weekStart} disabled={locked} onChange={(event) => plan.changeWeek(event.target.value)} className="mt-2 block rounded-xl border border-[#E6D4CE] bg-[#FFFDF8] px-3 py-2.5 font-normal" /></label>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[#748A74]"><span>{planDate(weekStart, 0)} → {planDate(weekStart, 6)}</span><button type="button" onClick={plan.reload} disabled={locked} className="rounded-lg px-2 py-1.5 font-bold text-[#3F8240]">Tải bản mới nhất</button></div>
        </section>
      )}

      {error && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-[#F1C9C2] bg-[#FFF0EC] p-4 text-sm text-[#9A4B42]"><span className="flex-1">{error}</span>{!state && <button type="button" onClick={plan.reload} className="rounded-lg bg-white px-3 py-2 text-xs font-bold">Thử lại</button>}</div>}
      {notice && <p role="status" className="rounded-xl bg-[#F0F7EB] p-4 text-sm text-[#466D47]">{notice}</p>}
      {loading && <p role="status" className="flex items-center gap-2 p-5 text-sm"><LoaderCircle size={18} className="animate-spin" /> Đang tải kế hoạch…</p>}

      {state && !direction && (
        <div className="rounded-[24px] border border-[#DDE8D6] bg-[#F5F9F1] p-8 text-center">
          <h3 className="text-xl font-bold">Bạn cần chốt định hướng trước.</h3>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#75856E]">Emsen sẽ dùng định hướng để chọn chủ đề, khán giả và giọng điệu phù hợp.</p>
          <button type="button" onClick={onDirection} className="mt-5 rounded-xl bg-[#527F56] px-5 py-3 text-sm font-bold text-white">Mở Định hướng</button>
        </div>
      )}

      {state && direction && <>
        <WeeklyAvailability
          weekStart={weekStart}
          availableDays={availableDays}
          weeklyVideoTarget={weeklyVideoTarget}
          disabled={locked}
          onAvailableDaysChange={plan.editAvailableDays}
          onTargetChange={plan.editWeeklyVideoTarget}
        />

        <section className="rounded-[24px] border border-[#DDEBD6] bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-bold">Tuần này tập trung điều gì?</h3>
            <span className="rounded-full bg-[#FFF0EC] px-3 py-1 text-xs font-bold text-[#3F8240]">{dirty ? "Có thay đổi chưa lưu" : selectedRecord ? `Phiên bản ${selectedVersion} · ${selectedRecord.status === "approved" ? "Đã chốt" : "Nháp"}` : "Kế hoạch mới"}</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-[#748A74]">Định hướng {direction.version}: {direction.brief.goal}</p>
          {state.latestApprovedDirection && state.latestApprovedDirection.id !== direction.id && <button type="button" disabled={locked} onClick={plan.useLatestDirection} className="mt-2 rounded-lg bg-[#FFF3DD] p-2 text-xs font-bold text-[#856B3A]">Dùng định hướng mới · phiên bản {state.latestApprovedDirection.version}</button>}
          <label className="mt-4 block text-xs font-bold">Ưu tiên tuần này <span className="font-normal text-[#879487]">(không bắt buộc)</span><textarea value={focus} maxLength={2000} disabled={locked} onChange={(event) => plan.editFocus(event.target.value)} rows={2} placeholder="Ví dụ: Series mới, quay đơn giản trong một buổi…" className="mt-2 w-full rounded-xl border border-[#E6D4CE] bg-[#FFFDF8] px-4 py-3 text-sm font-normal leading-6" /></label>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" disabled={locked || !state.aiConfigured || !planName.trim()} onClick={() => void plan.run("generate")} className="inline-flex items-center gap-2 rounded-xl bg-[#284D31] px-5 py-3 text-sm font-bold text-white disabled:opacity-40">{busy === "all" ? <LoaderCircle size={17} className="animate-spin" /> : <Sparkles size={17} />}{selectedVersion ? "AI sắp lại kế hoạch" : "AI lên kế hoạch"}</button>
            <button type="button" onClick={onSettings} className="rounded-lg px-2 py-2 text-xs font-bold text-[#3F8240]">{state.aiConfigured ? "Cài đặt AI" : "Thêm Google API key"}</button>
          </div>
          {busy && <p role="status" className="mt-4 flex items-center gap-2 text-sm text-[#3F8240]"><LoaderCircle size={16} className="animate-spin" />{busy === "draft" || busy === "approved" ? "Đang lưu kế hoạch…" : "Emsen đang xếp lịch phù hợp…"}</p>}
        </section>

        {items.length > 0 && <ContentMatrix direction={direction} items={items} onSelectItem={showItem} />}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7" aria-label="Chọn nội dung trong lịch">
          {items.map((item) => <button type="button" key={item.id} aria-pressed={selectedItemId === item.id} onClick={() => setSelectedItemId(item.id)} className={`min-w-0 rounded-2xl border p-3 text-left ${selectedItemId === item.id ? "border-[#72B65D] bg-[#FFF0EC]" : "border-[#EAD9D2] bg-white hover:bg-[#FBFDF7]"}`}><span className="text-[11px] font-bold text-[#3F8240]">{planDate(weekStart, item.dayIndex)}</span><span className="mt-2 block line-clamp-3 text-xs font-semibold leading-5">{item.title || "Ý tưởng chờ nảy mầm"}</span><span className="mt-2 block text-[10px] text-[#748A74]">{item.platform} · {item.objective}</span></button>)}
        </div>

        <div ref={editor} className="scroll-mt-6">{selected && <PlanDayEditor item={selected} direction={direction} weekStart={weekStart} disabled={locked} canGenerate={state.aiConfigured && complete && scheduleCompatible} onChange={(patch) => plan.editItem(selected.id, patch)} onRegenerate={() => void plan.run("generate", selected.id)} />}</div>

        {!scheduleCompatible && <p role="alert" className="rounded-xl border border-[#F0D6A8] bg-[#FFF7E8] p-4 text-sm text-[#856B3A]">Lịch hiện tại chưa khớp ngày rảnh hoặc mục tiêu mới. Hãy để AI sắp lại kế hoạch.</p>}

        <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#DDEBD6] bg-white p-5">
          <button type="button" disabled={locked || !readyToSave} onClick={() => void plan.run("draft")} className="inline-flex items-center gap-2 rounded-xl border border-[#C8DBC1] px-4 py-3 text-sm font-bold disabled:opacity-40"><Save size={16} /> Lưu bản nháp</button>
          <button type="button" disabled={locked || !readyToSave || (!dirty && selectedRecord?.status === "approved" && selectedVersion === state.versions[0]?.version)} onClick={() => void plan.run("approved")} className="inline-flex items-center gap-2 rounded-xl bg-[#527F56] px-5 py-3 text-sm font-bold text-white disabled:opacity-40"><Check size={16} /> Chốt kế hoạch</button>
          <p className="text-xs leading-5 text-[#748A74]">{readyToSave ? `${items.length} nội dung đã sẵn sàng.` : "Hoàn thiện nội dung hoặc nhờ AI sắp lịch."}</p>
        </section>

        <section className="rounded-[24px] border border-[#DDEBD6] bg-white p-5">
          <h3 className="font-bold">Lịch sử kế hoạch</h3>
          <p className="mt-1 text-xs text-[#748A74]">Mỗi lần lưu tạo một phiên bản; kịch bản chỉ đồng bộ khi bạn chốt.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {state.versions.length === 0 && <p className="text-xs text-[#748A74]">Chưa có phiên bản đã lưu.</p>}
            {state.versions.map((version) => <button type="button" disabled={locked} aria-pressed={selectedVersion === version.version} key={version.id} onClick={() => plan.selectVersion(version)} className={`rounded-xl border px-3 py-2 text-left text-xs ${selectedVersion === version.version ? "border-[#72B65D] bg-[#FFF0EC]" : "border-[#EAD9D2]"}`}><span className="block font-bold">Phiên bản {version.version} · {version.status === "approved" ? "Đã chốt" : "Nháp"}</span><span className="mt-1 block text-[#748A74]">{version.source === "ai" ? "AI đề xuất" : "Bạn đã lưu"} · {new Date(version.createdAt).toLocaleString("vi-VN")}</span></button>)}
          </div>
        </section>
      </>}
    </section>
  );
}
