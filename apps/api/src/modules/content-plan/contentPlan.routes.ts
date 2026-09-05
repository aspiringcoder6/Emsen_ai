import { Router } from "express";
import { requireAuth } from "../auth/session.js";
import { HttpError } from "../../shared/http.js";
import { parseBaseVersion } from "../direction/direction.schema.js";
import { parsePlanBrief, parseWeekStart, planObject } from "./contentPlan.schema.js";
import { generateContentPlan, getContentPlanState, saveContentPlan } from "./contentPlan.service.js";
import type { ContentPlanItemDto } from "@creator-flow/contracts";

export const contentPlanRouter = Router();
contentPlanRouter.use(requireAuth);
function common(value: unknown) {
  const body = planObject(value);
  if (typeof body.directionId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.directionId)) throw new HttpError(400, "INVALID_DIRECTION_ID", "Định hướng không hợp lệ.");
  return { baseVersion: parseBaseVersion(body.baseVersion), brief: parsePlanBrief(body.brief), directionId: body.directionId };
}
contentPlanRouter.get("/", async (request, response) => { response.json(await getContentPlanState(request.auth!.userId, parseWeekStart(request.query.weekStart))); });
contentPlanRouter.post("/versions", async (request, response) => {
  const body = planObject(request.body);
  const input = common(body);
  if (body.status !== "draft" && body.status !== "approved") throw new HttpError(400, "INVALID_STATUS", "Trạng thái kế hoạch không hợp lệ.");
  response.status(201).json(await saveContentPlan(request.auth!.userId, { ...input, items: body.items as ContentPlanItemDto[], status: body.status }));
});
contentPlanRouter.post("/generate", async (request, response) => {
  const body = planObject(request.body);
  const input = common(body);
  if (body.dayIndex !== undefined && (!Number.isInteger(body.dayIndex) || (body.dayIndex as number) < 0 || (body.dayIndex as number) > 6)) throw new HttpError(400, "INVALID_DAY", "Ngày cần tạo lại không hợp lệ.");
  response.status(201).json(await generateContentPlan(request.auth!.userId, { ...input,
    ...(body.dayIndex !== undefined ? { dayIndex: body.dayIndex as number, items: body.items as ContentPlanItemDto[] } : {}),
  }));
});
