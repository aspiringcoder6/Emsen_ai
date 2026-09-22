import type {
  CreatorDnaLearningSource,
  CreatorDnaProfile,
  CreatorDnaQuestion,
  CreatorDnaSignalCategory,
} from "./creatorDnaTypes";

export const emptyCreatorDnaProfile: CreatorDnaProfile = {
  displayName: "",
  niche: "",
  platforms: [],
  toneTraits: [],
  audience: "",
  boundaries: "",
};

export const creatorDnaQuestions: CreatorDnaQuestion[] = [
  {
    id: "displayName",
    phase: "Danh tính",
    title: "Bạn muốn mình gọi bạn là gì?",
    description: "Tên hoặc cách xưng hô bạn thấy tự nhiên nhất khi làm việc cùng emsen.",
    required: true,
    signal: "Tên và cách xưng hô",
    kind: "text",
    placeholder: "Ví dụ: Hằng, Chị Hằng Skincare...",
  },
  {
    id: "niche",
    phase: "Nội dung",
    title: "Bạn đang làm nội dung hoặc quan tâm đến lĩnh vực nào?",
    description: "Bạn có thể chọn nhiều lựa chọn và thêm lĩnh vực riêng của mình.",
    required: true,
    signal: "Lĩnh vực và ngữ cảnh nội dung",
    kind: "multi-text",
    placeholder: "Thêm lĩnh vực khác…",
    options: [
      "Làm đẹp / Skincare",
      "Lifestyle",
      "Mẹ và bé",
      "Ẩm thực",
      "Thời trang",
      "Kinh doanh / Bán hàng",
      "Giáo dục / Chuyên môn",
      "Công nghệ",
      "Du lịch",
      "Sức khỏe / Wellness",
    ],
  },
  {
    id: "platforms",
    phase: "Nội dung",
    title: "Bạn đang tập trung làm nội dung trên nền tảng nào?",
    description: "Bạn có thể chọn nhiều nền tảng. Điều này giúp emsen hiểu format phù hợp.",
    required: true,
    signal: "Nền tảng và định dạng ưu tiên",
    kind: "multi",
    options: [
      "TikTok",
      "TikTok Shop",
      "Instagram Reels",
      "YouTube Shorts",
      "Facebook",
      "Shopee / Lazada",
    ],
  },
  {
    id: "toneTraits",
    phase: "Chất giọng",
    title: "Bạn muốn nội dung của mình mang phong cách như thế nào?",
    description: "Chọn tối đa 3 nét gần với bạn nhất.",
    required: false,
    signal: "Giọng điệu và cá tính",
    kind: "multi",
    selectionLimit: 3,
    options: [
      "Gần gũi, đời thường",
      "Hài hước, dí dỏm",
      "Thẳng thắn, trực diện",
      "Chuyên nghiệp, đáng tin",
      "Năng lượng, cuốn hút",
      "Nhẹ nhàng, tinh tế",
      "Sâu sắc, giàu cảm xúc",
      "Cá tính, khác biệt",
    ],
  },
  {
    id: "audience",
    phase: "Nội dung",
    title: "Bạn thường nói với ai hoặc muốn nội dung của mình hướng đến ai?",
    description: "Chọn một hoặc nhiều nhóm gần nhất. Bạn luôn có thể bổ sung nhóm riêng.",
    required: false,
    signal: "Chân dung khán giả",
    kind: "multi-text",
    placeholder: "Nhóm khán giả khác…",
    options: [
      "Gen Z",
      "Người mới đi làm",
      "Nhân sự văn phòng",
      "Chủ shop / Seller",
      "Gia đình",
      "Người quan tâm lĩnh vực chuyên môn của bạn",
      "Đại chúng",
    ],
  },
];

export const creatorDnaSignalCategories: CreatorDnaSignalCategory[] = [
  "Kho câu chuyện",
  "Chủ đề quen thuộc",
  "Giọng điệu",
  "Khán giả",
  "Sản phẩm phù hợp",
  "Điều cần tránh",
];

export const dailyStoryPrompts = [
  "Hôm nay có chuyện gì làm bạn vui, bực hoặc bất ngờ nhất không?",
  "Tuần này có ai hỏi bạn một câu khiến bạn nhớ mãi không?",
  "Gần đây bạn mua hoặc dùng món gì thấy thật sự đáng tiền?",
  "Có chuyện gì bạn hay kể với bạn thân nhưng chưa kể trên kênh không?",
];

export const learningSourceOptions: Array<{
  description: string;
  id: CreatorDnaLearningSource;
  label: string;
}> = [
  {
    id: "daily-story",
    label: "Câu chuyện hôm nay",
    description: "Ghi lại một chuyện thật làm chất liệu nội dung.",
  },
  {
    id: "script-feedback",
    label: "Phản hồi kịch bản",
    description: "Cho emsen biết điều gì đúng hoặc chưa đúng chất bạn.",
  },
  {
    id: "direct-update",
    label: "Cập nhật trực tiếp",
    description: "Chủ động thêm điều bạn muốn emsen ghi nhớ.",
  },
];

export function getLearningPrompt(source: CreatorDnaLearningSource, promptCursor: number) {
  if (source === "script-feedback") {
    return "Trong kịch bản gần nhất, phần nào nghe đúng chất bạn nhất hoặc cần sửa nhiều nhất?";
  }

  if (source === "direct-update") {
    return "Có điều gì mới bạn muốn emsen luôn ghi nhớ khi cùng làm nội dung không?";
  }

  return dailyStoryPrompts[promptCursor % dailyStoryPrompts.length] ?? dailyStoryPrompts[0]!;
}
