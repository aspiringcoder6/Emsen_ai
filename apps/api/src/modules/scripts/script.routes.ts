import { Router } from "express";
import { requireAuth } from "../auth/session.js";
import { HttpError } from "../../shared/http.js";
import { parseCreateScript, parseScriptAssist, parseScriptBrainstorm, parseUpdateScript } from "./script.schema.js";
import { assistScript, brainstormScript, createScript, deleteScript, getScript, getScriptWorkspace, updateScript } from "./script.service.js";
import { parseStoryboardUpload } from "./storyboard.schema.js";
import { getStoryboardAsset, uploadStoryboardAsset } from "./storyboardAssets.service.js";
import { parseGenerateStoryboardImage } from "./storyboardImages.schema.js";
import { getStoryboardImageWorkspace, queueStoryboardImage } from "./storyboardImages.service.js";

export const scriptRouter = Router();
scriptRouter.use(requireAuth);

function scriptId(value: unknown) {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new HttpError(400, "INVALID_SCRIPT_ID", "Mã kịch bản không hợp lệ.");
  }
  return value;
}

scriptRouter.get("/", async (request, response) => {
  response.json(await getScriptWorkspace(request.auth!.userId));
});

scriptRouter.post("/", async (request, response) => {
  response.status(201).json(await createScript(request.auth!.userId, parseCreateScript(request.body)));
});

scriptRouter.post("/brainstorm", async (request, response) => {
  response.json(await brainstormScript(request.auth!.userId, parseScriptBrainstorm(request.body)));
});

scriptRouter.get("/:scriptId", async (request, response) => {
  response.json(await getScript(request.auth!.userId, scriptId(request.params.scriptId)));
});

scriptRouter.post("/:scriptId/storyboard-assets", async (request, response) => {
  response.status(201).json(await uploadStoryboardAsset(request.auth!.userId, scriptId(request.params.scriptId), parseStoryboardUpload(request.body)));
});

scriptRouter.get("/:scriptId/storyboard-assets/:assetId", async (request, response) => {
  response.setHeader("Cache-Control", "no-store");
  response.json(await getStoryboardAsset(request.auth!.userId, scriptId(request.params.scriptId), scriptId(request.params.assetId)));
});

scriptRouter.get("/:scriptId/storyboard-images", async (request, response) => {
  response.setHeader("Cache-Control", "no-store");
  response.json(await getStoryboardImageWorkspace(request.auth!.userId, scriptId(request.params.scriptId)));
});

scriptRouter.post("/:scriptId/storyboard-images", async (request, response) => {
  response.status(202).json(await queueStoryboardImage(request.auth!.userId, scriptId(request.params.scriptId), parseGenerateStoryboardImage(request.body)));
});

scriptRouter.put("/:scriptId", async (request, response) => {
  response.json(
    await updateScript(
      request.auth!.userId,
      scriptId(request.params.scriptId),
      parseUpdateScript(request.body),
    ),
  );
});

scriptRouter.delete("/:scriptId", async (request, response) => {
  await deleteScript(request.auth!.userId, scriptId(request.params.scriptId));
  response.status(204).end();
});

scriptRouter.post("/:scriptId/assist", async (request, response) => {
  response.json(
    await assistScript(
      request.auth!.userId,
      scriptId(request.params.scriptId),
      parseScriptAssist(request.body),
    ),
  );
});
