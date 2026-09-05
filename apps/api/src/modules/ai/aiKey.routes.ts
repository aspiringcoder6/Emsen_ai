import { Router } from "express";
import { requireAuth } from "../auth/session.js";
import { HttpError } from "../../shared/http.js";
import { getAiKeySettings, removeApiKey, testAndSaveApiKey } from "./aiKey.service.js";

export const aiKeyRouter = Router();
aiKeyRouter.use(requireAuth);
aiKeyRouter.use((_request, response, next) => { response.setHeader("Cache-Control", "no-store"); next(); });
aiKeyRouter.get("/", async (request, response) => { response.json(await getAiKeySettings(request.auth!.userId)); });
aiKeyRouter.put("/", async (request, response) => {
  const value: unknown = request.body?.apiKey;
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{20,256}$/.test(value.trim())) throw new HttpError(400, "INVALID_API_KEY", "API key không hợp lệ. Hãy dán nguyên key từ Google AI Studio, không kèm dấu ngoặc hoặc khoảng trắng.");
  response.json(await testAndSaveApiKey(request.auth!.userId, value.trim()));
});
aiKeyRouter.delete("/", async (request, response) => { response.json(await removeApiKey(request.auth!.userId)); });
