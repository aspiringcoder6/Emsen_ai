import assert from "node:assert/strict";
import test from "node:test";
import {
  inferDirectionSkillCall,
  resolveDirectionSkillCall,
} from "../src/modules/agent/agentChatPlanner.js";
import { agentSkillRegistry, getAgentSkillCatalog } from "../src/modules/agent/agentSkills.js";
import type {
  AskProactiveQuestionInput,
  AskProactiveQuestionOutput,
} from "../src/modules/agent/creatorDna.skills.js";

test("the Emsen registry exposes the five MVP agent skills", () => {
  assert.deepEqual(
    getAgentSkillCatalog().map(({ name }) => name),
    [
      "creator_dna.ask_proactive_question",
      "creator_dna.capture_chat_signals",
      "direction.get_current",
      "direction.generate_draft",
      "direction.update_draft",
    ],
  );
});

test("proactive questions are selected through a read-only skill", async () => {
  const execution = await agentSkillRegistry.execute<
    AskProactiveQuestionInput,
    AskProactiveQuestionOutput
  >("creator_dna.ask_proactive_question", { userId: "test-user" }, { cursor: 0 });

  assert.equal(execution.ok, true);
  if (!execution.ok) return;
  assert.equal(execution.output.intent.promptId, "01");
  assert.equal(execution.run.mode, "read");
  assert.equal(execution.run.status, "succeeded");
});

test("Vietnamese chat intent reads the current direction", () => {
  assert.equal(
    inferDirectionSkillCall("Emsen, nói cho mình định hướng hiện tại nhé").name,
    "direction.get_current",
  );
});

test("Vietnamese chat intent updates only the requested direction section", () => {
  const call = inferDirectionSkillCall(
    "Hãy đổi giọng điệu trong định hướng thành gần gũi và ngắn gọn hơn",
  );
  assert.equal(call.name, "direction.update_draft");
  assert.equal(call.section, "tone");
});

test("Vietnamese chat intent creates a direction draft", () => {
  assert.equal(
    inferDirectionSkillCall("Giúp mình tạo định hướng kênh từ Creator DNA").name,
    "direction.generate_draft",
  );
});

test("deterministic user intent overrides a conflicting model action", () => {
  const call = resolveDirectionSkillCall("Cập nhật trụ cột nội dung trong định hướng", {
    goal: "",
    instruction: "",
    name: "direction.get_current",
    section: "all",
  });
  assert.equal(call.name, "direction.update_draft");
  assert.equal(call.section, "pillars");
});

test("ordinary creative chat does not trigger a direction skill", () => {
  assert.equal(
    inferDirectionSkillCall("Giúp mình viết ba hook cho video hôm nay").name,
    "none",
  );
});

test("a hypothetical direction question never writes a draft", () => {
  const modelCall = {
    goal: "",
    instruction: "",
    name: "direction.update_draft" as const,
    section: "all" as const,
  };
  const call = resolveDirectionSkillCall(
    "Nếu mình đổi định hướng thì có ảnh hưởng kế hoạch cũ không?",
    modelCall,
  );
  assert.equal(call.name, "none");
});

test("chat cannot approve a Direction version", () => {
  const call = resolveDirectionSkillCall("Chốt định hướng mới giúp mình", {
    goal: "",
    instruction: "",
    name: "direction.update_draft",
    section: "all",
  });
  assert.equal(call.name, "none");
});
