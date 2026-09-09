import assert from "node:assert/strict";
import test from "node:test";
import { parseGoalSuggestions } from "../src/modules/direction/direction.schema.js";

const suggestions = {
  suggestions: [
    {
      label: "Xây niềm tin",
      value: "Mình muốn xây dựng một kênh đáng tin cậy bằng kiến thức thực tế.",
    },
    {
      label: "Giúp người mới",
      value: "Mình muốn giúp người mới bắt đầu dễ dàng hơn với những hướng dẫn đơn giản.",
    },
    {
      label: "Kết nối khách hàng",
      value: "Mình muốn thu hút khách hàng phù hợp bằng nội dung hữu ích và chân thật.",
    },
  ],
};

test("accepts exactly three distinct AI goal suggestions", () => {
  assert.deepEqual(parseGoalSuggestions(suggestions), suggestions.suggestions);
});

test("rejects incomplete or duplicated AI goal suggestions", () => {
  assert.throws(() => parseGoalSuggestions({ suggestions: suggestions.suggestions.slice(0, 2) }));
  assert.throws(() =>
    parseGoalSuggestions({
      suggestions: suggestions.suggestions.map((suggestion) => ({
        ...suggestion,
        label: "Trùng lựa chọn",
      })),
    }),
  );
  assert.throws(() =>
    parseGoalSuggestions({
      suggestions: suggestions.suggestions.map((suggestion) => ({
        ...suggestion,
        value: "Ba nhãn khác nhau nhưng cùng một nội dung mục tiêu.",
      })),
    }),
  );
});
