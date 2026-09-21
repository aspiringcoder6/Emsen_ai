import { useEffect, useMemo, useState } from "react";
import type {
  CreateVideoProjectRequestDto,
  VideoCaptionPreset,
  VideoProjectScriptOptionDto,
} from "@creator-flow/contracts";
import { AlertCircle, Captions, Clapperboard, Clock3, LoaderCircle, X } from "lucide-react";

export function CreateVideoProjectPanel({
  busy,
  initialScriptId,
  scripts,
  onClose,
  onCreate,
  onOpenScripts,
}: {
  busy: boolean;
  initialScriptId: string | null;
  scripts: VideoProjectScriptOptionDto[];
  onClose: () => void;
  onCreate: (input: CreateVideoProjectRequestDto) => void;
  onOpenScripts: () => void;
}) {
  const firstCompatible = scripts.find((script) => script.compatible)?.id ?? "";
  const [scriptId, setScriptId] = useState(() => (
    scripts.some((script) => script.id === initialScriptId) ? initialScriptId! : firstCompatible
  ));
  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [captionPreset, setCaptionPreset] = useState<VideoCaptionPreset>("emsen-clean");
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const selected = useMemo(() => scripts.find((script) => script.id === scriptId) ?? null, [scriptId, scripts]);

  useEffect(() => {
    if (!titleTouched && selected) setTitle(`Dựng video · ${selected.title}`.slice(0, 250));
  }, [selected, titleTouched]);

  const submit = () => {
    if (!selected?.compatible || busy) return;
    onCreate({ captionPreset, idempotencyKey, scriptId: selected.id, title: title.trim() });
  };

  return (
    <section className="rounded-[26px] border border-[#D8E8D2] bg-white p-5 shadow-[0_18px_50px_rgba(48,74,50,0.1)] sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#EAF6E4] text-[#3F8240]"><Clapperboard size={21} /></span>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-[#284D31]">Tạo dự án dựng video</h3>
          <p className="mt-1 text-xs leading-5 text-[#748A74]">Emsen lấy thời lượng, lời thoại và storyboard từ kịch bản để chuẩn bị các bước dựng.</p>
        </div>
        <button type="button" onClick={onClose} disabled={busy} aria-label="Đóng" className="rounded-lg p-1.5 text-[#748A74] hover:bg-[#F4FAF0]"><X size={17} /></button>
      </div>

      {scripts.length ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <label className="text-xs font-bold text-[#526952]">
            Kịch bản dùng để dựng
            <select value={scriptId} onChange={(event) => setScriptId(event.target.value)} className="mt-2 w-full rounded-xl border border-[#E5DED8] bg-[#FFFDF8] px-3 py-3 text-sm font-semibold text-[#31583A] outline-none focus:border-[#72B65D]">
              <option value="">Chọn một kịch bản</option>
              {scripts.map((script) => (
                <option disabled={!script.compatible} key={script.id} value={script.id}>
                  {script.title} · {script.targetDurationSeconds}s{script.projectCount ? ` · ${script.projectCount} dự án` : ""}{script.compatible ? "" : " · chưa phù hợp MVP"}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold text-[#526952]">
            Tên dự án
            <input value={title} maxLength={250} onChange={(event) => { setTitleTouched(true); setTitle(event.target.value); }} placeholder="Ví dụ: Video giới thiệu đầu tiên" className="mt-2 w-full rounded-xl border border-[#E5DED8] bg-[#FFFDF8] px-3 py-3 text-sm font-semibold text-[#31583A] outline-none focus:border-[#72B65D]" />
          </label>

          <div className="rounded-2xl border border-[#E1EADB] bg-[#F8FBF6] p-4">
            <p className="flex items-center gap-2 text-xs font-bold text-[#31583A]"><Clock3 size={15} className="text-[#3F8240]" /> Khung video MVP</p>
            <p className="mt-2 text-xs leading-5 text-[#748A74]">Video dọc 9:16 · thành phẩm 30–180 giây · một người nói chính.</p>
            {selected && <p className="mt-2 text-xs font-semibold text-[#526952]">Kịch bản đã chọn: {selected.aspectRatio} · {selected.targetDurationSeconds} giây.</p>}
          </div>

          <fieldset className="rounded-2xl border border-[#E9DDE7] bg-[#FCF8FB] p-4">
            <legend className="px-1 text-xs font-bold text-[#72506B]">Phụ đề khi render</legend>
            <label className="mt-1 flex cursor-pointer items-start gap-3 rounded-xl bg-white p-3">
              <input type="radio" name="caption-preset" checked={captionPreset === "emsen-clean"} onChange={() => setCaptionPreset("emsen-clean")} className="mt-0.5 accent-[#4E8052]" />
              <span><strong className="flex items-center gap-1.5 text-xs text-[#31583A]"><Captions size={14} /> Emsen Clean</strong><span className="mt-1 block text-[11px] leading-4 text-[#748A74]">Phụ đề rõ, nhẹ và ưu tiên khả năng đọc.</span></span>
            </label>
            <label className="mt-2 flex cursor-pointer items-center gap-3 px-3 text-xs text-[#526952]"><input type="radio" name="caption-preset" checked={captionPreset === "none"} onChange={() => setCaptionPreset("none")} className="accent-[#4E8052]" /> Chưa thêm phụ đề</label>
          </fieldset>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-[#CFDFC8] bg-[#F8FBF6] p-7 text-center">
          <p className="text-sm font-bold text-[#31583A]">Bạn cần một kịch bản trước khi dựng video.</p>
          <p className="mt-1 text-xs text-[#748A74]">Kịch bản giúp Emsen biết thời lượng, lời thoại và các cảnh cần có.</p>
          <button type="button" onClick={onOpenScripts} className="mt-4 rounded-xl bg-[#4E8052] px-4 py-2.5 text-xs font-bold text-white">Mở trang Kịch bản</button>
        </div>
      )}

      {selected?.incompatibilityReason && (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-[#F0D6A8] bg-[#FFF7E8] p-3 text-xs leading-5 text-[#7C6238]"><AlertCircle size={15} className="mt-0.5 shrink-0" /> {selected.incompatibilityReason} Hãy chỉnh thông số trong kịch bản trước.</p>
      )}

      {scripts.length > 0 && (
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-[#DDE8D6] px-4 py-2.5 text-sm font-bold text-[#526952]">Để sau</button>
          <button type="button" onClick={submit} disabled={busy || !selected?.compatible || !title.trim()} className="inline-flex items-center gap-2 rounded-xl bg-[#4E8052] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40">
            {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Clapperboard size={16} />}
            {busy ? "Đang chuẩn bị" : "Tạo dự án"}
          </button>
        </div>
      )}
    </section>
  );
}
