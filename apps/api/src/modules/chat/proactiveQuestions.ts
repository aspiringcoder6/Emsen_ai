import type { ChatCollectionIntentDto } from "@creator-flow/contracts";

type QuestionInput = Omit<ChatCollectionIntentDto, "kind" | "promptId">;

function question(promptId: string, input: QuestionInput): ChatCollectionIntentDto {
  return { ...input, kind: "creator-dna", promptId };
}

export const proactiveQuestions: ChatCollectionIntentDto[] = [
  question("01", { dimension: "Ý tưởng đang ưu tiên", group: "daily-idea", priority: "high", question: "Hôm nay bạn muốn bắt đầu với ý tưởng nội dung nào?" }),
  question("02", { dimension: "Chủ đề muốn phát triển", group: "daily-idea", priority: "high", question: "Hôm nay bạn có chủ đề nào muốn phát triển thành nội dung không?" }),
  question("03", { dimension: "Nguồn cảm hứng hiện tại", group: "daily-idea", priority: "high", question: "Hôm nay bạn đang có nhiều cảm hứng nhất với chủ đề nào?" }),
  question("04", { dimension: "Ý tưởng đang ấp ủ", group: "daily-idea", priority: "high", question: "Bạn có ý tưởng nào đang ấp ủ nhưng chưa biết bắt đầu triển khai từ đâu không?" }),
  question("05", { dimension: "Trạng thái ý tưởng", group: "daily-idea", priority: "high", question: "Hôm nay bạn muốn phát triển nội dung mới hay tiếp tục hoàn thiện một ý tưởng đang có?" }),
  question("06", { dimension: "Nội dung cần làm mới", group: "daily-idea", priority: "high", question: "Bạn có nội dung nào muốn phát triển thành một phiên bản mới và hấp dẫn hơn không?" }),
  question("07", { dimension: "Nhu cầu tìm ý tưởng", group: "daily-idea", priority: "high", question: "Hôm nay bạn đang muốn tìm ý tưởng nội dung cho chủ đề nào?" }),
  question("08", { dimension: "Brief hiện tại", group: "daily-idea", priority: "high", question: "Hôm nay bạn có brief hoặc yêu cầu nội dung nào cần hỗ trợ triển khai không?" }),
  question("09", { dimension: "Nội dung quan trọng nhất", group: "creative-direction", priority: "high", question: "Nếu hôm nay chỉ làm một nội dung thật tốt, bạn muốn chọn nội dung nào?" }),
  question("10", { dimension: "Hướng sáng tạo", group: "creative-direction", priority: "high", question: "Hôm nay bạn muốn nội dung theo hướng bắt trend, kể chuyện hay chia sẻ giá trị?" }),
  question("11", { dimension: "Góc nhìn mới", group: "creative-direction", priority: "high", question: "Bạn có muốn thử một góc nhìn mới cho một chủ đề quen thuộc nào không?" }),
  question("12", { dimension: "Insight gần đây", group: "creative-direction", priority: "high", question: "Gần đây có insight nào khiến bạn nghĩ rằng đây là một ý tưởng hay để làm content không?" }),
  question("13", { dimension: "Trạng thái concept", group: "creative-direction", priority: "high", question: "Bạn muốn phát triển concept mới hay tiếp tục hoàn thiện concept đã có?" }),
  question("14", { dimension: "Điểm bí ý tưởng", group: "creative-direction", priority: "high", question: "Bạn đang bí ý tưởng ở chủ đề nào và muốn mình khơi thêm cảm hứng?" }),
  question("15", { dimension: "Mức độ thử nghiệm", group: "creative-direction", priority: "high", question: "Hôm nay bạn muốn ưu tiên ý tưởng dễ triển khai hay thử một concept thật khác biệt?" }),
  question("16", { dimension: "Format muốn thử", group: "creative-direction", priority: "high", question: "Hôm nay bạn có format nội dung nào muốn thử nghiệm không?" }),
  question("17", { dimension: "Bước công việc", group: "concrete-work", priority: "medium", question: "Bạn đang cần hỗ trợ ở bước nào: lên ý tưởng, viết nội dung hay hoàn thiện bài?" }),
  question("18", { dimension: "Nền tảng mục tiêu", group: "concrete-work", priority: "medium", question: "Nội dung tiếp theo của bạn đang hướng đến nền tảng nào?" }),
  question("19", { dimension: "Đối tượng nội dung", group: "concrete-work", priority: "medium", question: "Hôm nay bạn muốn phát triển nội dung cho sản phẩm, thương hiệu hay kênh cá nhân?" }),
  question("20", { dimension: "Chủ đề cần kể hay hơn", group: "concrete-work", priority: "medium", question: "Bạn có sản phẩm hoặc chủ đề nào muốn tìm một cách kể chuyện hấp dẫn hơn không?" }),
  question("21", { dimension: "Mức độ hoàn thiện brief", group: "concrete-work", priority: "medium", question: "Bạn đã có brief cụ thể hay mới bắt đầu từ một ý tưởng sơ khai?" }),
  question("22", { dimension: "Nội dung cần cải thiện", group: "concrete-work", priority: "medium", question: "Bạn có nội dung cũ nào muốn phân tích để cải thiện và phát triển thêm không?" }),
  question("23", { dimension: "Hạng mục ưu tiên", group: "concrete-work", priority: "medium", question: "Hôm nay bạn muốn tập trung vào hook, kịch bản, caption hay phần visual?" }),
  question("24", { dimension: "Deadline và mục tiêu", group: "concrete-work", priority: "medium", question: "Hôm nay bạn có deadline hoặc mục tiêu nội dung nào cần ưu tiên không?" }),
  question("25", { dimension: "Mức sẵn sàng khám phá", group: "inspiration", priority: "inspiration", question: "Hôm nay bạn có muốn khám phá một vài ý tưởng nội dung mới không?" }),
  question("26", { dimension: "Chủ đề đang được quan tâm", group: "inspiration", priority: "inspiration", question: "Bạn có muốn bắt đầu bằng một vài chủ đề đang được nhiều người quan tâm không?" }),
  question("27", { dimension: "Góc kể chuyện", group: "inspiration", priority: "inspiration", question: "Hôm nay bạn có muốn tìm một góc kể chuyện mới cho nội dung của mình không?" }),
  question("28", { dimension: "Điểm bắt đầu sáng tạo", group: "inspiration", priority: "inspiration", question: "Nếu chưa có ý tưởng cụ thể, bạn muốn bắt đầu từ một insight hay một xu hướng mới?" }),
  question("29", { dimension: "Ý tưởng thành concept", group: "inspiration", priority: "inspiration", question: "Hôm nay bạn có muốn biến một ý tưởng bất kỳ thành concept nội dung cụ thể không?" }),
  question("30", { dimension: "Thử thách sáng tạo", group: "inspiration", priority: "inspiration", question: "Bạn có muốn thử một thử thách sáng tạo nhỏ để khởi động công việc không?" }),
];

export const proactiveQuestionIds = ["none", ...proactiveQuestions.map(({ promptId }) => promptId)];

export function getProactiveQuestion(promptId: string) {
  return proactiveQuestions.find((item) => item.promptId === promptId) ?? null;
}

export function getNextProactiveQuestion(cursor: number) {
  return proactiveQuestions[Math.abs(cursor) % proactiveQuestions.length]!;
}
