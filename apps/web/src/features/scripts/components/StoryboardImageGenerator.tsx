import { useEffect, useRef, useState } from "react";
import type { GenerateStoryboardImageRequestDto, ScriptSettingsDto, ScriptStoryboardFrameDto, StoryboardCreatorAction, StoryboardImageJobDto, StoryboardImageStyle, StoryboardImageWorkspaceDto } from "@creator-flow/contracts";
import { Check, LoaderCircle, RefreshCw, Sparkles } from "lucide-react";
import { ApiError } from "../../../lib/apiClient";
import { generateStoryboardImage, getStoryboardAsset, getStoryboardImageWorkspace } from "../scriptApi";

const styleLabels: Record<StoryboardImageStyle, string> = { creator: "Creator ảnh màu", cinematic: "Điện ảnh", illustration: "Minh họa màu", sketch: "Phác thảo cũ" };

function ImageCandidate({ scriptId, job, selected, disabled, outdated, onUse }: { scriptId: string; job: StoryboardImageJobDto; selected: boolean; disabled: boolean; outdated: boolean; onUse: () => void }) {
  const [url, setUrl] = useState("");
  const [failed, setFailed] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let disposed = false;
    let timer: number | undefined;
    setFailed(false);
    if (job.assetId) void getStoryboardAsset(scriptId, job.assetId).then((asset) => {
      if (disposed) return;
      setUrl(asset.imageUrl);
      timer = window.setTimeout(() => setRefresh((value) => value + 1), Math.max(10_000, new Date(asset.expiresAt).getTime() - Date.now() - 15_000));
    }).catch(() => { if (!disposed) setFailed(true); });
    return () => { disposed = true; window.clearTimeout(timer); };
  }, [scriptId, job.assetId, refresh]);
  return <div className={`min-w-0 overflow-hidden rounded-xl border ${selected ? "border-[#72B65D] bg-[#EFF7E9]" : "border-[#E0E5DC] bg-white"}`}>
    {url && !failed ? <img src={url} className="aspect-square w-full object-contain" alt="Phương án ảnh minh họa" onError={() => setFailed(true)} /> : <div className="flex aspect-square items-center justify-center p-2 text-center text-[10px] text-[#748A74]">{failed ? <button type="button" onClick={() => setRefresh((value) => value + 1)}>Tải ảnh lại</button> : <LoaderCircle size={16} className="animate-spin" />}</div>}
    <div className="space-y-1 p-2">
      <p className="text-[10px] leading-4 text-[#8C7387]">{styleLabels[job.source.style]}</p>
      {outdated && <p className="text-[10px] leading-4 text-[#A06F3F]">Theo mô tả trước</p>}
      <button type="button" disabled={disabled || selected || failed || !url} onClick={onUse} className="flex w-full items-center justify-center gap-1 rounded-lg bg-[#E8F1E1] px-1 py-2 text-[11px] font-bold text-[#416B43] disabled:opacity-50">{selected ? <><Check size={12} /> Đang dùng</> : "Dùng ảnh này"}</button>
    </div>
  </div>;
}

