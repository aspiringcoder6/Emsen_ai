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

test("the Emsen registry exposes the eleven MVP agent skills", () => {
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
      "script.get_current",
      "script.create_draft",
      "script.update_draft",
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

test("chat creates a script from a named content plan instead of changing the plan", () => {
  const call = inferAgentSkillCall("Tạo kịch bản từ Kế hoạch nội dung 01 cho nội dung về một ngày bắt đầu lại");
  assert.equal(call.name, "script.create_draft");
  assert.equal(call.planName, "ke hoach noi dung 01");
});

test("chat recognizes a shortened plan name and a quoted scheduled item", () => {
  const call = inferAgentSkillCall("Tạo kịch bản cho nội dung “Một ngày bắt đầu lại” trong kế hoạch 01");
  assert.equal(call.name, "script.create_draft");
  assert.equal(call.planName, "ke hoach 01");
  assert.equal(call.contentTitle, "Một ngày bắt đầu lại");
});

test("chat updates only the specified script section", () => {
  const call = inferAgentSkillCall("Sửa hook của kịch bản “Một ngày bắt đầu lại” cho gần gũi hơn");
  assert.equal(call.name, "script.update_draft");
  assert.equal(call.scriptSection, "hook");
  assert.equal(call.scriptTitle, "Một ngày bắt đầu lại");
});

test("chat reads scripts without writing", () => {
  assert.equal(inferAgentSkillCall("Cho mình xem các kịch bản hiện tại").name, "script.get_current");
});

test("chat cannot delete or finalize a script", () => {
  for (const content of ["Xóa kịch bản này", "Chốt kịch bản này", "Nếu sửa kịch bản thì có sao không?"]) {
    assert.equal(resolveAgentSkillCall(content, {
      ...emptyAgentChatSkillCall(), name: "script.update_draft",
    }).name, "none");
  }
});

test("a generic hook request cannot create a stored script", () => {
  const call = resolveAgentSkillCall("Giúp mình viết ba hook cho video hôm nay", {
    ...emptyAgentChatSkillCall(), name: "script.create_draft",
  });
  assert.equal(call.name, "none");
});

test("the script help quick prompt remains a conversation, not a database write", () => {
  assert.equal(inferAgentSkillCall("Mình cần hỗ trợ viết kịch bản").name, "none");
  assert.equal(inferAgentSkillCall("Kịch bản của mình hơi dài").name, "none");
});

test("an independent script stays independent even if the model imagines a matching plan item", () => {
  const call = resolveAgentSkillCall("Tạo kịch bản về Bắt đầu làm content", {
    ...emptyAgentChatSkillCall(),
    name: "script.create_draft",
    contentTitle: "Bắt đầu làm content",
    planName: "Kế hoạch nội dung 01",
  });
  assert.equal(call.name, "script.create_draft");
  assert.equal(call.contentTitle, "");
  assert.equal(call.planName, "");
  assert.equal(call.scriptTitle, "Bắt đầu làm content");
});

test("changing script duration is routed to settings without changing creative sections", () => {
  const call = inferAgentSkillCall("Đổi thời lượng kịch bản “Bắt đầu làm content” thành 30 giây");
  assert.equal(call.name, "script.update_draft");
  assert.equal(call.scriptSection, "none");
  assert.equal(call.scriptDurationSeconds, 30);
});

test("chat extracts common script platform and minute duration without the model", () => {
  const call = inferAgentSkillCall("Đổi kịch bản “Bắt đầu làm content” sang TikTok, dài 1 phút");
  assert.equal(call.name, "script.update_draft");
  assert.equal(call.scriptPlatform, "TikTok");
  assert.equal(call.scriptDurationSeconds, 60);
});
