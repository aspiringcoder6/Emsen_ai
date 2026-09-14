import assert from "node:assert/strict";
import test from "node:test";
import {
  emptyAgentChatSkillCall,
  inferAgentSkillCall,
  resolveAgentSkillCall,
} from "../src/modules/agent/agentChatPlanner.js";
import { agentSkillRegistry, getAgentSkillCatalog } from "../src/modules/agent/agentSkills.js";
import type {
  AskProactiveQuestionInput,
  AskProactiveQuestionOutput,
} from "../src/modules/agent/creatorDna.skills.js";

test("the Emsen registry exposes the eight MVP agent skills", () => {
  assert.deepEqual(
    getAgentSkillCatalog().map(({ name }) => name),
    [
      "creator_dna.ask_proactive_question",
      "creator_dna.capture_chat_signals",
      "direction.get_current",
      "direction.generate_draft",
      "direction.update_draft",
      "content_plan.get_current",
      "content_plan.generate_draft",
      "content_plan.update_draft",
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
    inferAgentSkillCall("Emsen, nói cho mình định hướng hiện tại nhé").name,
    "direction.get_current",
  );
});

test("Vietnamese chat intent updates only the requested direction section", () => {
  const call = inferAgentSkillCall(
    "Hãy đổi giọng điệu trong định hướng thành gần gũi và ngắn gọn hơn",
  );
  assert.equal(call.name, "direction.update_draft");
  assert.equal(call.section, "tone");
});

test("Vietnamese chat intent creates a direction draft", () => {
  assert.equal(
    inferAgentSkillCall("Giúp mình tạo định hướng kênh từ Creator DNA").name,
    "direction.generate_draft",
  );
});

test("deterministic user intent overrides a conflicting model action", () => {
  const call = resolveAgentSkillCall("Cập nhật trụ cột nội dung trong định hướng", {
    ...emptyAgentChatSkillCall(),
    name: "direction.get_current",
  });
  assert.equal(call.name, "direction.update_draft");
  assert.equal(call.section, "pillars");
});

test("ordinary creative chat does not trigger a direction skill", () => {
  assert.equal(
    inferAgentSkillCall("Giúp mình viết ba hook cho video hôm nay").name,
    "none",
  );
});

test("a hypothetical direction question never writes a draft", () => {
  const modelCall = {
    ...emptyAgentChatSkillCall(),
    name: "direction.update_draft" as const,
  };
  const call = resolveAgentSkillCall(
    "Nếu mình đổi định hướng thì có ảnh hưởng kế hoạch cũ không?",
    modelCall,
  );
  assert.equal(call.name, "none");
});

test("chat cannot approve a Direction version", () => {
  const call = resolveAgentSkillCall("Chốt định hướng mới giúp mình", {
    ...emptyAgentChatSkillCall(),
    name: "direction.update_draft",
  });
  assert.equal(call.name, "none");
});

test("chat cannot approve a Content Plan version", () => {
  const call = resolveAgentSkillCall("Chốt Kế hoạch nội dung 01 giúp mình", {
    ...emptyAgentChatSkillCall(),
    name: "content_plan.update_draft",
  });
  assert.equal(call.name, "none");
});

test("chat creates a plan with week, availability and target extracted in Vietnamese", () => {
  const call = inferAgentSkillCall(
    "Tạo kế hoạch nội dung tuần sau, mình rảnh thứ 3 và thứ 7, mục tiêu 3 video",
  );
  assert.equal(call.name, "content_plan.generate_draft");
  assert.deepEqual(call.availableDays, [1, 5]);
  assert.equal(call.weeklyVideoTarget, 3);
  assert.equal(call.replaceAvailableDays, true);
  assert.equal(call.replaceWeeklyVideoTarget, true);
  assert.match(call.weekStart, /^20\d{2}-\d{2}-\d{2}$/);
});

test("chat selects a named plan for adjustment", () => {
  const call = inferAgentSkillCall(
    "Cập nhật Kế hoạch nội dung 01 và sắp lại lịch vào thứ 6",
  );
  assert.equal(call.name, "content_plan.update_draft");
  assert.equal(call.planName, "ke hoach noi dung 01");
  assert.deepEqual(call.availableDays, [4]);
});

test("chat can read a content plan without mutating it", () => {
  assert.equal(
    inferAgentSkillCall("Cho mình xem kế hoạch nội dung hiện tại").name,
    "content_plan.get_current",
  );
});
