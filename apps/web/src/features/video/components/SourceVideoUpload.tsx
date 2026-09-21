import { useRef, useState } from "react";
import type { VideoProjectDto, VideoWorkspaceDto } from "@creator-flow/contracts";
import { Camera, CheckCircle2, CloudUpload, FileVideo2, HardDrive, LoaderCircle, LockKeyhole } from "lucide-react";
import { formatBytes, videoAssetStatusLabels } from "../videoConfig";

export type VideoUploadProgress = {
  current: number;
  fileName: string;
  progress: number;
  total: number;
};

export function SourceVideoUpload({
  project,
  upload,
  progress,
  locked = false,
  onRecord,
  onUpload,
}: {
  project: VideoProjectDto;
  upload: VideoWorkspaceDto["upload"];
  progress: VideoUploadProgress | null;
  locked?: boolean;
  onRecord: () => void;
  onUpload: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [validationError, setValidationError] = useState("");
  const sourceAssets = project.assets.filter((asset) => asset.kind === "source" && asset.status !== "failed");
  const usedBytes = sourceAssets.reduce((total, asset) => total + asset.sizeBytes, 0);

  const validate = (list: FileList | File[]) => {
    const files = Array.from(list);
    setValidationError("");
    if (!files.length) return;
    if (sourceAssets.length + files.length > upload.maxFiles) {
      setValidationError(`Mỗi dự án nhận tối đa ${upload.maxFiles} clip. Bạn đã có ${sourceAssets.length} clip.`);
      return;
    }
    const unsupported = files.find((file) => !upload.acceptedMimeTypes.includes(file.type));
    if (unsupported) {
      setValidationError(`“${unsupported.name}” chưa đúng định dạng. Hãy dùng MP4, MOV hoặc WebM.`);
      return;
    }
    const nextBytes = files.reduce((total, file) => total + file.size, usedBytes);
    if (nextBytes > upload.maxTotalBytes) {
      setValidationError("Tổng video trong dự án cần nhỏ hơn 2 GB.");
      return;
    }
    onUpload(files);
  };

  return (
    <section className="rounded-[22px] border border-[#DDEBD6] bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-[#284D31]"><CloudUpload size={17} className="text-[#3F8240]" /> Video thô</p>
          <p className="mt-1 text-xs leading-5 text-[#748A74]">Chọn 1–10 clip dọc. Video được gửi thẳng vào kho riêng tư của bạn.</p>
        </div>
        <span className="rounded-full bg-[#F1F6EE] px-3 py-1.5 text-[11px] font-bold text-[#607760]">{sourceAssets.length}/{upload.maxFiles} clip · {formatBytes(usedBytes)}</span>
      </div>

      {upload.configured ? (
        <div className="mt-4 grid gap-3 md:grid-cols-[0.9fr_1.1fr]">
          <button
            type="button"
            disabled={Boolean(progress) || locked || sourceAssets.length >= upload.maxFiles}
            onClick={onRecord}
            className="group min-h-36 rounded-2xl border border-[#9FCB90] bg-gradient-to-br from-[#EAF6E4] to-[#F8FCF6] p-5 text-left transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(55,100,58,0.13)] disabled:cursor-not-allowed disabled:opacity-55"
          >
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#4E8052] text-white shadow-[0_8px_18px_rgba(55,100,58,0.2)]"><Camera size={22} /></span>
            <p className="mt-3 text-sm font-bold text-[#31583A]">Quay ngay với teleprompter</p>
            <p className="mt-1 text-[11px] leading-5 text-[#6F836E]">Kịch bản chạy ngay trên màn hình khi bạn quay. Không cần chuẩn bị video trước.</p>
          </button>
          <button
            type="button"
            disabled={Boolean(progress) || locked || sourceAssets.length >= upload.maxFiles}
            onClick={() => inputRef.current?.click()}
            onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => { event.preventDefault(); setDragging(false); if (!locked) validate(event.dataTransfer.files); }}
            className={`grid min-h-36 place-items-center rounded-2xl border-2 border-dashed p-5 text-center transition ${dragging ? "border-[#72B65D] bg-[#F0F8EC]" : "border-[#CFDFC8] bg-[#FBFDF9] hover:border-[#91BD82] hover:bg-[#F7FBF4]"} disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {progress ? (
              <div className="w-full max-w-sm">
                <LoaderCircle size={25} className="mx-auto animate-spin text-[#4E8052]" />
                <p className="mt-3 truncate text-sm font-bold text-[#31583A]">Đang lưu {progress.fileName}</p>
                <p className="mt-1 text-xs text-[#748A74]">Clip {progress.current}/{progress.total} · {progress.progress}%</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#DCEAD6]"><span className="block h-full rounded-full bg-[#72B65D] transition-all" style={{ width: `${progress.progress}%` }} /></div>
              </div>
            ) : (
              <div>
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#3F8240] shadow-sm"><FileVideo2 size={22} /></span>
                <p className="mt-3 text-sm font-bold text-[#31583A]">Đã quay sẵn? Tải clip lên</p>
                <p className="mt-1 text-[11px] text-[#879487]">MP4, MOV, WebM · tổng tối đa 2 GB</p>
              </div>
            )}
          </button>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-[#F0D6A8] bg-[#FFF7E8] p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-[#7C6238]"><HardDrive size={17} /> Kho video chưa được kết nối</p>
          <p className="mt-1 text-xs leading-5 text-[#8B7650]">Dự án đã được giữ lại. Sau khi quản trị viên kết nối kho lưu trữ, bạn có thể quay lại và tải video lên.</p>
        </div>
      )}
      {locked && <p className="mt-3 flex items-center gap-2 rounded-xl bg-[#EEF5FA] px-3 py-2.5 text-xs text-[#496D8B]"><LockKeyhole size={14} /> Emsen đang xử lý nên tạm khóa việc thêm clip.</p>}
      <input ref={inputRef} hidden type="file" multiple accept={upload.acceptedMimeTypes.join(",")} onChange={(event) => { if (event.target.files) validate(event.target.files); event.target.value = ""; }} />
      {validationError && <p role="alert" className="mt-3 rounded-xl bg-[#FFF0EC] px-3 py-2.5 text-xs text-[#9A4B42]">{validationError}</p>}

      {sourceAssets.length > 0 && (
        <div className="mt-4 space-y-2">
          {sourceAssets.map((asset) => (
            <div key={asset.id} className="flex items-center gap-3 rounded-xl border border-[#E7EEE3] bg-[#FCFDFB] px-3 py-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#EAF6E4] text-[#3F8240]">{asset.status === "pending-upload" ? <LoaderCircle size={17} className="animate-spin" /> : <CheckCircle2 size={17} />}</span>
              <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-[#31583A]">{asset.fileName}</p><p className="mt-0.5 text-[10px] text-[#879487]">{formatBytes(asset.sizeBytes)} · {videoAssetStatusLabels[asset.status]}</p></div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
