import { useEffect, useMemo, useState } from "react";
import type {
  CreateVideoProjectRequestDto,
  VideoProjectDto,
  VideoWorkspaceDto,
} from "@creator-flow/contracts";
import {
  ArrowRight,
  Captions,
  Check,
  ChevronRight,
  Clapperboard,
  Clock3,
  CloudCog,
  FileText,
  LoaderCircle,
  Plus,
  Scissors,
  Sparkles,
  Upload,
  WandSparkles,
} from "lucide-react";
import { EmsenAvatar } from "../components/branding/EmsenAvatar";
import { CreateVideoProjectPanel } from "../features/video/components/CreateVideoProjectPanel";
import { SourceVideoUpload, type VideoUploadProgress } from "../features/video/components/SourceVideoUpload";
import { SourceVideoPlayer } from "../features/video/components/SourceVideoPlayer";
import { TeleprompterRecorder } from "../features/video/components/TeleprompterRecorder";
import { TranscriptEditor } from "../features/video/components/TranscriptEditor";
import {
  createVideoProject,
  getVideoProject,
  getVideoWorkspace,
  startVideoTranscription,
  updateVideoTranscript,
  uploadVideoSource,
} from "../features/video/videoApi";
import { formatVideoDate, videoProjectStatusConfig } from "../features/video/videoConfig";

const pipeline = [
  { icon: Upload, label: "Video thô", description: "Quay ngay hoặc tải clip" },
  { icon: FileText, label: "Lời thoại", description: "Tạo và sửa transcript" },
  { icon: Scissors, label: "Smart Cut", description: "Duyệt đoạn giữ/cắt" },
  { icon: Captions, label: "Caption", description: "Áp nhận diện Emsen" },
  { icon: WandSparkles, label: "Xuất video", description: "Render và tải MP4" },
] as const;

function completedPipelineSteps(project: VideoProjectDto) {
  if (project.status === "completed") return 5;
  if (project.status === "rendering" || project.status === "ready-to-render") return 4;
  if (project.status === "cut-review") return 2;
  if (project.status === "transcript-ready") return 2;
  if (project.status === "analyzing" || project.status === "transcribing") return 1;
  if (project.assets.some((asset) => asset.kind === "source" && ["uploaded", "processing", "ready"].includes(asset.status))) return 1;
  return 0;
}

