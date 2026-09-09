import type { ScriptDocumentDto } from "@creator-flow/contracts";
import { formatScriptDate, scriptStatusConfig } from "./scriptConfig";

function textOrPlaceholder(value: string) {
  return value.trim() || "(Chưa viết)";
}

function safeFileName(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return normalized || "kich-ban";
}

export function scriptAsText(script: ScriptDocumentDto) {
  const metadata = [
    script.settings.platform,
    script.settings.format,
    formatScriptDate(script.settings.scheduledFor),
    `${script.settings.targetDurationSeconds} giây`,
    script.settings.aspectRatio,
  ].filter(Boolean);

  const storyboard = script.content.storyboard.length
    ? script.content.storyboard.map((frame, index) => [
      `CẢNH ${index + 1}: ${frame.title.trim() || `Keyframe ${index + 1}`} (${frame.durationSeconds} giây)`,
      `Hình ảnh: ${textOrPlaceholder(frame.visual)}`,
      `Lời thoại: ${textOrPlaceholder(frame.dialogue)}`,
      frame.direction.trim() ? `Chỉ dẫn: ${frame.direction.trim()}` : "",
    ].filter(Boolean).join("\n")).join("\n\n")
    : "(Chưa có cảnh)";

  const optionalDetails = [
    script.settings.objective.trim() ? `Mục tiêu: ${script.settings.objective.trim()}` : "",
    script.settings.audience.trim() ? `Khán giả: ${script.settings.audience.trim()}` : "",
    script.settings.tone.trim() ? `Giọng điệu: ${script.settings.tone.trim()}` : "",
    script.advancedSettings.productionNotes.trim()
      ? `Ghi chú sản xuất: ${script.advancedSettings.productionNotes.trim()}`
      : "",
  ].filter(Boolean);

  return [
    script.title.trim() || "Kịch bản chưa đặt tên",
    `${scriptStatusConfig[script.status].label} · ${metadata.join(" · ")}`,
    optionalDetails.join("\n"),
    `HOOK\n${textOrPlaceholder(script.content.hook)}`,
    `NỘI DUNG\n${textOrPlaceholder(script.content.body)}`,
    `CTA\n${textOrPlaceholder(script.content.cta)}`,
    `STORYBOARD\n${storyboard}`,
  ].filter(Boolean).join("\n\n");
}

export function scriptAsJson(script: ScriptDocumentDto) {
  return JSON.stringify(script, null, 2);
}

export function downloadScript(script: ScriptDocumentDto, format: "txt" | "json") {
  const content = format === "txt" ? scriptAsText(script) : scriptAsJson(script);
  const mimeType = format === "txt" ? "text/plain;charset=utf-8" : "application/json;charset=utf-8";
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeFileName(script.title)}.${format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
