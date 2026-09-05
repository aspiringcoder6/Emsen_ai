import type {
  CreatorDnaLearningSource,
  CreatorDnaProfile,
  CreatorDnaSignalCategory,
  CreatorDnaSignalSuggestion,
} from "../creatorDnaTypes";

export type CreatorDnaLearningInput = {
  profile: CreatorDnaProfile;
  prompt: string;
  source: CreatorDnaLearningSource;
  text: string;
};

export interface CreatorDnaLearningEngine {
  analyze(input: CreatorDnaLearningInput): Promise<CreatorDnaSignalSuggestion>;
}

function pickCategory(source: CreatorDnaLearningSource, text: string): CreatorDnaSignalCategory {
  const normalized = text.toLocaleLowerCase("vi-VN");

  if (/không|tránh|đừng|ghét|cấm|quá đà|ép/.test(normalized)) {
    return "Điều cần tránh";
  }

  if (/khán giả|người xem|khách hàng|mọi người|họ hỏi/.test(normalized)) {
    return "Khán giả";
  }

  if (/mua|dùng|sản phẩm|món|giá|đáng tiền/.test(normalized)) {
    return "Sản phẩm phù hợp";
  }

  if (source === "script-feedback") {
    return "Giọng điệu";
  }

  if (source === "direct-update") {
    return "Chủ đề quen thuộc";
  }

  return "Kho câu chuyện";
}

function buildSummary(category: CreatorDnaSignalCategory, text: string) {
  const cleanText = text.replace(/\s+/g, " ").trim();
  const shortened = cleanText.length > 118 ? `${cleanText.slice(0, 115)}…` : cleanText;

  const prefixes: Record<CreatorDnaSignalCategory, string> = {
    "Kho câu chuyện": "Chất liệu đời thật:",
    "Chủ đề quen thuộc": "Muốn ưu tiên:",
    "Giọng điệu": "Phản hồi về giọng:",
    "Khán giả": "Tín hiệu từ khán giả:",
    "Sản phẩm phù hợp": "Mối quan tâm sản phẩm:",
    "Điều cần tránh": "Ranh giới mới:",
  };

  return `${prefixes[category]} ${shortened}`;
}

export const demoCreatorDnaLearningEngine: CreatorDnaLearningEngine = {
  async analyze(input) {
    await new Promise((resolve) => window.setTimeout(resolve, 520));
    const category = pickCategory(input.source, input.text);

    return {
      category,
      confidence: input.text.trim().length > 80 ? 88 : 76,
      evidence: input.text.trim(),
      summary: buildSummary(category, input.text),
    };
  },
};
