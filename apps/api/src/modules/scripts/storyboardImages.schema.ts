import type { GenerateStoryboardImageRequestDto, StoryboardCreatorAction, StoryboardImageStyle } from "@creator-flow/contracts";
import { HttpError } from "../../shared/http.js";

function text(value: unknown, name: string, maximum: number, required = false) {
  if (typeof value !== "string" || value.length > maximum || (required && !value.trim())) throw new HttpError(400, "INVALID_IMAGE_REQUEST", `${name} không hợp lệ.`);
  return value.trim();
}

export function parseGenerateStoryboardImage(value: unknown): GenerateStoryboardImageRequestDto {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new HttpError(400, "INVALID_IMAGE_REQUEST", "Yêu cầu tạo ảnh không hợp lệ.");
  const input = value as Record<string, unknown>;
  const requestId = text(input.requestId, "Mã yêu cầu", 36, true);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId)) throw new HttpError(400, "INVALID_IMAGE_REQUEST", "Mã yêu cầu cần là UUID.");
  if (!Number.isInteger(input.scriptRevision) || Number(input.scriptRevision) < 1) throw new HttpError(400, "INVALID_IMAGE_REQUEST", "Cần phiên bản kịch bản hiện tại.");
  if (!["9:16", "1:1", "16:9", "4:5"].includes(String(input.aspectRatio))) throw new HttpError(400, "INVALID_IMAGE_REQUEST", "Tỷ lệ khung hình không hợp lệ.");
  if (!["creator", "sketch", "cinematic", "illustration"].includes(String(input.style))) throw new HttpError(400, "INVALID_IMAGE_REQUEST", "Phong cách tạo ảnh không hợp lệ.");
  const creatorAction = input.creatorAction ?? "auto";
  if (!["auto", "talk-to-camera", "show-product", "unbox", "demonstrate", "b-roll"].includes(String(creatorAction))) throw new HttpError(400, "INVALID_IMAGE_REQUEST", "Động tác creator không hợp lệ.");
  if (!input.scene || typeof input.scene !== "object" || Array.isArray(input.scene)) throw new HttpError(400, "INVALID_IMAGE_REQUEST", "Cần một cảnh để minh họa.");
  const scene = input.scene as Record<string, unknown>;
  if (scene.locked !== undefined && typeof scene.locked !== "boolean") throw new HttpError(400, "INVALID_IMAGE_REQUEST", "Trạng thái khóa cảnh không hợp lệ.");
  const output: GenerateStoryboardImageRequestDto = {
    requestId, scriptRevision: Number(input.scriptRevision), aspectRatio: input.aspectRatio as GenerateStoryboardImageRequestDto["aspectRatio"],
    style: input.style as StoryboardImageStyle, prompt: text(input.prompt, "Mô tả bổ sung", 1_200),
    creatorAction: creatorAction as StoryboardCreatorAction,
    scene: { id: text(scene.id, "Mã cảnh", 100, true), title: text(scene.title, "Tên cảnh", 120, true), visual: text(scene.visual, "Mô tả hình ảnh", 2_000), direction: text(scene.direction, "Chỉ dẫn quay", 2_000), locked: scene.locked === true },
  };
  if (!output.scene.visual && !output.prompt) throw new HttpError(400, "INVALID_IMAGE_REQUEST", "Hãy mô tả hình ảnh / hành động hoặc nhập mô tả bổ sung trước khi tạo ảnh.");
  if (output.scene.locked) throw new HttpError(409, "STORYBOARD_SCENE_LOCKED", "Mở khóa cảnh trước khi nhờ AI tạo ảnh.");
  return output;
}
