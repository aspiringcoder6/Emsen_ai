import assert from "node:assert/strict";
import test from "node:test";
import { parseCreatorDnaProfile } from "../src/modules/creator-dna/creatorDna.routes.js";

test("accepts multiple selections throughout Creator DNA", () => {
  const niche = [
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
  ].join(" · ");
  assert.ok(niche.length > 120);

  const profile = parseCreatorDnaProfile({
    audience: "Gen Z · Người mới đi làm · Nhân sự văn phòng · Chủ shop / Seller",
    boundaries: "",
    displayName: "An",
    niche,
    platforms: ["TikTok", "Instagram Reels", "YouTube Shorts"],
    toneTraits: [
      "Gần gũi, đời thường",
      "Hài hước, dí dỏm",
      "Chuyên nghiệp, đáng tin",
      "Nhẹ nhàng, tinh tế",
    ],
  });

  assert.equal(profile.niche, niche);
  assert.equal(profile.platforms.length, 3);
  assert.equal(profile.toneTraits.length, 4);
  assert.match(profile.audience, /Gen Z/u);
});

test("still rejects excessive list payloads", () => {
  assert.throws(() => parseCreatorDnaProfile({
    audience: "Đại chúng",
    boundaries: "",
    displayName: "An",
    niche: "Lifestyle",
    platforms: Array.from({ length: 11 }, (_, index) => `Kênh ${index}`),
    toneTraits: [],
  }));
});
