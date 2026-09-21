import { useEffect, useMemo, useRef, useState } from "react";
import type { VideoProjectDto } from "@creator-flow/contracts";
import {
  Camera,
  Check,
  FlipHorizontal2,
  Gauge,
  LoaderCircle,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  Square,
  SwitchCamera,
  Type,
  X,
} from "lucide-react";
import { stripTimelineTimestamps } from "../../scripts/scriptTimeline";

type RecorderStage = "idle" | "requesting" | "ready" | "countdown" | "recording" | "paused" | "review";

const wait = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

function formatDuration(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

function recorderMimeType() {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  return candidates.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ?? "";
}

function recordedFileName(mimeType: string) {
  const extension = mimeType === "video/mp4" ? "mp4" : "webm";
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `emsen-quay-${timestamp}.${extension}`;
}

export function TeleprompterRecorder({
  project,
  onClose,
  onUseRecording,
}: {
  project: VideoProjectDto;
  onClose: () => void;
  onUseRecording: (file: File) => void;
}) {
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement>(null);
  const promptRef = useRef<HTMLDivElement>(null);
  const mobilePromptRef = useRef<HTMLDivElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const outputStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const drawFrameRef = useRef<number | null>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const lastTickRef = useRef(0);
  const elapsedRef = useRef(0);
  const scrollSpeedRef = useRef(32);
  const sessionRef = useRef(0);
  const discardingRef = useRef(false);
  const mountedRef = useRef(true);
  const recordedUrlRef = useRef("");

  const [stage, setStage] = useState<RecorderStage>("idle");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [countdown, setCountdown] = useState(3);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [fontSize, setFontSize] = useState(28);
  const [scrollSpeed, setScrollSpeed] = useState(32);
  const [mirrorPrompt, setMirrorPrompt] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [recordedUrl, setRecordedUrl] = useState("");
  const [error, setError] = useState("");
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const sections = useMemo(() => [
    { label: "Hook", text: stripTimelineTimestamps(project.teleprompter.hook) },
    { label: "Nội dung", text: stripTimelineTimestamps(project.teleprompter.body) },
    { label: "CTA", text: stripTimelineTimestamps(project.teleprompter.cta) },
  ].filter((section) => section.text.trim()), [project.teleprompter]);
  const maxRecordingSeconds = Math.min(
    5 * 60,
    Math.max(project.settings.targetDurationSeconds * 2, project.settings.targetDurationSeconds + 30),
  );

  const releaseCamera = () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (cameraVideoRef.current) cameraVideoRef.current.srcObject = null;
  };

  const stopOutput = () => {
    if (drawFrameRef.current !== null) cancelAnimationFrame(drawFrameRef.current);
    if (scrollFrameRef.current !== null) cancelAnimationFrame(scrollFrameRef.current);
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    drawFrameRef.current = null;
    scrollFrameRef.current = null;
    timerRef.current = null;
    outputStreamRef.current?.getTracks().forEach((track) => track.stop());
    outputStreamRef.current = null;
  };

  const cleanup = (discard = false) => {
    sessionRef.current += 1;
    discardingRef.current = discard;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    recorderRef.current = null;
    stopOutput();
    releaseCamera();
  };

  useEffect(() => {
    recordedUrlRef.current = recordedUrl;
  }, [recordedUrl]);

  useEffect(() => {
    scrollSpeedRef.current = scrollSpeed;
  }, [scrollSpeed]);

  useEffect(() => () => {
    mountedRef.current = false;
    cleanup(true);
    if (recordedUrlRef.current) URL.revokeObjectURL(recordedUrlRef.current);
  }, []);

  const openCamera = async (nextFacingMode = facingMode) => {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError("Trình duyệt chỉ cho phép quay khi trang dùng HTTPS hoặc chạy trên localhost.");
      return;
    }
    setStage("requesting");
    setError("");
    releaseCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: {
          aspectRatio: { ideal: 9 / 16 },
          facingMode: { ideal: nextFacingMode },
          height: { ideal: 1920 },
          width: { ideal: 1080 },
        },
      });
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      cameraStreamRef.current = stream;
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        await cameraVideoRef.current.play();
      }
      setFacingMode(nextFacingMode);
      setStage("ready");
    } catch (cameraError) {
      releaseCamera();
      const denied = cameraError instanceof DOMException && ["NotAllowedError", "SecurityError"].includes(cameraError.name);
      setError(denied
        ? "Bạn chưa cho phép dùng camera hoặc micro. Hãy cấp quyền trên trình duyệt rồi thử lại."
        : "Chưa mở được camera. Hãy kiểm tra camera có đang được ứng dụng khác sử dụng không.");
      setStage("idle");
    }
  };

  const drawCameraToCanvas = () => {
    const video = cameraVideoRef.current;
    const canvas = outputCanvasRef.current;
    const context = canvas?.getContext("2d", { alpha: false });
    if (!video || !canvas || !context) return;
    const draw = () => {
      if (video.videoWidth && video.videoHeight) {
        const targetRatio = canvas.width / canvas.height;
        const sourceRatio = video.videoWidth / video.videoHeight;
        let sourceX = 0;
        let sourceY = 0;
        let sourceWidth = video.videoWidth;
        let sourceHeight = video.videoHeight;
        if (sourceRatio > targetRatio) {
          sourceWidth = video.videoHeight * targetRatio;
          sourceX = (video.videoWidth - sourceWidth) / 2;
        } else {
          sourceHeight = video.videoWidth / targetRatio;
          sourceY = (video.videoHeight - sourceHeight) / 2;
        }
        context.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
      }
      drawFrameRef.current = requestAnimationFrame(draw);
    };
    draw();
  };

  const startPromptScroll = () => {
    let previous = performance.now();
    const scroll = (now: number) => {
      const recorder = recorderRef.current;
      if (recorder?.state === "recording") {
        for (const prompt of [promptRef.current, mobilePromptRef.current]) {
          if (prompt) prompt.scrollTop += scrollSpeedRef.current * ((now - previous) / 1_000);
        }
      }
      previous = now;
      scrollFrameRef.current = requestAnimationFrame(scroll);
    };
    scrollFrameRef.current = requestAnimationFrame(scroll);
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  };

  const startTimer = () => {
    elapsedRef.current = 0;
    lastTickRef.current = performance.now();
    setElapsedSeconds(0);
    timerRef.current = window.setInterval(() => {
      const now = performance.now();
      if (recorderRef.current?.state === "recording") {
        elapsedRef.current += (now - lastTickRef.current) / 1_000;
        setElapsedSeconds(elapsedRef.current);
        if (elapsedRef.current >= maxRecordingSeconds) stopRecording();
      }
      lastTickRef.current = now;
    }, 200);
  };

  const startRecording = async () => {
    if (!cameraStreamRef.current || !cameraVideoRef.current) {
      await openCamera();
      return;
    }
    if (typeof MediaRecorder === "undefined" || !outputCanvasRef.current?.captureStream) {
      setError("Trình duyệt này chưa hỗ trợ quay trực tiếp. Bạn vẫn có thể quay bằng camera điện thoại rồi tải video lên.");
      return;
    }
    setError("");
    setStage("countdown");
    promptRef.current?.scrollTo({ top: 0 });
    mobilePromptRef.current?.scrollTo({ top: 0 });
    const session = ++sessionRef.current;
    for (let value = 3; value >= 1; value -= 1) {
      setCountdown(value);
      await wait(1_000);
      if (session !== sessionRef.current || !mountedRef.current) return;
    }

    try {
      const canvas = outputCanvasRef.current;
      if (!canvas) return;
      const outputStream = canvas.captureStream(30);
      const audioTrack = cameraStreamRef.current.getAudioTracks()[0];
      if (audioTrack) outputStream.addTrack(audioTrack.clone());
      outputStreamRef.current = outputStream;
      chunksRef.current = [];
      discardingRef.current = false;
      drawCameraToCanvas();
      const preferredMimeType = recorderMimeType();
      const recorder = new MediaRecorder(outputStream, {
        ...(preferredMimeType ? { mimeType: preferredMimeType } : {}),
        videoBitsPerSecond: 4_000_000,
      });
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => setError("Phiên quay bị gián đoạn. Hãy thử quay lại.");
      recorder.onstop = () => {
        stopOutput();
        releaseCamera();
        if (discardingRef.current || !mountedRef.current) return;
        const rawType = recorder.mimeType || preferredMimeType || "video/webm";
        const mimeType = rawType.split(";")[0] || "video/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (!blob.size) {
          setError("Video chưa được ghi lại. Hãy mở camera và thử lần nữa.");
          setStage("idle");
          return;
        }
        const file = new File([blob], recordedFileName(mimeType), { type: mimeType, lastModified: Date.now() });
        setRecordedFile(file);
        setRecordedUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return URL.createObjectURL(file);
        });
        setStage("review");
      };
      recorder.start(1_000);
      startTimer();
      startPromptScroll();
      setStage("recording");
    } catch {
      stopOutput();
      setError("Chưa bắt đầu quay được trên trình duyệt này. Hãy thử Chrome hoặc Edge phiên bản mới.");
      setStage("ready");
    }
  };

  const pauseOrResume = () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    if (recorder.state === "recording") {
      recorder.pause();
      setStage("paused");
    } else if (recorder.state === "paused") {
      lastTickRef.current = performance.now();
      recorder.resume();
      setStage("recording");
    }
  };

  const retake = () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl("");
    setRecordedFile(null);
    setElapsedSeconds(0);
    elapsedRef.current = 0;
    void openCamera();
  };

  const finish = () => {
    if (!recordedFile) return;
    onUseRecording(recordedFile);
    cleanup(false);
    onClose();
  };

  const requestClose = () => {
    if (["countdown", "recording", "paused", "review"].includes(stage)) {
      setConfirmDiscard(true);
      return;
    }
    cleanup(true);
    onClose();
  };

  const discardAndClose = () => {
    cleanup(true);
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    onClose();
  };

  const switchCamera = async () => {
    await openCamera(facingMode === "user" ? "environment" : "user");
  };

  const isRecording = stage === "recording" || stage === "paused";
  const targetProgress = Math.min(100, elapsedSeconds / project.settings.targetDurationSeconds * 100);

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-[#122018]/95 p-2 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-label="Quay video với teleprompter">
      <div className="mx-auto flex min-h-full max-w-[1280px] flex-col overflow-hidden rounded-[28px] bg-[#F8FBF6] shadow-2xl">
        <header className="flex items-center gap-3 border-b border-[#DDE8D9] bg-white px-4 py-3 sm:px-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#EAF6E4] text-[#3F8240]"><Camera size={19} /></span>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-[#284D31]">Quay: {project.title}</p><p className="text-[11px] text-[#748A74]">Kịch bản bản {project.teleprompter.scriptRevision} · mục tiêu {project.settings.targetDurationSeconds} giây</p></div>
          <button type="button" onClick={requestClose} className="grid h-10 w-10 place-items-center rounded-xl text-[#607760] hover:bg-[#EFF5EC]" aria-label="Đóng phòng quay"><X size={20} /></button>
        </header>

        <div className="grid flex-1 gap-4 p-3 lg:grid-cols-[minmax(340px,0.72fr)_minmax(420px,1.28fr)] lg:p-5">
          <aside className="order-2 rounded-[24px] border border-[#DCE8D7] bg-white p-4 lg:order-1">
            <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-bold text-[#284D31]">Teleprompter</p><p className="mt-0.5 text-[11px] text-[#7B8E7A]">Chữ chạy tự động khi bắt đầu quay</p></div><button type="button" onClick={() => setShowControls((current) => !current)} className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE8D7] px-3 py-2 text-xs font-bold text-[#4F7153]"><Settings2 size={14} /> Điều chỉnh</button></div>

            {showControls && <div className="mt-4 grid gap-3 rounded-2xl bg-[#F3F8F0] p-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <label className="text-[11px] font-bold text-[#56705A]"><span className="flex items-center justify-between"><span className="flex items-center gap-1.5"><Type size={13} /> Cỡ chữ</span><span>{fontSize}px</span></span><input type="range" min={20} max={44} value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} className="mt-2 w-full accent-[#4E8052]" /></label>
              <label className="text-[11px] font-bold text-[#56705A]"><span className="flex items-center justify-between"><span className="flex items-center gap-1.5"><Gauge size={13} /> Tốc độ</span><span>{scrollSpeed}</span></span><input type="range" min={10} max={80} value={scrollSpeed} onChange={(event) => setScrollSpeed(Number(event.target.value))} className="mt-2 w-full accent-[#4E8052]" /></label>
              <button type="button" onClick={() => setMirrorPrompt((current) => !current)} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold sm:col-span-2 lg:col-span-1 xl:col-span-2 ${mirrorPrompt ? "border-[#88B879] bg-[#E5F3DF] text-[#31583A]" : "border-[#D7E2D3] bg-white text-[#6F806F]"}`}><FlipHorizontal2 size={14} /> {mirrorPrompt ? "Đang lật chữ cho kính" : "Lật chữ nếu dùng kính phản chiếu"}</button>
            </div>}

            <div ref={promptRef} className="mt-4 h-[340px] overflow-y-auto scroll-smooth rounded-2xl bg-[#19251D] px-5 py-24 text-white shadow-inner sm:h-[430px] lg:h-[calc(100vh-330px)] lg:min-h-[360px]" style={{ transform: mirrorPrompt ? "scaleX(-1)" : undefined }}>
              {sections.length ? sections.map((section) => <section key={section.label} className="mb-10"><p className="mb-3 inline-flex rounded-full bg-[#72B65D]/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#BCE8AE]">{section.label}</p><p className="whitespace-pre-wrap font-semibold leading-[1.65]" style={{ fontSize }}>{section.text}</p></section>) : <p className="text-sm leading-6 text-white/70">Kịch bản chưa có nội dung để hiển thị. Hãy quay lại trang Kịch bản và bổ sung Hook, Nội dung hoặc CTA.</p>}
              <div className="h-48" aria-hidden="true" />
            </div>
          </aside>

          <main className="order-1 flex flex-col items-center rounded-[24px] bg-[#101611] p-3 lg:order-2 lg:p-5">
            <div className="relative aspect-[9/16] max-h-[calc(100vh-245px)] min-h-[430px] w-full max-w-[430px] overflow-hidden rounded-[26px] bg-black shadow-[0_24px_60px_rgba(0,0,0,0.3)]">
              {stage === "review" && recordedUrl ? <video src={recordedUrl} className="h-full w-full object-cover" controls playsInline /> : <video ref={cameraVideoRef} autoPlay muted playsInline className={`h-full w-full object-cover ${facingMode === "user" ? "-scale-x-100" : ""}`} />}
              {stage === "idle" && <div className="absolute inset-0 grid place-items-center bg-[#172019] p-8 text-center"><div><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/10 text-white"><Camera size={28} /></span><p className="mt-4 text-sm font-bold text-white">Sẵn sàng mở camera?</p><p className="mt-2 text-xs leading-5 text-white/60">Camera và micro chỉ hoạt động trong phòng quay này.</p><button type="button" onClick={() => void openCamera()} className="mt-5 rounded-xl bg-[#72B65D] px-5 py-3 text-sm font-bold text-[#142016]">Cho phép camera & micro</button></div></div>}
              {stage === "requesting" && <div className="absolute inset-0 grid place-items-center bg-[#172019]/90 text-center text-white"><div><LoaderCircle size={30} className="mx-auto animate-spin" /><p className="mt-3 text-sm font-bold">Đang mở camera…</p></div></div>}
              {stage === "countdown" && <div className="absolute inset-0 z-20 grid place-items-center bg-black/45"><span className="grid h-28 w-28 place-items-center rounded-full bg-white/90 text-5xl font-black text-[#31583A] shadow-2xl">{countdown}</span></div>}
              {isRecording && <div className="absolute left-3 right-3 top-3 z-20 flex items-center justify-between"><span className="flex items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 text-xs font-bold text-white"><span className={`h-2.5 w-2.5 rounded-full ${stage === "recording" ? "animate-pulse bg-red-500" : "bg-amber-400"}`} /> {stage === "recording" ? "ĐANG QUAY" : "TẠM DỪNG"}</span><span className="rounded-full bg-black/55 px-3 py-1.5 font-mono text-xs font-bold text-white">{formatDuration(elapsedSeconds)}</span></div>}
              {["ready", "countdown", "recording", "paused"].includes(stage) && <div ref={mobilePromptRef} className="pointer-events-none absolute inset-x-3 bottom-[22%] top-[18%] z-10 overflow-y-auto rounded-2xl bg-gradient-to-b from-black/25 via-black/70 to-black/25 px-4 py-28 text-center text-white backdrop-blur-[2px] lg:hidden" style={{ transform: mirrorPrompt ? "scaleX(-1)" : undefined }}>
                {sections.map((section) => <section key={section.label} className="mb-9"><p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#BCE8AE]">{section.label}</p><p className="whitespace-pre-wrap font-bold leading-[1.55] [text-shadow:0_2px_8px_rgba(0,0,0,0.8)]" style={{ fontSize: Math.max(20, fontSize - 4) }}>{section.text}</p></section>)}
                <div className="h-40" aria-hidden="true" />
              </div>}
              {isRecording && <div className="absolute inset-x-4 bottom-4 z-20 rounded-2xl bg-black/60 p-3 text-center text-white backdrop-blur"><p className="text-[10px] font-bold uppercase tracking-wider text-white/60">Teleprompter đang chạy</p><p className="mt-1 text-xs">Mục tiêu {formatDuration(project.settings.targetDurationSeconds)}</p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20"><span className="block h-full rounded-full bg-[#8EE06F] transition-all" style={{ width: `${targetProgress}%` }} /></div></div>}
            </div>
            <canvas ref={outputCanvasRef} width={720} height={1280} hidden />

            {error && <p role="alert" className="mt-3 w-full max-w-[560px] rounded-xl bg-[#4A2525] px-4 py-3 text-center text-xs leading-5 text-[#FFD6D0]">{error}</p>}

            <div className="mt-4 flex min-h-14 flex-wrap items-center justify-center gap-3">
              {stage === "ready" && <><button type="button" onClick={() => void switchCamera()} className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Đổi camera"><SwitchCamera size={20} /></button><button type="button" disabled={!sections.length} onClick={() => void startRecording()} className="inline-flex items-center gap-2 rounded-full bg-[#72B65D] px-6 py-3.5 text-sm font-black text-[#142016] disabled:opacity-40"><span className="h-3 w-3 rounded-full bg-red-600" /> Bắt đầu quay</button></>}
              {isRecording && <><button type="button" onClick={pauseOrResume} className="grid h-12 w-12 place-items-center rounded-full bg-white/15 text-white" aria-label={stage === "recording" ? "Tạm dừng" : "Tiếp tục"}>{stage === "recording" ? <Pause size={20} /> : <Play size={20} />}</button><button type="button" onClick={stopRecording} className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-black text-[#28342B]"><Square size={16} fill="currentColor" /> Kết thúc</button></>}
              {stage === "review" && <><button type="button" onClick={retake} className="inline-flex items-center gap-2 rounded-full bg-white/12 px-5 py-3 text-sm font-bold text-white"><RotateCcw size={17} /> Quay lại</button><button type="button" onClick={finish} className="inline-flex items-center gap-2 rounded-full bg-[#72B65D] px-6 py-3 text-sm font-black text-[#142016]"><Check size={18} /> Dùng video này</button></>}
            </div>
            <p className="mt-3 text-center text-[10px] leading-4 text-white/45">Video đầu ra là khung dọc 9:16; chữ không xuất hiện trong video. Phiên quay tự dừng ở {formatDuration(maxRecordingSeconds)}.</p>
          </main>
        </div>
      </div>

      {confirmDiscard && <div className="fixed inset-0 z-[90] grid place-items-center bg-black/60 p-4"><div className="w-full max-w-sm rounded-[24px] bg-white p-5 text-center shadow-2xl"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#FFF0EC] text-[#9A4B42]"><X size={21} /></span><h3 className="mt-4 text-lg font-bold text-[#284D31]">Bỏ phiên quay này?</h3><p className="mt-2 text-sm leading-6 text-[#748A74]">Video chưa dùng sẽ không được lưu vào dự án.</p><div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={() => setConfirmDiscard(false)} className="rounded-xl border border-[#DCE5D8] px-4 py-3 text-sm font-bold text-[#58705A]">Tiếp tục quay</button><button type="button" onClick={discardAndClose} className="rounded-xl bg-[#9A4B42] px-4 py-3 text-sm font-bold text-white">Bỏ và thoát</button></div></div></div>}
    </div>
  );
}
