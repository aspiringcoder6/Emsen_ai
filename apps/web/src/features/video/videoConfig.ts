import type { VideoAssetStatus, VideoProjectStatus } from "@creator-flow/contracts";

export const videoProjectStatusConfig: Record<VideoProjectStatus, {
  label: string;
  color: string;
  surface: string;
}> = {
  setup: { label: "Chờ video thô", color: "#7A6848", surface: "#FFF4DF" },
  uploaded: { label: "Đã nhận video", color: "#3F8240", surface: "#EAF6E4" },
  analyzing: { label: "Đang kiểm tra video", color: "#496D8B", surface: "#EAF3FA" },
  transcribing: { label: "Đang tạo lời thoại", color: "#496D8B", surface: "#EAF3FA" },
  "transcript-ready": { label: "Chờ duyệt lời thoại", color: "#72506B", surface: "#F3EAF1" },
  "cut-review": { label: "Chờ duyệt Smart Cut", color: "#72506B", surface: "#F3EAF1" },
  "ready-to-render": { label: "Sẵn sàng xuất", color: "#3F8240", surface: "#EAF6E4" },
  rendering: { label: "Đang xuất video", color: "#496D8B", surface: "#EAF3FA" },
  completed: { label: "Đã hoàn thành", color: "#466D67", surface: "#E5F2EF" },
  failed: { label: "Cần thử lại", color: "#9A4B42", surface: "#FFF0EC" },
};

export const videoAssetStatusLabels: Record<VideoAssetStatus, string> = {
  "pending-upload": "Đang chờ tải lên",
  uploaded: "Đã tải lên",
  processing: "Đang kiểm tra",
  ready: "Sẵn sàng",
  failed: "Tải lên lỗi",
};

export function formatBytes(bytes: number) {
  if (bytes <= 0) return "0 KB";
  if (bytes < 1_000_000) return `${Math.max(1, Math.round(bytes / 1_000))} KB`;
  if (bytes < 1_000_000_000) return `${(bytes / 1_000_000).toFixed(bytes < 10_000_000 ? 1 : 0)} MB`;
  return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
}

export function formatVideoDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}
