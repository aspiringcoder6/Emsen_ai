import {
  Clapperboard,
  Compass,
  Dna,
  FileText,
  FolderKanban,
  LayoutDashboard,
  PenLine,
  Settings,
} from "lucide-react";
import type { NavigationItem } from "../types/app";

export const overviewNavigationItem: NavigationItem = {
  id: "overview",
  label: "Tổng quan",
  description: "Theo dõi toàn bộ hành trình nội dung",
  icon: LayoutDashboard,
};

export const settingsNavigationItem: NavigationItem = {
  id: "settings",
  label: "Cài đặt",
  description: "Tùy chỉnh emsen buddy và trải nghiệm làm việc",
  icon: Settings,
};

export const navigationGroups: Array<{
  label: string;
  items: NavigationItem[];
}> = [
  {
    label: "Không gian sáng tạo",
    items: [
      overviewNavigationItem,
      {
        id: "creator-dna",
        label: "Creator DNA",
        description: "Định hình cá tính và giới hạn thương hiệu",
        icon: Dna,
      },
      {
        id: "direction",
        label: "Định hướng",
        description: "Tone, audience và content pillars",
        icon: Compass,
      },
      {
        id: "content-plan",
        label: "Kế hoạch nội dung",
        description: "Lịch nội dung theo nhịp của bạn",
        icon: FileText,
      },
      {
        id: "scripts",
        label: "Kịch bản",
        description: "Hook, nội dung, CTA và storyboard",
        icon: PenLine,
      },
      {
        id: "video-studio",
        label: "Video Studio",
        description: "Review, Smart Cut và xuất video",
        icon: Clapperboard,
      },
    ],
  },
  {
    label: "Quản lý",
    items: [
      {
        id: "projects",
        label: "Dự án",
        description: "Quản lý công việc theo creator",
        icon: FolderKanban,
      },
    ],
  },
];
