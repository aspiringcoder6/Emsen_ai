import { Router } from "express";
import { requireAuth } from "../auth/session.js";
import { HttpError } from "../../shared/http.js";
import { parseCreateScript, parseScriptAssist, parseUpdateScript } from "./script.schema.js";
import { assistScript, createScript, getScript, getScriptWorkspace, updateScript } from "./script.service.js";

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

scriptRouter.get("/:scriptId", async (request, response) => {
  response.json(await getScript(request.auth!.userId, scriptId(request.params.scriptId)));
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

scriptRouter.post("/:scriptId/assist", async (request, response) => {
  response.json(
    await assistScript(
      request.auth!.userId,
      scriptId(request.params.scriptId),
      parseScriptAssist(request.body),
    ),
  );
});
