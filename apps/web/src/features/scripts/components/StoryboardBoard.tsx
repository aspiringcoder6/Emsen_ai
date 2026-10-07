import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { ScriptSettingsDto, ScriptStoryboardFrameDto, StoryboardTextOverlayDto } from "@creator-flow/contracts";
import { ArrowDown, ArrowUp, Check, GripVertical, ImagePlus, LoaderCircle, LockKeyhole, Plus, Sparkles, Trash2, UnlockKeyhole } from "lucide-react";
import { getStoryboardAsset, uploadStoryboardAsset } from "../scriptApi";
import { StoryboardImageGenerator } from "./StoryboardImageGenerator";
import { EmsenScenePicker, type EmsenScenePreset } from "./EmsenScenePicker";

const inputClass = "mt-1.5 w-full rounded-xl border border-[#E1E7DC] bg-[#FFFDF8] px-3 py-2 text-sm font-normal leading-6 text-[#31583A] outline-none focus:border-[#72B65D]";
const defaultOverlay: StoryboardTextOverlayDto = { text: "", font: "sans", color: "#FFFFFF", backgroundColor: "#284D31", position: "bottom", size: "medium" };
const fonts = { sans: 'Arial, "Segoe UI", sans-serif', serif: 'Georgia, "Times New Roman", serif', mono: '"Courier New", monospace' };
const inspectorTabs = [
  { id: "content", label: "Nội dung" },
  { id: "image", label: "Hình ảnh" },
  { id: "text", label: "Chữ" },
  { id: "shooting", label: "Quay" },
] as const;
type InspectorTab = typeof inspectorTabs[number]["id"];

function ScenePreview({ scriptId, frame, aspectRatio }: { scriptId: string; frame: ScriptStoryboardFrameDto; aspectRatio: ScriptSettingsDto["aspectRatio"] }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let cancelled = false;
    let refreshTimer: number | undefined;
    setUrl("");
    setError(false);
    setLoading(Boolean(frame.illustrationAssetId));
    if (frame.illustrationAssetId) {
      void getStoryboardAsset(scriptId, frame.illustrationAssetId).then((asset) => {
        if (cancelled) return;
        setUrl(asset.imageUrl);
        setLoading(false);
        refreshTimer = window.setTimeout(() => setReload((value) => value + 1), Math.max(10_000, new Date(asset.expiresAt).getTime() - Date.now() - 15_000));
      }).catch(() => { if (!cancelled) { setError(true); setLoading(false); } });
    }
    return () => { cancelled = true; window.clearTimeout(refreshTimer); };
  }, [scriptId, frame.illustrationAssetId, reload]);
  const overlay = frame.onScreenText ?? defaultOverlay;
  return <div className="relative overflow-hidden rounded-xl bg-[#EAF0E4]" style={{ aspectRatio: aspectRatio.replace(":", " / "), containerType: "inline-size" }}>
    {url && !error ? <img src={url} alt={`Minh họa ${frame.title}`} className="absolute inset-0 h-full w-full object-contain" onError={() => setError(true)} /> : <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#DDEBD4] via-[#F4F5ED] to-[#EDDFEA] p-5 text-center">
      {loading ? <LoaderCircle size={24} className="animate-spin text-[#789472]" /> : <ImagePlus size={30} className="text-[#91A787]" />}
      <p className="text-[11px] leading-5 text-[#637B60]">{error ? "Ảnh chưa tải được. Hãy thử tải lại trang." : loading ? "Đang tải ảnh…" : frame.visual || "Thêm ảnh để hình dung cảnh quay"}</p>
    </div>}
    {overlay.text && <div className="pointer-events-none absolute left-[6%] right-[6%] max-h-[80%] overflow-hidden rounded-lg px-[4%] py-[3%] text-center font-bold leading-tight whitespace-pre-wrap break-words" style={{
      color: overlay.color, backgroundColor: overlay.backgroundColor, fontFamily: fonts[overlay.font], fontSize: overlay.size === "small" ? "5cqw" : overlay.size === "large" ? "9cqw" : "7cqw",
      ...(overlay.position === "top" ? { top: "8%" } : overlay.position === "center" ? { top: "50%", transform: "translateY(-50%)" } : { bottom: "8%" }),
    }}>{overlay.text}</div>}
  </div>;
}

function readImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Chưa thể đọc ảnh này."));
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.readAsDataURL(file);
  });
}

export function StoryboardBoard({ scriptId, scriptRevision, frames, settings, disabled, assistantOpen, assistant, onToggleAssistant, onChange, onUploadBusy }: {
  scriptId: string;
  scriptRevision: number;
  frames: ScriptStoryboardFrameDto[];
  settings: ScriptSettingsDto;
  disabled: boolean;
  assistantOpen: boolean;
  assistant: ReactNode;
  onToggleAssistant: () => void;
  onChange: (frames: ScriptStoryboardFrameDto[]) => void;
  onUploadBusy: (busy: boolean) => void;
}) {
  const [selectedId, setSelectedId] = useState(frames[0]?.id ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("content");
  const inspectorId = useId();
  const assistantId = useId();
  const assistantRef = useRef<HTMLDivElement>(null);
  const assistantButtonRef = useRef<HTMLButtonElement>(null);
  const assistantWasOpen = useRef(false);
  const inspectorBodyRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const framesRef = useRef(frames);
  const changeRef = useRef(onChange);
  const mounted = useRef(false);
  framesRef.current = frames;
  changeRef.current = onChange;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { onUploadBusy(uploading); return () => onUploadBusy(false); }, [uploading, onUploadBusy]);
  useEffect(() => { setNotice(""); }, [scriptRevision]);
  const selected = frames.find((frame) => frame.id === selectedId) ?? frames[0];
  const selectedIndex = selected ? frames.findIndex((frame) => frame.id === selected.id) : -1;
  const total = frames.reduce((sum, frame) => sum + frame.durationSeconds, 0);
  const overlay = selected?.onScreenText ?? defaultOverlay;
  useEffect(() => {
    if (assistantOpen) assistantRef.current?.scrollIntoView({ block: "start" });
    else if (assistantWasOpen.current) assistantButtonRef.current?.focus();
    assistantWasOpen.current = assistantOpen;
  }, [assistantOpen]);
  useEffect(() => {
    if (inspectorBodyRef.current) inspectorBodyRef.current.scrollTop = 0;
  }, [inspectorTab, selected?.id]);

  function updateFrame(id: string, patch: Partial<ScriptStoryboardFrameDto>) {
    changeRef.current(framesRef.current.map((frame) => frame.id === id ? { ...frame, ...patch } : frame));
  }
  function updateOverlay(patch: Partial<StoryboardTextOverlayDto>) {
    if (selected) updateFrame(selected.id, { onScreenText: { ...overlay, ...patch } });
  }
  function moveScene(id: string, to: number) {
    if (disabled) return;
    const current = [...framesRef.current];
    const from = current.findIndex((frame) => frame.id === id);
    if (from < 0 || to < 0 || to >= current.length || from === to) return;
    const [moving] = current.splice(from, 1);
    current.splice(to, 0, moving!);
    changeRef.current(current);
    setSelectedId(id);
  }
  function addScene() {
    if (frames.length >= 16 || disabled) return;
    const id = crypto.randomUUID();
    onChange([...frames, { id, title: `Cảnh ${frames.length + 1}`, visual: "", visualPurpose: "", broll: "", dialogue: "", emotionalBeat: "", transition: "", retentionRole: "", direction: "", durationSeconds: 5, illustrationAssetId: null, onScreenText: { ...defaultOverlay }, locked: false }]);
    setSelectedId(id);
  }
  async function upload(source: File | (() => Promise<File>), sceneId: string, successNotice = "Ảnh đã tải lên. Bấm Lưu để giữ thay đổi của storyboard.") {
    if (uploading || disabled) return;
    setError(""); setNotice("");
    setUploading(true);
    try {
      const file = typeof source === "function" ? await source() : source;
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 3 * 1024 * 1024 || !file.size) throw new Error("Chọn ảnh PNG, JPEG hoặc WebP, tối đa 3 MB.");
      const asset = await uploadStoryboardAsset(scriptId, { fileName: file.name, mimeType: file.type, dataBase64: await readImage(file) });
      if (!mounted.current || !framesRef.current.some((frame) => frame.id === sceneId)) return;
      updateFrame(sceneId, { illustrationAssetId: asset.id });
      setNotice(successNotice);
    } catch (err) { if (mounted.current) setError(err instanceof Error ? err.message : "Chưa thể tải ảnh lên."); }
    finally { if (mounted.current) setUploading(false); }
  }

  function useEmsen(preset: EmsenScenePreset, sceneId: string) {
    void upload(async () => {
      const response = await fetch(preset.src);
      if (!response.ok) throw new Error("Chưa tải được avatar Emsen. Hãy thử lại.");
      return new File([await response.blob()], `emsen-${preset.id}.png`, { type: "image/png" });
    }, sceneId, "Đã chọn avatar Emsen gốc. Bấm Lưu để giữ trong storyboard.");
  }

  return <section className="space-y-4" aria-label="Storyboard trực quan">
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-[#DDE8D6] bg-white p-4">
      <div><h2 className="text-lg font-bold text-[#284D31]">Hình dung video trước khi quay</h2><p className="mt-1 text-xs leading-5 text-[#748A74]">{frames.length}/16 cảnh · {total}s / mục tiêu {settings.targetDurationSeconds}s · {settings.aspectRatio}</p><p className="mt-1 text-xs text-[#748A74]">Ảnh là tham chiếu để quay. Chữ nằm trên lớp riêng và có thể chỉnh lại.</p></div>
      <div className="flex flex-wrap gap-2"><button ref={assistantButtonRef} type="button" disabled={disabled || uploading} onClick={onToggleAssistant} aria-expanded={assistantOpen} aria-controls={assistantId} className={`inline-flex items-center gap-2 rounded-xl border border-[#D7CCDA] px-3 py-2.5 text-xs font-bold text-[#72506B] disabled:opacity-40 ${assistantOpen ? "bg-[#F3EAF1]" : ""}`}><Sparkles size={14} /> Nhờ Emsen chia cảnh</button><button type="button" onClick={addScene} disabled={disabled || frames.length >= 16} className="inline-flex items-center gap-2 rounded-xl bg-[#4E8052] px-3 py-2.5 text-xs font-bold text-white disabled:opacity-40"><Plus size={14} /> Thêm cảnh</button></div>
    </div>
    <div id={assistantId} ref={assistantRef} hidden={!assistantOpen} className="scroll-mt-[var(--script-toolbar-offset,160px)]" onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); onToggleAssistant(); } }}>{assistantOpen && assistant}</div>
    {error && <p role="alert" className="rounded-xl bg-[#FFF0EC] p-3 text-sm text-[#9A4B42]">{error}</p>}
    {notice && <p role="status" className="flex items-center gap-2 rounded-xl bg-[#EAF6E4] p-3 text-xs text-[#3F8240]"><Check size={14} />{notice}</p>}
    {frames.length > 0 && total !== settings.targetDurationSeconds && <p className="text-xs text-[#A06F3F]">Thời lượng các cảnh đang {total < settings.targetDurationSeconds ? "ngắn hơn" : "dài hơn"} mục tiêu {Math.abs(total - settings.targetDurationSeconds)} giây. Bạn có thể chỉnh từng cảnh.</p>}
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_350px]">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {frames.map((frame, index) => <div key={frame.id} draggable={!disabled} onDragStart={(event) => { setDraggedId(frame.id); event.dataTransfer.setData("text/plain", frame.id); event.dataTransfer.effectAllowed = "move"; }} onDragEnd={() => setDraggedId(null)} onDragOver={(event) => { if (!disabled && draggedId) event.preventDefault(); }} onDrop={(event) => { event.preventDefault(); if (draggedId) moveScene(draggedId, index); setDraggedId(null); }} className={`overflow-hidden rounded-2xl border bg-white transition ${selected?.id === frame.id ? "border-[#72B65D] ring-2 ring-[#DDEED6]" : "border-[#DFE7D9]"} ${draggedId === frame.id ? "opacity-50" : ""}`}>
          <button type="button" disabled={disabled} aria-pressed={selected?.id === frame.id} aria-label={`Chọn cảnh ${index + 1}: ${frame.title}`} onClick={() => setSelectedId(frame.id)} className="block w-full p-2.5 text-left">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-[#748A74]"><GripVertical size={12} /><span className="flex-1">Cảnh {index + 1}</span>{frame.locked && <LockKeyhole size={12} aria-label="Đã khóa" />}<span>{frame.durationSeconds}s</span></div>
            <ScenePreview scriptId={scriptId} frame={frame} aspectRatio={settings.aspectRatio} />
            <p className="mt-2 truncate text-sm font-bold text-[#31583A]">{frame.title}</p><p className="mt-1 line-clamp-2 min-h-8 text-[11px] leading-4 text-[#879487]">{frame.dialogue || "Chưa có lời thoại"}</p>
          </button>
        </div>)}
        {!frames.length && <div className="col-span-full flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-[#C9D8C2] bg-[#F7FAF3] p-8 text-center"><ImagePlus size={38} className="text-[#8CA47F]" /><h3 className="mt-4 font-bold text-[#31583A]">Cảnh đầu tiên sẽ trông như thế nào?</h3><p className="mt-2 max-w-sm text-sm leading-6 text-[#748A74]">Thêm cảnh thủ công, hoặc nhờ Emsen chia lời thoại thành các cảnh rồi tải ảnh minh họa.</p><button type="button" disabled={disabled} onClick={addScene} className="mt-5 rounded-xl bg-[#4E8052] px-4 py-2.5 text-sm font-bold text-white">Thêm cảnh đầu tiên</button></div>}
      </div>
      {selected && <fieldset disabled={disabled} aria-label={`Chỉnh cảnh ${selectedIndex + 1}`} className="flex max-h-[min(680px,75dvh)] min-w-0 flex-col overflow-hidden rounded-2xl border border-[#DDE8D6] bg-white lg:sticky lg:top-[var(--script-toolbar-offset,160px)] lg:max-h-[calc(100dvh-var(--script-toolbar-offset,160px)-6rem)]">
        <div className="shrink-0 space-y-2 border-b border-[#EDF2E8] p-4 pb-3">
          <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-bold">Chỉnh cảnh {selectedIndex + 1}</h3><button type="button" onClick={() => updateFrame(selected.id, { locked: !selected.locked })} title="Khóa giữ nguyên nội dung khi Emsen chia lại; bạn vẫn chỉnh tay được" className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold ${selected.locked ? "bg-[#F3EAF1] text-[#72506B]" : "bg-[#F3F7EE] text-[#748A74]"}`}>{selected.locked ? <LockKeyhole size={13} /> : <UnlockKeyhole size={13} />}{selected.locked ? "Đã khóa" : "Khóa cảnh"}</button></div>
          <p className="truncate text-xs text-[#748A74]" title={selected.title}>{selected.title || "Cảnh chưa đặt tên"}</p>
          <div className="flex gap-2"><button type="button" disabled={selectedIndex === 0} onClick={() => moveScene(selected.id, selectedIndex - 1)} aria-label="Đưa cảnh lên" className="rounded-lg border border-[#DFE7D9] p-2 disabled:opacity-30"><ArrowUp size={15} /></button><button type="button" disabled={selectedIndex === frames.length - 1} onClick={() => moveScene(selected.id, selectedIndex + 1)} aria-label="Đưa cảnh xuống" className="rounded-lg border border-[#DFE7D9] p-2 disabled:opacity-30"><ArrowDown size={15} /></button><button type="button" disabled={uploading} onClick={() => onChange(frames.filter((frame) => frame.id !== selected.id))} className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs text-[#A15B55]"><Trash2 size={14} /> Xóa cảnh</button></div>
        </div>
        <div role="tablist" aria-label="Các phần chỉnh cảnh" className="grid shrink-0 grid-cols-4 gap-1 border-b border-[#EDF2E8] p-2">
          {inspectorTabs.map((tab, index) => <button
            key={tab.id}
            ref={(button) => { tabRefs.current[index] = button; }}
            id={`${inspectorId}-tab-${tab.id}`}
            role="tab"
            type="button"
            aria-selected={inspectorTab === tab.id}
            aria-controls={`${inspectorId}-panel-${tab.id}`}
            tabIndex={inspectorTab === tab.id ? 0 : -1}
            onClick={() => setInspectorTab(tab.id)}
            onKeyDown={(event) => {
              const nextIndex = event.key === "ArrowRight" ? (index + 1) % inspectorTabs.length
                : event.key === "ArrowLeft" ? (index + inspectorTabs.length - 1) % inspectorTabs.length
                  : event.key === "Home" ? 0 : event.key === "End" ? inspectorTabs.length - 1 : null;
              if (nextIndex === null) return;
              event.preventDefault();
              setInspectorTab(inspectorTabs[nextIndex]!.id);
              tabRefs.current[nextIndex]?.focus();
            }}
            className={`rounded-lg px-1 py-2.5 text-xs font-bold transition ${inspectorTab === tab.id ? "bg-[#EAF6E4] text-[#31583A]" : "text-[#879487] hover:bg-[#F6F8F1]"}`}
          >{tab.label}</button>)}
        </div>
        <div ref={inspectorBodyRef} className="flow-scrollbar min-h-0 overflow-y-auto overscroll-contain p-4">
          <div role="tabpanel" id={`${inspectorId}-panel-content`} aria-labelledby={`${inspectorId}-tab-content`} hidden={inspectorTab !== "content"}>
            <div className="space-y-4">
              <label className="block text-xs font-bold">Tên cảnh<input className={inputClass} maxLength={120} value={selected.title} onChange={(event) => updateFrame(selected.id, { title: event.target.value })} /></label>
              <label className="block text-xs font-bold">Lời thoại / voice-over<textarea className={inputClass} maxLength={4000} rows={3} value={selected.dialogue} onChange={(event) => updateFrame(selected.id, { dialogue: event.target.value })} /></label>
              <label className="block text-xs font-bold">Thời lượng cảnh (giây)<input type="number" min={0} max={600} step={1} className={inputClass} value={selected.durationSeconds} onChange={(event) => updateFrame(selected.id, { durationSeconds: Math.max(0, Math.min(600, Math.round(Number(event.target.value)))) })} /></label>
              <label className="block text-xs font-bold">Nhịp cảm xúc<input className={inputClass} maxLength={1000} value={selected.emotionalBeat} onChange={(event) => updateFrame(selected.id, { emotionalBeat: event.target.value })} /></label>
            </div>
          </div>
          {/* Keep panels mounted so changing tabs preserves image prompts and jobs in progress. */}
          <div role="tabpanel" id={`${inspectorId}-panel-image`} aria-labelledby={`${inspectorId}-tab-image`} hidden={inspectorTab !== "image"}>
            <div className="space-y-4">
              <label className="block text-xs font-bold">Hình ảnh / hành động<textarea className={inputClass} maxLength={2000} rows={2} value={selected.visual} onChange={(event) => updateFrame(selected.id, { visual: event.target.value })} placeholder="Bạn đứng cạnh bàn, mở sổ và nhìn vào camera…" /></label>
              <EmsenScenePicker disabled={disabled || uploading} busy={uploading} onChoose={(preset) => useEmsen(preset, selected.id)} />
              <div>
                <div className="flex flex-wrap gap-2"><label className={`inline-flex items-center gap-2 rounded-xl border border-[#C8DBC1] px-3 py-2 text-xs font-bold ${uploading || disabled ? "cursor-wait opacity-50" : "cursor-pointer"}`}>{uploading ? <LoaderCircle size={14} className="animate-spin" /> : <ImagePlus size={14} />}{uploading ? "Đang lưu ảnh…" : selected.illustrationAssetId ? "Đổi ảnh" : "Tải ảnh minh họa"}<input type="file" className="sr-only" aria-label="Tải ảnh minh họa" accept="image/png,image/jpeg,image/webp" disabled={uploading || disabled} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file, selected.id); event.target.value = ""; }} /></label>{selected.illustrationAssetId && <button type="button" disabled={uploading} onClick={() => updateFrame(selected.id, { illustrationAssetId: null })} className="text-xs text-[#A15B55]">Gỡ ảnh khỏi cảnh</button>}</div>
                <p className="mt-2 text-[11px] text-[#879487]">PNG, JPEG, WebP · tối đa 3 MB · lưu riêng tư</p>
              </div>
              <StoryboardImageGenerator scriptId={scriptId} scriptRevision={scriptRevision} frame={selected} aspectRatio={settings.aspectRatio} disabled={disabled || uploading} onUseImage={(sceneId, assetId) => { const current = framesRef.current.find((frame) => frame.id === sceneId); if (!current || current.locked) return; updateFrame(sceneId, { illustrationAssetId: assetId }); setNotice("Đã chọn ảnh AI. Bấm Lưu để giữ thay đổi của storyboard."); }} />
            </div>
          </div>
          <div role="tabpanel" id={`${inspectorId}-panel-text`} aria-labelledby={`${inspectorId}-tab-text`} hidden={inspectorTab !== "text"}>
            <div className="space-y-4">
              <label className="block text-xs font-bold">Chữ trên màn hình<textarea className={inputClass} maxLength={300} rows={2} value={overlay.text} onChange={(event) => updateOverlay({ text: event.target.value })} placeholder="Một việc nhỏ hôm nay" /></label>
              <div className="grid grid-cols-2 gap-3"><label className="text-xs font-bold">Font<select className={inputClass} value={overlay.font} onChange={(event) => updateOverlay({ font: event.target.value as StoryboardTextOverlayDto["font"] })}><option value="sans">Sans · Arial</option><option value="serif">Serif · Georgia</option><option value="mono">Mono · Courier</option></select></label><label className="text-xs font-bold">Cỡ chữ<select className={inputClass} value={overlay.size} onChange={(event) => updateOverlay({ size: event.target.value as StoryboardTextOverlayDto["size"] })}><option value="small">Nhỏ</option><option value="medium">Vừa</option><option value="large">Lớn</option></select></label><label className="text-xs font-bold">Màu chữ<input className="mt-2 block h-8 w-full rounded" type="color" value={overlay.color} onChange={(event) => updateOverlay({ color: event.target.value })} /></label><label className="text-xs font-bold">Màu nền chữ<input className="mt-2 block h-8 w-full rounded" type="color" value={overlay.backgroundColor} onChange={(event) => updateOverlay({ backgroundColor: event.target.value })} /></label></div>
              <label className="block text-xs font-bold">Vị trí chữ<select className={inputClass} value={overlay.position} onChange={(event) => updateOverlay({ position: event.target.value as StoryboardTextOverlayDto["position"] })}><option value="top">Phía trên</option><option value="center">Chính giữa</option><option value="bottom">Phía dưới</option></select></label>
              <p className="text-[10px] leading-4 text-[#879487]">Chữ dài có thể vượt khung. Nên dùng một ý ngắn cho mỗi cảnh.</p>
            </div>
          </div>
          <div role="tabpanel" id={`${inspectorId}-panel-shooting`} aria-labelledby={`${inspectorId}-tab-shooting`} hidden={inspectorTab !== "shooting"}>
            <div className="space-y-4">
              <label className="block text-xs font-bold">Chỉ dẫn quay<textarea className={inputClass} maxLength={2000} rows={2} value={selected.direction} onChange={(event) => updateFrame(selected.id, { direction: event.target.value })} placeholder="Cận cảnh, ánh sáng tự nhiên, camera cố định…" /></label>
              <label className="block text-xs font-bold">Mục đích cảnh<textarea className={inputClass} maxLength={1000} rows={2} value={selected.visualPurpose} onChange={(event) => updateFrame(selected.id, { visualPurpose: event.target.value })} /></label>
              <label className="block text-xs font-bold">B-roll<textarea className={inputClass} maxLength={2000} rows={2} value={selected.broll} onChange={(event) => updateFrame(selected.id, { broll: event.target.value })} /></label>
              <label className="block text-xs font-bold">Chuyển cảnh<input className={inputClass} maxLength={1000} value={selected.transition} onChange={(event) => updateFrame(selected.id, { transition: event.target.value })} /></label>
              <label className="block text-xs font-bold">Vai trò giữ chân<input className={inputClass} maxLength={1000} value={selected.retentionRole} onChange={(event) => updateFrame(selected.id, { retentionRole: event.target.value })} /></label>
            </div>
          </div>
        </div>
      </fieldset>}
    </div>
    <p className="text-xs text-[#879487]">Kéo thẻ để đổi thứ tự, hoặc dùng nút lên/xuống. Bạn có thể dùng ảnh sẵn có để minh họa.</p>
  </section>;
}
