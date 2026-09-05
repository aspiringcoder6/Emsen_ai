import { Router } from "express";
import type { DirectionSection } from "@creator-flow/contracts";
import { requireAuth } from "../auth/session.js";
import { HttpError } from "../../shared/http.js";
import { object, parseBaseVersion, parseBrief, parseContent } from "./direction.schema.js";
import { generateDirection, getDirectionState, saveDirection } from "./direction.service.js";

export const directionRouter = Router();
directionRouter.use(requireAuth);
directionRouter.get("/", async (request, response) => {
  response.json(await getDirectionState(request.auth!.userId));
});
directionRouter.post("/versions", async (request, response) => {
  const body = object(request.body);
  if (body.status !== "draft" && body.status !== "approved") throw new HttpError(400, "INVALID_STATUS", "Trạng thái định hướng không hợp lệ.");
  response.status(201).json(await saveDirection(request.auth!.userId, {
    baseVersion: parseBaseVersion(body.baseVersion), brief: parseBrief(body.brief), content: parseContent(body.content), status: body.status,
  }));
});
directionRouter.post("/generate", async (request, response) => {
  const body = object(request.body);
  if (!["all", "positioning", "tone", "audience", "pillars"].includes(body.section as string)) throw new HttpError(400, "INVALID_SECTION", "Phần định hướng không hợp lệ.");
  response.status(201).json(await generateDirection(request.auth!.userId, {
    baseVersion: parseBaseVersion(body.baseVersion), brief: parseBrief(body.brief), section: body.section as DirectionSection | "all",
    ...(body.section !== "all" ? { content: parseContent(body.content) } : {}),
  }));
});
