import { getContentPlan } from "../content-plan/contentPlanApi";
import { currentWeekStart } from "../content-plan/contentPlanUtils";
import { getCreatorDna } from "../creator-dna/creatorDnaApi";
import { getDirection } from "../direction/directionApi";
import { getScriptWorkspace } from "../scripts/scriptApi";
import type { DashboardSnapshot } from "./dashboardData";

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const [creatorDna, direction, plan, scriptWorkspace] = await Promise.all([
    getCreatorDna(),
    getDirection(),
    getContentPlan(currentWeekStart()),
    getScriptWorkspace(),
  ]);
  return { creatorDna, direction, plan, scriptWorkspace };
}
