import type { ScriptDocumentDto, ScriptStatus } from "@creator-flow/contracts";

export const scriptStatusConfig: Record<
  ScriptStatus,
  { label: string; color: string; surface: string }
> = {
  draft: { label: "Bản nháp", color: "#806247", surface: "#FFF3DD" },
  "in-progress": { label: "Đang thực hiện", color: "#3F8240", surface: "#EAF6E4" },
  ready: { label: "Sẵn sàng quay", color: "#8B557D", surface: "#F7EAF3" },
  completed: { label: "Đã thực hiện", color: "#466D67", surface: "#E8F4F2" },
  archived: { label: "Đã lưu trữ", color: "#6F786E", surface: "#EEF1EC" },
};

export const scriptStatuses = Object.keys(scriptStatusConfig) as ScriptStatus[];

export function scriptProgress(script: ScriptDocumentDto) {
  const sections = [script.content.hook, script.content.body, script.content.cta];
  const filled = sections.filter((value) => value.trim()).length;
  const storyboardReady = script.content.storyboard.some(
    (frame) => frame.visual.trim() || frame.dialogue.trim(),
  );
  return Math.round(((filled + Number(storyboardReady)) / 4) * 100);
}

export function formatScriptDate(value: string | null) {
  if (!value) return "Chưa xếp lịch";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(`${value}T00:00:00`),
  );
}