export function VideoStudioPage({
  active,
  preferredScriptId,
  onPreferredScriptHandled,
  onOpenScripts,
  onSettings,
}: {
  active: boolean;
  preferredScriptId: string | null;
  onPreferredScriptHandled: () => void;
  onOpenScripts: () => void;
  onSettings: () => void;
}) {
  const [workspace, setWorkspace] = useState<VideoWorkspaceDto | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createScriptId, setCreateScriptId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<VideoUploadProgress | null>(null);
  const [processing, setProcessing] = useState(false);
  const [recorderOpen, setRecorderOpen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = async (preferId?: string) => {
    setLoading(true);
    setError("");
    try {
      const next = await getVideoWorkspace();
      setWorkspace(next);
      setSelectedId((current) => {
        const preferred = preferId ?? current;
        return next.projects.some((project) => project.id === preferred)
          ? preferred!
          : next.projects[0]?.id ?? null;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Chưa mở được Video Studio.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (active) void load();
  }, [active]);

  useEffect(() => {
    if (!active || !preferredScriptId) return;
    setCreateScriptId(preferredScriptId);
    setShowCreate(true);
    onPreferredScriptHandled();
  }, [active, preferredScriptId, onPreferredScriptHandled]);

  const selected = useMemo(() => workspace?.projects.find((project) => project.id === selectedId) ?? null, [selectedId, workspace]);

  const replaceProject = (project: VideoProjectDto) => {
    setWorkspace((current) => current ? {
      ...current,
      projects: [project, ...current.projects.filter((item) => item.id !== project.id)],
    } : current);
    setSelectedId(project.id);
  };

  useEffect(() => {
    if (!active || !selected || !["analyzing", "transcribing"].includes(selected.status)) return;
    let cancelled = false;
    const refresh = async () => {
      try {
        const project = await getVideoProject(selected.id);
        if (cancelled) return;
        setWorkspace((current) => current ? {
          ...current,
          projects: [project, ...current.projects.filter((item) => item.id !== project.id)],
        } : current);
        if (project.status === "transcript-ready") {
          setNotice("Lời thoại đã sẵn sàng. Bạn hãy đọc lại và sửa những từ chưa đúng trước khi duyệt.");
        } else if (project.status === "failed") {
          const failedJob = project.jobs.find((job) => job.status === "failed");
          setError(failedJob?.errorMessage ?? "Emsen chưa xử lý được video. Bạn có thể thử lại.");
        }
      } catch {
        // Giữ giao diện hiện tại; lần thăm dò tiếp theo sẽ thử lại.
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 2_500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [active, selected?.id, selected?.status]);

  const handleCreate = async (input: CreateVideoProjectRequestDto) => {
    setCreating(true);
    setError("");
    setNotice("");
    try {
      const project = await createVideoProject(input);
      replaceProject(project);
      setShowCreate(false);
      setCreateScriptId(null);
      setNotice("Dự án đã sẵn sàng. Bạn có thể quay ngay với teleprompter hoặc tải clip đã có.");
      await load(project.id);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Chưa thể tạo dự án video.");
    } finally {
      setCreating(false);
    }
  };

  const handleUpload = async (files: File[], origin: "recording" | "upload" = "upload") => {
    if (!selected || uploadProgress) return;
    setError("");
    setNotice("");
    try {
      for (const [index, file] of files.entries()) {
        setUploadProgress({ current: index + 1, fileName: file.name, progress: 0, total: files.length });
        const result = await uploadVideoSource(
          selected.id,
          file,
          crypto.randomUUID(),
          (progress) => setUploadProgress({ current: index + 1, fileName: file.name, progress, total: files.length }),
          origin,
        );
        replaceProject(result.project);
      }
      setNotice(origin === "recording"
        ? "Đã lưu video vừa quay vào dự án. Bạn có thể tạo lời thoại ngay."
        : `Đã tải ${files.length} clip vào dự án. Video đã sẵn sàng cho bước tạo lời thoại.`);
      await load(selected.id);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Chưa thể tải video lên.");
    } finally {
      setUploadProgress(null);
    }
  };

  const handleStartTranscription = async () => {
    if (!selected || processing) return;
    setProcessing(true);
    setError("");
    setNotice("");
    try {
      const project = await startVideoTranscription(selected.id, { idempotencyKey: crypto.randomUUID() });
      replaceProject(project);
      setNotice("Emsen đang kiểm tra clip và nghe lại lời thoại. Bạn có thể để trang này mở hoặc quay lại sau.");
    } catch (processError) {
      setError(processError instanceof Error ? processError.message : "Chưa bắt đầu xử lý video được.");
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveTranscript = async (
    segments: NonNullable<VideoProjectDto["transcript"]>["segments"],
    transcriptStatus: NonNullable<VideoProjectDto["transcript"]>["status"],
  ) => {
    if (!selected?.transcript) return;
    const project = await updateVideoTranscript(selected.id, {
      revision: selected.transcript.revision,
      segments,
      status: transcriptStatus,
    });
    replaceProject(project);
    setNotice(transcriptStatus === "approved" ? "Đã duyệt lời thoại. Dữ liệu đã sẵn sàng cho bước Smart Cut." : "Đã lưu bản nháp lời thoại.");
  };

  if (!active) return null;

  const doneSteps = selected ? completedPipelineSteps(selected) : 0;
  const status = selected ? videoProjectStatusConfig[selected.status] : null;
  const sourceAssets = selected?.assets.filter((asset) => asset.kind === "source" && ["uploaded", "processing", "ready"].includes(asset.status)) ?? [];
  const activeJob = selected?.jobs.find((job) => ["queued", "running"].includes(job.status));
  const failedJob = selected?.jobs.find((job) => job.status === "failed");
  const sourceLocked = Boolean(selected && !["setup", "uploaded", "failed"].includes(selected.status));

  return (
    <section className="mx-auto max-w-[1320px] space-y-4">
      {selected && recorderOpen && <TeleprompterRecorder project={selected} onClose={() => setRecorderOpen(false)} onUseRecording={(file) => void handleUpload([file], "recording")} />}
      <header className="overflow-hidden rounded-[28px] border border-[#D9E8D4] bg-gradient-to-r from-[#EFF8EB] via-white to-[#F8EFF6] px-5 py-4 shadow-[0_16px_45px_rgba(55,85,57,0.09)] sm:px-6">
        <div className="flex flex-wrap items-center gap-4">
          <EmsenAvatar activity="working" className="h-20 w-20 shrink-0" eager />
          <div className="min-w-[220px] flex-1">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#3F8240]"><Sparkles size={14} /> AI Video Studio</p>
            <h2 className="mt-1 text-2xl font-bold text-[#284D31] sm:text-3xl">Từ clip thô đến bản dựng</h2>
            <p className="mt-1 text-sm text-[#748A74]">Đi từng bước đơn giản: quay hoặc tải video, duyệt lời thoại, chọn đoạn cắt rồi xuất bản.</p>
          </div>
          <button type="button" onClick={() => { setCreateScriptId(null); setShowCreate(true); }} className="inline-flex items-center gap-2 rounded-2xl bg-[#4E8052] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_25px_rgba(55,100,58,0.18)]"><Plus size={18} /> Dự án video mới</button>
        </div>
      </header>

      {error && <p role="alert" className="rounded-xl border border-[#F1C9C2] bg-[#FFF0EC] p-4 text-sm text-[#9A4B42]">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-[#CFE2C7] bg-[#EFF8EB] p-4 text-sm text-[#417447]">{notice}</p>}
      {showCreate && workspace && <CreateVideoProjectPanel busy={creating} initialScriptId={createScriptId} scripts={workspace.scriptOptions} onClose={() => setShowCreate(false)} onCreate={(input) => void handleCreate(input)} onOpenScripts={onOpenScripts} />}

      {loading && !workspace ? <div className="grid min-h-80 place-items-center rounded-[26px] border border-[#DDEBD6] bg-white"><p className="flex items-center gap-2 text-sm text-[#748A74]"><LoaderCircle size={18} className="animate-spin" /> Đang mở Video Studio…</p></div> : null}

      {workspace && workspace.projects.length === 0 && !showCreate ? (
        <section className="grid min-h-[420px] place-items-center rounded-[28px] border border-[#DDEBD6] bg-white p-8 text-center">
          <div className="max-w-md">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-[22px] bg-[#EAF6E4] text-[#3F8240]"><Clapperboard size={28} /></span>
            <h3 className="mt-5 text-xl font-bold text-[#284D31]">Bắt đầu từ một kịch bản</h3>
            <p className="mt-2 text-sm leading-6 text-[#748A74]">Emsen dùng kịch bản làm trục để nối lời thoại, cảnh quay và quyết định cắt trong cùng một dự án.</p>
            <button type="button" onClick={() => { setCreateScriptId(null); setShowCreate(true); }} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#4E8052] px-5 py-3 text-sm font-bold text-white"><Plus size={17} /> Tạo dự án đầu tiên</button>
          </div>
        </section>
      ) : null}

      {workspace && workspace.projects.length > 0 ? (
        <div className="grid items-start gap-4 xl:grid-cols-[330px_minmax(0,1fr)]">
          <aside className="rounded-[24px] border border-[#DDEBD6] bg-white p-3 xl:sticky xl:top-4">
            <div className="flex items-center justify-between px-2 py-2"><h3 className="text-sm font-bold text-[#284D31]">Dự án của bạn</h3><span className="text-[11px] font-bold text-[#879487]">{workspace.projects.length}</span></div>
            <div className="mt-1 space-y-2">
              {workspace.projects.map((project) => {
                const projectStatus = videoProjectStatusConfig[project.status];
                const activeProject = project.id === selectedId;
                return <button type="button" key={project.id} onClick={() => { setSelectedId(project.id); setError(""); setNotice(""); }} className={`w-full rounded-2xl border p-3.5 text-left transition ${activeProject ? "border-[#91BD82] bg-[#F2F9EE] shadow-[0_8px_20px_rgba(55,100,58,0.08)]" : "border-[#E8EEE5] bg-[#FFFEFB] hover:border-[#BED8B5]"}`}>
                  <div className="flex items-start gap-3"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${activeProject ? "bg-[#4E8052] text-white" : "bg-[#EAF6E4] text-[#3F8240]"}`}><Clapperboard size={17} /></span><div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-bold leading-5 text-[#31583A]">{project.title}</p><p className="mt-1 truncate text-[10px] text-[#879487]">{project.script?.title ?? "Kịch bản đã xóa"}</p></div><ChevronRight size={15} className="mt-2 shrink-0 text-[#91A091]" /></div>
                  <div className="mt-3 flex items-center justify-between gap-2"><span style={{ color: projectStatus.color, background: projectStatus.surface }} className="rounded-full px-2.5 py-1 text-[10px] font-bold">{projectStatus.label}</span><span className="text-[10px] text-[#879487]">{formatVideoDate(project.updatedAt)}</span></div>
                </button>;
              })}
            </div>
          </aside>

          {selected && status ? (
            <div className="space-y-4">
              <section className="rounded-[24px] border border-[#DDEBD6] bg-white p-5 sm:p-6">
                <div className="flex flex-wrap items-start gap-4">
                  <div className="min-w-[220px] flex-1"><div className="flex flex-wrap items-center gap-2"><span style={{ color: status.color, background: status.surface }} className="rounded-full px-3 py-1 text-[11px] font-bold">{status.label}</span><span className="text-[11px] text-[#879487]">Bản {selected.revision}</span></div><h3 className="mt-3 text-xl font-bold text-[#284D31]">{selected.title}</h3><p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#748A74]"><span className="flex items-center gap-1.5"><FileText size={13} /> {selected.script?.title ?? "Kịch bản nguồn không còn"}</span><span className="flex items-center gap-1.5"><Clock3 size={13} /> {selected.settings.targetDurationSeconds} giây</span><span>{selected.settings.aspectRatio}</span></p></div>
                  <div className="rounded-2xl bg-[#F8F4F7] px-4 py-3 text-right"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8B6C84]">Preset</p><p className="mt-1 text-xs font-bold text-[#5F4B5B]">{selected.settings.captionPreset === "emsen-clean" ? "Emsen Clean" : "Không phụ đề"}</p></div>
                </div>
              </section>

              <section className="rounded-[24px] border border-[#DDEBD6] bg-white p-4 sm:p-5">
                <div className="grid gap-2 md:grid-cols-5">
                  {pipeline.map((step, index) => {
                    const Icon = step.icon;
                    const complete = index < doneSteps;
                    const current = index === doneSteps;
                    return <div key={step.label} className={`relative rounded-2xl border p-3 ${complete ? "border-[#CFE2C7] bg-[#F2F9EE]" : current ? "border-[#A9C99D] bg-white shadow-[0_8px_20px_rgba(55,100,58,0.08)]" : "border-[#ECEBE6] bg-[#FAFAF8] opacity-60"}`}>
                      <div className="flex items-center gap-2"><span className={`grid h-7 w-7 place-items-center rounded-lg ${complete ? "bg-[#4E8052] text-white" : current ? "bg-[#EAF6E4] text-[#3F8240]" : "bg-[#ECEEEA] text-[#8B958B]"}`}>{complete ? <Check size={14} strokeWidth={3} /> : <Icon size={14} />}</span><span className="text-[11px] font-bold text-[#31583A]">{step.label}</span></div><p className="mt-2 text-[10px] leading-4 text-[#879487]">{step.description}</p>{index < pipeline.length - 1 && <ArrowRight size={12} className="absolute -right-2 top-5 z-10 hidden text-[#BCC8BA] md:block" />}
                    </div>;
                  })}
                </div>
              </section>

              <SourceVideoUpload
                project={selected}
                upload={workspace.upload}
                progress={uploadProgress}
                locked={sourceLocked}
                onRecord={() => setRecorderOpen(true)}
                onUpload={(files) => void handleUpload(files)}
              />

              {sourceAssets.length > 0 && !selected.transcript && ["setup", "uploaded", "failed"].includes(selected.status) && (
                <section className="flex flex-wrap items-center gap-4 rounded-[22px] border border-[#E5D8E3] bg-gradient-to-r from-[#FBF5FA] to-white p-4 sm:p-5">
                  <EmsenAvatar emotion="content" className="h-14 w-14 shrink-0" />
                  <div className="min-w-[220px] flex-1">
                    <p className="text-sm font-bold text-[#5F4B5B]">Tạo lời thoại có timestamp</p>
                    <p className="mt-1 text-xs leading-5 text-[#81727D]">Emsen sẽ kiểm tra video dọc, nghe tiếng Việt và chia lời nói theo từng mốc thời gian để bạn sửa. Clip được gửi tạm thời đến Google Gemini khi bạn bắt đầu.</p>
                    {failedJob?.errorMessage && <p className="mt-2 rounded-xl bg-[#FFF0EC] px-3 py-2 text-xs text-[#9A4B42]">{failedJob.errorMessage}</p>}
                  </div>
                  {workspace.transcriptionConfigured ? <button type="button" disabled={processing} onClick={() => void handleStartTranscription()} className="inline-flex items-center gap-2 rounded-xl bg-[#72506B] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{processing ? <LoaderCircle size={16} className="animate-spin" /> : <Sparkles size={16} />} {failedJob ? "Thử xử lý lại" : "Tạo lời thoại"}</button> : <button type="button" onClick={onSettings} className="inline-flex items-center gap-2 rounded-xl bg-[#72506B] px-4 py-3 text-sm font-bold text-white"><CloudCog size={17} /> Kết nối AI</button>}
                </section>
              )}

              {["analyzing", "transcribing"].includes(selected.status) && (
                <section className="rounded-[22px] border border-[#C9DEEA] bg-gradient-to-r from-[#EEF6FB] to-white p-4 sm:p-5">
                  <div className="flex items-center gap-4">
                    <EmsenAvatar activity="working" className="h-14 w-14 shrink-0" />
                    <div className="min-w-0 flex-1"><p className="text-sm font-bold text-[#3F617C]">{selected.status === "analyzing" ? "Đang kiểm tra chất lượng video…" : "Đang nghe và chia lời thoại…"}</p><p className="mt-1 text-xs leading-5 text-[#6D8292]">Bạn có thể chuyển sang trang khác. Tiến trình vẫn tiếp tục ở nền.</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#D6E6F0]"><span className="block h-full rounded-full bg-[#5F91B4] transition-all" style={{ width: `${Math.max(4, activeJob?.progress ?? 4)}%` }} /></div><p className="mt-1.5 text-right text-[10px] font-bold text-[#68849A]">{activeJob?.status === "queued" ? "Đang chờ" : `${activeJob?.progress ?? 0}%`}</p></div>
                  </div>
                </section>
              )}

              {selected.transcript && <SourceVideoPlayer assets={sourceAssets} projectId={selected.id} />}
              {selected.transcript && <TranscriptEditor transcript={selected.transcript} onSave={handleSaveTranscript} />}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
