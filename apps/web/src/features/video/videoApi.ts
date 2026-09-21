import type {
  CompleteVideoUploadResponseDto,
  CreateVideoProjectRequestDto,
  CreateVideoUploadRequestDto,
  StartVideoTranscriptionRequestDto,
  UpdateVideoTranscriptRequestDto,
  VideoProjectDto,
  VideoPlaybackTicketDto,
  VideoUploadTicketDto,
  VideoWorkspaceDto,
} from "@creator-flow/contracts";
import { apiRequest } from "../../lib/apiClient";

export const getVideoWorkspace = () => apiRequest<VideoWorkspaceDto>("/video");

export const getVideoProject = (projectId: string) =>
  apiRequest<VideoProjectDto>(`/video/projects/${projectId}`);

export const getVideoPlayback = (projectId: string, assetId: string) =>
  apiRequest<VideoPlaybackTicketDto>(`/video/projects/${projectId}/assets/${assetId}/playback`);

export const createVideoProject = (body: CreateVideoProjectRequestDto) =>
  apiRequest<VideoProjectDto>("/video/projects", { method: "POST", body });

export const createVideoUpload = (projectId: string, body: CreateVideoUploadRequestDto) =>
  apiRequest<VideoUploadTicketDto>(`/video/projects/${projectId}/uploads`, { method: "POST", body });

export const completeVideoUpload = (projectId: string, assetId: string) =>
  apiRequest<CompleteVideoUploadResponseDto>(`/video/projects/${projectId}/uploads/${assetId}/complete`, {
    method: "POST",
    body: {},
  });

export const startVideoTranscription = (
  projectId: string,
  body: StartVideoTranscriptionRequestDto,
) => apiRequest<VideoProjectDto>(`/video/projects/${projectId}/transcription`, {
  method: "POST",
  body,
});

export const updateVideoTranscript = (
  projectId: string,
  body: UpdateVideoTranscriptRequestDto,
) => apiRequest<VideoProjectDto>(`/video/projects/${projectId}/transcript`, {
  method: "PUT",
  body,
});

function putFile(ticket: VideoUploadTicketDto, file: File, onProgress: (progress: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open(ticket.method, ticket.uploadUrl);
    Object.entries(ticket.headers).forEach(([name, value]) => request.setRequestHeader(name, value));
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100));
    });
    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress(100);
        resolve();
      } else {
        reject(new Error("Kho video chưa nhận được tệp. Hãy kiểm tra kết nối và thử lại."));
      }
    });
    request.addEventListener("error", () => reject(new Error("Kết nối tải video bị gián đoạn.")));
    request.addEventListener("abort", () => reject(new Error("Đã dừng tải video.")));
    request.send(file);
  });
}

export async function uploadVideoSource(
  projectId: string,
  file: File,
  idempotencyKey: string,
  onProgress: (progress: number) => void,
  origin: CreateVideoUploadRequestDto["origin"] = "upload",
) {
  const ticket = await createVideoUpload(projectId, {
    fileName: file.name,
    idempotencyKey,
    mimeType: file.type,
    origin,
    sizeBytes: file.size,
  });
  await putFile(ticket, file, onProgress);
  return completeVideoUpload(projectId, ticket.asset.id);
}