export function StoryboardImageGenerator({ scriptId, scriptRevision, frame, aspectRatio, disabled, onUseImage }: {
  scriptId: string; scriptRevision: number; frame: ScriptStoryboardFrameDto; aspectRatio: ScriptSettingsDto["aspectRatio"]; disabled: boolean;
  onUseImage: (sceneId: string, assetId: string) => void;
}) {
  const [workspace, setWorkspace] = useState<StoryboardImageWorkspaceDto | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [loadingError, setLoadingError] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [style, setStyle] = useState<StoryboardImageStyle>("creator");
  const [creatorAction, setCreatorAction] = useState<StoryboardCreatorAction>("auto");
  const [prompt, setPrompt] = useState("");
  const mounted = useRef(false);
  const lastAttempt = useRef<GenerateStoryboardImageRequestDto | null>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { setPrompt(""); setError(""); setCreatorAction("auto"); }, [frame.id]);
  useEffect(() => {
    let disposed = false;
    let timer: number | undefined;
    let failures = 0;
    async function load() {
      try {
        const result = await getStoryboardImageWorkspace(scriptId);
        if (disposed) return;
        setWorkspace(result); setLoadingError(""); failures = 0;
        if (result.jobs.some((job) => job.status === "queued" || job.status === "running")) timer = window.setTimeout(() => void load(), 2_500);
      } catch {
        if (!disposed) {
          setLoadingError("Chưa tải được trạng thái tạo ảnh. Bạn có thể tải lại.");
          if (++failures <= 3) timer = window.setTimeout(() => void load(), 5_000);
        }
      }
    }
    void load();
    return () => { disposed = true; window.clearTimeout(timer); };
  }, [scriptId, refresh]);

  const jobs = workspace?.jobs.filter((job) => job.sceneId === frame.id) ?? [];
  const active = jobs.find((job) => job.status === "queued" || job.status === "running");
  const candidates = jobs.filter((job) => job.status === "succeeded" && job.assetId).slice(0, 6);
  const quotaReached = Boolean(workspace && (workspace.usage.usedToday >= workspace.usage.dailyLimit || workspace.usage.workspaceUsedToday >= workspace.usage.workspaceDailyLimit));
  const canGenerate = workspace?.configured && !disabled && !frame.locked && !active && !submitting && !quotaReached && (frame.visual.trim() || prompt.trim());

  async function generate() {
    if (!canGenerate) return;
    setError(""); setSubmitting(true);
    const source = { scriptRevision, scene: { id: frame.id, title: frame.title.trim(), visual: frame.visual.trim(), direction: frame.direction.trim(), locked: frame.locked ?? false }, aspectRatio, style, creatorAction, prompt: prompt.trim() };
    const previous = lastAttempt.current;
    // A network error might occur after acceptance. Reuse its request id for the same input.
    const request = previous && JSON.stringify({ ...previous, requestId: undefined }) === JSON.stringify(source)
      ? previous : { ...source, requestId: crypto.randomUUID() };
    lastAttempt.current = request;
    try {
      const job = await generateStoryboardImage(scriptId, request);
      lastAttempt.current = null;
      if (!mounted.current) return;
      setWorkspace((value) => value ? { ...value, jobs: [job, ...value.jobs.filter((item) => item.id !== job.id)] } : value);
      setRefresh((value) => value + 1);
    } catch (err) {
      if (err instanceof ApiError && err.status < 500) lastAttempt.current = null;
      if (mounted.current) { setError(err instanceof Error ? err.message : "Chưa gửi được yêu cầu tạo ảnh."); setRefresh((value) => value + 1); }
    } finally { if (mounted.current) setSubmitting(false); }
  }

  return <div className="space-y-3 rounded-xl border border-[#DECFDD] bg-[#FCF8FC] p-3" aria-label="Tạo ảnh minh họa bằng AI">
    <div className="flex items-center justify-between gap-2"><h4 className="flex items-center gap-1.5 text-xs font-bold text-[#72506B]"><Sparkles size={14} /> Minh họa bằng AI</h4><button type="button" aria-label="Tải lại trạng thái tạo ảnh" onClick={() => setRefresh((value) => value + 1)} className="rounded p-1 text-[#8C7387]"><RefreshCw size={13} /></button></div>
    <label className="block text-xs font-bold">Phong cách ảnh<select disabled={disabled || submitting} value={style} onChange={(event) => setStyle(event.target.value as StoryboardImageStyle)} className="mt-1.5 w-full rounded-lg border border-[#E0D6DF] bg-white p-2 text-xs font-normal"><option value="creator">Creator · ảnh màu tự nhiên</option><option value="illustration">Minh họa nhân vật màu</option><option value="cinematic">Điện ảnh</option></select></label>
    <label className="block text-xs font-bold">Động tác trong cảnh<select disabled={disabled || submitting} value={creatorAction} onChange={(event) => setCreatorAction(event.target.value as StoryboardCreatorAction)} className="mt-1.5 w-full rounded-lg border border-[#E0D6DF] bg-white p-2 text-xs font-normal"><option value="auto">Theo mô tả cảnh</option><option value="talk-to-camera">Nói trước camera</option><option value="show-product">Giới thiệu sản phẩm</option><option value="unbox">Mở hộp / khui gói</option><option value="demonstrate">Sử dụng / demo</option><option value="b-roll">Cận cảnh sản phẩm / B-roll</option></select></label>
    <p className="text-[10px] leading-4 text-[#8C7387]">Ưu tiên nhân vật, biểu cảm và bàn tay đang thao tác. Chọn B-roll khi chỉ cần cận cảnh sản phẩm.</p>
    <label className="block text-xs font-bold">Mô tả thêm cho ảnh<textarea disabled={disabled || submitting} rows={2} maxLength={1_200} value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Creator giơ gói sản phẩm ngang ngực, nét mặt hào hứng, góc máy ngang mắt…" className="mt-1.5 w-full rounded-lg border border-[#E0D6DF] bg-white p-2 text-xs font-normal leading-5" /></label>
    <p className="text-[10px] leading-4 text-[#8C7387]">Gửi mô tả hình ảnh, chỉ dẫn quay và mô tả bổ sung của cảnh này tới dịch vụ tạo ảnh. Chữ trên màn hình được giữ ở lớp riêng.</p>
    <button type="button" disabled={!canGenerate} onClick={() => void generate()} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#765370] px-3 py-2.5 text-xs font-bold text-white disabled:opacity-40">{submitting || active ? <LoaderCircle size={14} className="animate-spin" /> : <Sparkles size={14} />}{submitting ? "Đang gửi…" : active ? active.status === "queued" ? "Đang chờ tạo ảnh…" : "Đang tạo ảnh…" : candidates.length ? "Tạo thêm phương án" : "Tạo ảnh cho cảnh này"}</button>
    {!workspace && !loadingError && <p className="text-[10px] text-[#8C7387]">Đang kiểm tra dịch vụ tạo ảnh…</p>}
    {loadingError && <p role="alert" className="text-xs text-[#A15B55]">{loadingError}</p>}
    {workspace && !workspace.configured && <p className="text-[11px] leading-5 text-[#8C7387]">{workspace.configurationMessage}</p>}
    {workspace?.configured && <p className="text-[10px] leading-4 text-[#8C7387]">{workspace.usage.usedToday}/{workspace.usage.dailyLimit} lượt thử hôm nay · còn {Math.max(0, workspace.usage.workspaceDailyLimit - workspace.usage.workspaceUsedToday)} lượt dùng chung. Đặt lại lúc {new Date(workspace.usage.resetsAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}.</p>}
    {quotaReached && <p className="text-xs text-[#A06F3F]">Đã hết lượt thử hôm nay. Hãy quay lại sau khi hạn mức đặt lại.</p>}
    {frame.locked && <p className="text-[11px] text-[#8C7387]">Mở khóa cảnh trước khi tạo hoặc chọn ảnh AI.</p>}
    {active && <div className="space-y-1"><div role="progressbar" aria-label="Tiến độ tạo ảnh" aria-valuemin={0} aria-valuemax={100} aria-valuenow={active.progress} className="h-1.5 overflow-hidden rounded-full bg-[#E7DDE5]"><div className="h-full bg-[#97718F] transition-all" style={{ width: `${Math.max(5, active.progress)}%` }} /></div><p className="text-[10px] leading-4 text-[#8C7387]">Bạn có thể chỉnh các cảnh khác. Ảnh sẽ hiện trong danh sách phương án khi hoàn tất.</p>{active.status === "queued" && <p className="text-[10px] leading-4 text-[#8C7387]">Nếu chờ lâu, kiểm tra dịch vụ xử lý nền đang chạy.</p>}</div>}
    {error && <p role="alert" className="text-xs leading-5 text-[#A15B55]">{error}</p>}
    {!active && jobs[0]?.status === "failed" && <p role="alert" className="text-xs leading-5 text-[#A15B55]">{jobs[0].errorMessage}</p>}
    {candidates.length > 0 && <div><p className="mb-2 text-[11px] font-bold text-[#72506B]">Chọn ảnh phù hợp với cảnh</p><div className="grid grid-cols-2 gap-2">{candidates.map((job) => <ImageCandidate key={job.id} scriptId={scriptId} job={job} selected={frame.illustrationAssetId === job.assetId} disabled={disabled || Boolean(frame.locked)} outdated={job.source.scene.title !== frame.title.trim() || job.source.scene.visual !== frame.visual.trim() || job.source.scene.direction !== frame.direction.trim() || job.source.aspectRatio !== aspectRatio} onUse={() => { if (job.assetId) onUseImage(frame.id, job.assetId); }} />)}</div></div>}
    {workspace?.configured && !workspace.capabilities.exactAspectRatio && <p className="text-[10px] leading-4 text-[#8C7387]">Ảnh tham chiếu có thể khác tỷ lệ video; bảng sẽ hiển thị trọn ảnh trong khung.</p>}
  </div>;
}
