import { AgentSkillRegistry } from "./agentSkill.registry.js";
import {
  askProactiveQuestionSkill,
  captureChatSignalsSkill,
} from "./creatorDna.skills.js";
import {
  generateDirectionDraftSkill,
  getCurrentDirectionSkill,
  updateDirectionDraftSkill,
} from "./direction.skills.js";
import {
  generateContentPlanDraftSkill,
  getCurrentContentPlanSkill,
  updateContentPlanDraftSkill,
} from "./contentPlan.skills.js";

export const agentSkillRegistry = new AgentSkillRegistry();

agentSkillRegistry.register(askProactiveQuestionSkill);
agentSkillRegistry.register(captureChatSignalsSkill);
agentSkillRegistry.register(getCurrentDirectionSkill);
agentSkillRegistry.register(generateDirectionDraftSkill);
agentSkillRegistry.register(updateDirectionDraftSkill);
agentSkillRegistry.register(getCurrentContentPlanSkill);
agentSkillRegistry.register(generateContentPlanDraftSkill);
agentSkillRegistry.register(updateContentPlanDraftSkill);

export function getAgentSkillCatalog() {
  return agentSkillRegistry.catalog();
}
