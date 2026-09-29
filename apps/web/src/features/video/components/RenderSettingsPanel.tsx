import { useEffect, useMemo, useState } from "react";
import type { UpdateVideoRenderSettingsRequestDto, VideoProjectDto } from "@creator-flow/contracts";
import {
  Captions,
  Check,
  ChevronDown,
  ChevronUp,
  LoaderCircle,
  Palette,
  ShieldCheck,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";

export type VideoRenderSettingsForm = Omit<UpdateVideoRenderSettingsRequestDto, "revision">;

function fromProject(project: VideoProjectDto): VideoRenderSettingsForm {
  return {
    captionAccentColor: project.settings.captionAccentColor,
    captionPosition: project.settings.captionPosition,
    captionPreset: project.settings.captionPreset,
    captionTextColor: project.settings.captionTextColor,
    showBrandMark: project.settings.showBrandMark,
  };
}

export function RenderSettingsPanel({
  busy,
  onRender,
  onSave,
  project,
}: {
  busy: boolean;
  onRender: (settings: VideoRenderSettingsForm) => Promise<void>;
  onSave: (settings: VideoRenderSettingsForm) => Promise<void>;
  project: VideoProjectDto;
}) {
  const [settings, setSettings] = useState(() => fromProject(project));
  const [advanced, setAdvanced] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [action, setAction] = useState<"render" | "save" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setSettings(fromProject(project));
    setError("");
  }, [project.id, project.settings.renderSettingsRevision]);

  const saved = useMemo(() => fromProject(project), [project]);
  const changed = JSON.stringify(settings) !== JSON.stringify(saved);

  const run = async (nextAction: "render" | "save") => {
    setAction(nextAction);
    setError("");
    try {
      if (nextAction === "save") await onSave(settings);
      else await onRender(settings);
      if (nextAction === "render") setConfirmOpen(false);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Chưa lưu được cài đặt xuất video.");
    } finally {
      setAction(null);
    }
  };

  return (
    <section className="rounded-[24px] border border-[#D9E8D4] bg-white p-4 shadow-[0_12px_32px_rgba(55,85,57,0.06)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-[#31583A]"><Captions size={17} className="text-[#4E8052]" /> Caption & bản xuất</p>
          <p className="mt-1 text-xs leading-5 text-[#748A74]">Chọn kiểu dễ đọc; Emsen sẽ tự căn theo video sau cắt.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EFF8EB] px-3 py-1.5 text-[10px] font-bold text-[#47794B]"><ShieldCheck size={13} /> 720 × 1280 · MP4</span>
      </div>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div>
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" disabled={busy} onClick={() => setSettings((current) => ({ ...current, captionPreset: "emsen-clean" }))} className={`rounded-2xl border p-3 text-left transition disabled:opacity-60 ${settings.captionPreset === "emsen-clean" ? "border-[#83B977] bg-[#F1F8ED]" : "border-[#E3EAE0] bg-[#FFFEFB]"}`}>
              <span className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-[#31583A]">Emsen Clean</span>{settings.captionPreset === "emsen-clean" && <Check size={15} className="text-[#4E8052]" />}</span>
              <span className="mt-1 block text-[10px] leading-4 text-[#7C8D7C]">Chữ rõ, nền dịu, hợp video dọc.</span>
            </button>
            <button type="button" disabled={busy} onClick={() => setSettings((current) => ({ ...current, captionPreset: "none" }))} className={`rounded-2xl border p-3 text-left transition disabled:opacity-60 ${settings.captionPreset === "none" ? "border-[#83B977] bg-[#F1F8ED]" : "border-[#E3EAE0] bg-[#FFFEFB]"}`}>
              <span className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-[#31583A]">Không phụ đề</span>{settings.captionPreset === "none" && <Check size={15} className="text-[#4E8052]" />}</span>
              <span className="mt-1 block text-[10px] leading-4 text-[#7C8D7C]">Giữ khung hình tối giản.</span>
            </button>
          </div>

          <button type="button" onClick={() => setAdvanced((current) => !current)} className="mt-3 inline-flex items-center gap-2 rounded-xl px-2 py-2 text-xs font-bold text-[#5C745E] hover:bg-[#F2F7EF]"><Palette size={15} /> Tinh chỉnh nâng cao {advanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
          {advanced && (
            <div className="mt-2 grid gap-3 rounded-2xl border border-[#E3EAE0] bg-[#FAFCF8] p-3 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#7C8D7C]">Vị trí caption</p>
                <div className="mt-2 flex gap-2">
                  {(["lower-third", "center"] as const).map((position) => <button key={position} type="button" disabled={settings.captionPreset === "none" || busy} onClick={() => setSettings((current) => ({ ...current, captionPosition: position }))} className={`rounded-xl border px-3 py-2 text-[11px] font-bold disabled:opacity-40 ${settings.captionPosition === position ? "border-[#78AB70] bg-white text-[#3F7145]" : "border-[#DCE6D8] text-[#748A74]"}`}>{position === "lower-third" ? "Phía dưới" : "Chính giữa"}</button>)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[10px] font-bold text-[#6C806C]">Màu chữ<input type="color" disabled={settings.captionPreset === "none" || busy} value={settings.captionTextColor} onChange={(event) => setSettings((current) => ({ ...current, captionTextColor: event.target.value.toUpperCase() }))} className="mt-1 block h-9 w-full cursor-pointer rounded-lg border border-[#DCE6D8] bg-white p-1 disabled:opacity-40" /></label>
                <label className="text-[10px] font-bold text-[#6C806C]">Màu nhấn<input type="color" disabled={settings.captionPreset === "none" || busy} value={settings.captionAccentColor} onChange={(event) => setSettings((current) => ({ ...current, captionAccentColor: event.target.value.toUpperCase() }))} className="mt-1 block h-9 w-full cursor-pointer rounded-lg border border-[#DCE6D8] bg-white p-1 disabled:opacity-40" /></label>
              </div>
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#DCE6D8] bg-white px-3 py-2.5 text-xs font-bold text-[#526B55] sm:col-span-2"><span>Gắn logo Emsen nhỏ ở góc</span><input type="checkbox" disabled={busy} checked={settings.showBrandMark} onChange={(event) => setSettings((current) => ({ ...current, showBrandMark: event.target.checked }))} className="h-4 w-4 accent-[#4E8052]" /></label>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button type="button" disabled={!changed || busy || action !== null} onClick={() => void run("save")} className="rounded-xl border border-[#CADBC5] px-4 py-2.5 text-xs font-bold text-[#4F7053] disabled:cursor-not-allowed disabled:opacity-40">{action === "save" ? <span className="inline-flex items-center gap-2"><LoaderCircle size={14} className="animate-spin" /> Đang lưu</span> : "Lưu kiểu hiển thị"}</button>
            <button type="button" disabled={busy || action !== null} onClick={() => setConfirmOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#4E8052] px-4 py-2.5 text-xs font-bold text-white shadow-[0_8px_18px_rgba(55,100,58,0.16)] disabled:opacity-50"><WandSparkles size={15} /> {project.finalOutput ? "Xuất bản mới" : "Xuất video hoàn chỉnh"}</button>
            {changed && <span className="text-[10px] text-[#8A9589]">Thay đổi sẽ được lưu khi xuất.</span>}
          </div>
          {error && <p role="alert" className="mt-3 rounded-xl bg-[#FFF0EC] px-3 py-2.5 text-xs text-[#9A4B42]">{error}</p>}
        </div>

        <div className="mx-auto w-[180px] rounded-[26px] border-[5px] border-[#263229] bg-[#1B241D] p-2 shadow-[0_16px_30px_rgba(29,47,31,0.18)]">
          <div className="relative aspect-[9/16] overflow-hidden rounded-[17px] bg-gradient-to-b from-[#789B72] via-[#C7D6BC] to-[#6D7F67]">
            <div className="absolute inset-x-4 top-[38%] h-24 rounded-full bg-white/10 blur-xl" />
            {settings.showBrandMark && <img src="/Avatar.png" alt="" className="absolute right-2 top-2 h-8 w-8 object-contain" />}
            {settings.captionPreset === "emsen-clean" ? <div style={{ bottom: settings.captionPosition === "lower-third" ? "18%" : "44%", color: settings.captionTextColor, borderColor: settings.captionAccentColor }} className="absolute inset-x-3 rounded-lg border-2 bg-[#142218]/75 px-2 py-1.5 text-center text-[9px] font-bold leading-3 shadow-lg">Nội dung rõ ràng,<br />dễ xem hơn</div> : <span className="absolute inset-x-3 bottom-4 text-center text-[9px] font-bold text-white/65">Không phụ đề</span>}
          </div>
          <p className="py-1.5 text-center text-[9px] font-bold text-white/65">Xem trước phong cách</p>
        </div>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-[#172119]/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="confirm-render-title">
          <div className="w-full max-w-md rounded-[24px] border border-[#DDE8D9] bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#EAF6E4] text-[#3F8240]"><Sparkles size={20} /></span><button type="button" disabled={action === "render"} onClick={() => setConfirmOpen(false)} aria-label="Đóng" className="rounded-lg p-2 text-[#7F8C7F] hover:bg-[#F1F5EF]"><X size={18} /></button></div>
            <h3 id="confirm-render-title" className="mt-4 text-lg font-bold text-[#284D31]">Xuất video hoàn chỉnh?</h3>
            <p className="mt-2 text-sm leading-6 text-[#708171]">Emsen sẽ áp dụng Smart Cut đã duyệt, caption hiện tại và cân bằng âm lượng. Quá trình tiếp tục ở nền và không thay đổi video gốc.</p>
            <div className="mt-4 rounded-2xl bg-[#F3F8F0] p-3 text-xs leading-5 text-[#58705A]"><b>{settings.captionPreset === "emsen-clean" ? "Emsen Clean" : "Không phụ đề"}</b> · {settings.showBrandMark ? "Có logo" : "Không logo"} · MP4 dọc 720 × 1280</div>
            <div className="mt-5 flex justify-end gap-2"><button type="button" disabled={action === "render"} onClick={() => setConfirmOpen(false)} className="rounded-xl px-4 py-2.5 text-xs font-bold text-[#657766]">Để sau</button><button type="button" disabled={action === "render"} onClick={() => void run("render")} className="inline-flex items-center gap-2 rounded-xl bg-[#4E8052] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60">{action === "render" ? <LoaderCircle size={15} className="animate-spin" /> : <WandSparkles size={15} />} Xác nhận xuất</button></div>
          </div>
        </div>
      )}
    </section>
  );
}
