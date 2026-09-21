import { Router } from "express";
import { HttpError } from "../../shared/http.js";
import { requireAuth } from "../auth/session.js";
import {
  parseCreateVideoProject,
  parseCreateVideoUpload,
  parseStartVideoTranscription,
  parseUpdateVideoTranscript,
  parseUuid,
} from "./video.schema.js";
import {
  completeVideoUpload,
  createVideoProject,
  createVideoUpload,
  getVideoProject,
  getVideoPlayback,
  getVideoWorkspace,
  startVideoTranscription,
  updateVideoTranscript,
} from "./video.service.js";

export const videoRouter = Router();
videoRouter.use(requireAuth);

function projectId(value: unknown) {
  return parseUuid(value, "INVALID_VIDEO_PROJECT_ID", "Mã dự án video không hợp lệ.");
}

function assetId(value: unknown) {
  return parseUuid(value, "INVALID_VIDEO_ASSET_ID", "Mã video tải lên không hợp lệ.");
}

videoRouter.get("/", async (request, response) => {
  response.json(await getVideoWorkspace(request.auth!.userId));
});

videoRouter.post("/projects", async (request, response) => {
  response.status(201).json(
    await createVideoProject(request.auth!.userId, parseCreateVideoProject(request.body)),
  );
});

videoRouter.get("/projects/:projectId", async (request, response) => {
  response.json(
    await getVideoProject(request.auth!.userId, projectId(request.params.projectId)),
  );
});

videoRouter.post("/projects/:projectId/uploads", async (request, response) => {
  response.status(201).json(
    await createVideoUpload(
      request.auth!.userId,
      projectId(request.params.projectId),
      parseCreateVideoUpload(request.body),
    ),
  );
});

videoRouter.post("/projects/:projectId/uploads/:assetId/complete", async (request, response) => {
  if (request.body && (typeof request.body !== "object" || Array.isArray(request.body))) {
    throw new HttpError(400, "INVALID_VIDEO_REQUEST", "Thông tin xác nhận video chưa hợp lệ.");
  }
  response.json(
    await completeVideoUpload(
      request.auth!.userId,
      projectId(request.params.projectId),
      assetId(request.params.assetId),
    ),
  );
});

videoRouter.get("/projects/:projectId/assets/:assetId/playback", async (request, response) => {
  response.json(
    await getVideoPlayback(
      request.auth!.userId,
      projectId(request.params.projectId),
      assetId(request.params.assetId),
    ),
  );
});

videoRouter.post("/projects/:projectId/transcription", async (request, response) => {
  const input = parseStartVideoTranscription(request.body);
  response.status(202).json(
    await startVideoTranscription(
      request.auth!.userId,
      projectId(request.params.projectId),
      input.idempotencyKey,
    ),
  );
});

videoRouter.put("/projects/:projectId/transcript", async (request, response) => {
  response.json(
    await updateVideoTranscript(
      request.auth!.userId,
      projectId(request.params.projectId),
      parseUpdateVideoTranscript(request.body),
    ),
  );
});
