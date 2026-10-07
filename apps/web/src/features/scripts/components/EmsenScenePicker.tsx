import { useState } from "react";
import { LoaderCircle } from "lucide-react";

const presets = [
  { id: "presenting", label: "Giới thiệu", src: "/Avatar.png" },
  { id: "waving", label: "Chào / mở đầu", src: "/avatarActivities/waving.png" },
  { id: "happy", label: "Hào hứng", src: "/avatarEmotions/happy.png" },
  { id: "suprise", label: "Ngạc nhiên", src: "/avatarEmotions/suprise.png" },
  { id: "wonder", label: "Suy nghĩ", src: "/avatarEmotions/wonder.png" },
  { id: "cute", label: "Dễ thương", src: "/avatarEmotions/cute.png" },
  { id: "content", label: "Hài lòng", src: "/avatarEmotions/content.png" },
  { id: "standing", label: "Đứng", src: "/avatarActivities/standing.png" },
  { id: "sitting", label: "Ngồi", src: "/avatarActivities/sitting.png" },
  { id: "idea", label: "Nảy ý tưởng", src: "/avatarActivities/idea.png" },
  { id: "checklist", label: "Điểm lại / kết thúc", src: "/avatarActivities/checklist.png" },
  { id: "working", label: "Làm việc", src: "/avatarActivities/working.png" },
  { id: "writing", label: "Ghi chép", src: "/avatarActivities/writing.png" },
] as const;

export type EmsenScenePreset = typeof presets[number];

export function EmsenScenePicker({ disabled, busy, onChoose }: { disabled: boolean; busy: boolean; onChoose: (preset: EmsenScenePreset) => void }) {
  const [presetId, setPresetId] = useState<string>(presets[0].id);
  const preset = presets.find((item) => item.id === presetId) ?? presets[0];
  return <details className="rounded-xl border border-[#D5E6C9] bg-[#F5FAF0] p-3">
    <summary className="flex cursor-pointer items-center gap-2 text-xs font-bold text-[#416B43]">
      <img src="/Avatar.png" alt="" className="h-8 w-8 object-contain" />
      <span>Dùng avatar Emsen gốc<span className="mt-0.5 block text-[10px] font-normal text-[#748A74]">Không tốn lượt tạo ảnh AI</span></span>
    </summary>
    <div className="mt-3 space-y-3">
      <label className="block text-xs font-bold">Tư thế / biểu cảm Emsen<select disabled={disabled} value={presetId} onChange={(event) => setPresetId(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#D5E6C9] bg-white p-2 text-xs font-normal">{presets.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <div className="flex items-center gap-3 rounded-lg bg-white/70 p-2">
        <img src={preset.src} alt={`Emsen · ${preset.label}`} className="h-28 w-24 shrink-0 object-contain" />
        <div className="min-w-0 space-y-2"><p className="text-[10px] leading-4 text-[#748A74]">Dùng đúng ảnh Emsen sẵn có làm minh họa cho cảnh, kết hợp với lời thoại và lớp chữ.</p><button type="button" disabled={disabled} onClick={() => onChoose(preset)} className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#E2EFD9] px-2 py-2 text-[11px] font-bold text-[#416B43] disabled:opacity-40">{busy && <LoaderCircle size={12} className="animate-spin" />}{busy ? "Đang lưu…" : "Dùng Emsen cho cảnh"}</button></div>
      </div>
      <p className="text-[10px] leading-4 text-[#748A74]">Ảnh này thay minh họa hiện tại của cảnh. Các động tác là tư thế sẵn có; bấm Lưu để giữ lựa chọn.</p>
    </div>
  </details>;
}
