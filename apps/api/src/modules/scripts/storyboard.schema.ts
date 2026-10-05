import type { StoryboardTextOverlayDto, UploadStoryboardAssetRequestDto } from "@creator-flow/contracts";
import { HttpError } from "../../shared/http.js";

const invalid = (message: string): never => { throw new HttpError(400, "INVALID_STORYBOARD", message); };
export const maxStoryboardImageBytes = 3 * 1024 * 1024;

export function storyboardAssetId(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return invalid("Mã ảnh storyboard không hợp lệ.");
  return value;
}

export function parseStoryboardOverlay(value: unknown): StoryboardTextOverlayDto {
  if (value === undefined || value === null) return { text: "", font: "sans", color: "#FFFFFF", backgroundColor: "#284D31", position: "bottom", size: "medium" };
  if (typeof value !== "object" || Array.isArray(value)) return invalid("Chữ trên màn hình không hợp lệ.");
  const row = value as Record<string, unknown>;
  if (typeof row.text !== "string" || row.text.length > 300) return invalid("Chữ trên màn hình tối đa 300 ký tự.");
  if (!["sans", "serif", "mono"].includes(String(row.font)) || !["top", "center", "bottom"].includes(String(row.position)) || !["small", "medium", "large"].includes(String(row.size))) return invalid("Kiểu chữ hoặc vị trí không hợp lệ.");
  if (typeof row.color !== "string" || !/^#[0-9a-f]{6}$/i.test(row.color) || typeof row.backgroundColor !== "string" || !/^#[0-9a-f]{6}$/i.test(row.backgroundColor)) return invalid("Màu chữ và màu nền cần có dạng #RRGGBB.");
  return { text: row.text.trim(), font: row.font as StoryboardTextOverlayDto["font"], color: row.color, backgroundColor: row.backgroundColor, position: row.position as StoryboardTextOverlayDto["position"], size: row.size as StoryboardTextOverlayDto["size"] };
}

export function parseStoryboardUpload(value: unknown): UploadStoryboardAssetRequestDto & { bytes: Buffer } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalid("Ảnh storyboard không hợp lệ.");
  const row = value as Record<string, unknown>;
  if (typeof row.fileName !== "string" || !row.fileName.trim() || row.fileName.length > 180) return invalid("Tên ảnh cần hợp lệ và không quá 180 ký tự.");
  if (!["image/png", "image/jpeg", "image/webp"].includes(String(row.mimeType))) return invalid("Hãy chọn ảnh PNG, JPEG hoặc WebP.");
  if (typeof row.dataBase64 !== "string" || row.dataBase64.length > 4_194_304 || !/^[A-Za-z0-9+/]+={0,2}$/.test(row.dataBase64)) return invalid("Dữ liệu ảnh không hợp lệ hoặc lớn hơn 3 MB.");
  const bytes = Buffer.from(row.dataBase64, "base64");
  if (!bytes.length || bytes.length > maxStoryboardImageBytes || bytes.toString("base64") !== row.dataBase64) return invalid("Ảnh tối đa 3 MB và cần có dữ liệu hợp lệ.");
  const png = bytes.length >= 33 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && bytes.subarray(12, 16).toString() === "IHDR";
  const jpeg = bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[bytes.length - 2] === 255 && bytes[bytes.length - 1] === 217;
  const webp = bytes.length >= 20 && bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP" && bytes.readUInt32LE(4) === bytes.length - 8;
  if (!(row.mimeType === "image/png" ? png : row.mimeType === "image/jpeg" ? jpeg : webp)) return invalid("Nội dung tệp không khớp định dạng ảnh đã chọn.");
  return { fileName: row.fileName.trim(), mimeType: row.mimeType as string, dataBase64: row.dataBase64, bytes };
}
