import {
  Clapperboard,
  Compass,
  FileText,
  ListTodo,
  PenLine,
  Send,
  Video,
  type LucideIcon,
} from "lucide-react";

export type ScheduleKind = "plan" | "publish" | "production";

export type WeekEvent = {
  dayIndex: number;
  time: string;
  kind: ScheduleKind;
  project: string;
  creator: string;
  title: string;
  status: string;
};

export type WeekDay = {
  index: number;
  label: string;
  date: Date;
  isToday: boolean;
};

export const productProgressSteps: Array<{
  label: string;
  caption: string;
  icon: LucideIcon;
  state: "done" | "active" | "waiting";
}> = [
  { label: "Định hướng", caption: "Hoàn tất", icon: Compass, state: "done" },
  { label: "Kế hoạch", caption: "Hoàn tất", icon: FileText, state: "done" },
  {
    label: "Kịch bản",
    caption: "Đang thực hiện",
    icon: PenLine,
    state: "active",
  },
  {
    label: "Storyboard",
    caption: "Chờ xử lý",
    icon: Clapperboard,
    state: "waiting",
  },
  { label: "Video", caption: "Chờ xử lý", icon: Video, state: "waiting" },
];

export const weeklyProjects = [
  {
    name: "Summer Skincare Routine",
    creator: "Linh Beauty",
    stage: "Đang viết kịch bản",
    progress: 64,
    color: "#46A82D",
    tasks: "4/6 đầu việc",
    schedule: "2 lịch đăng · 1 buổi lên plan",
  },
  {
    name: "Một ngày làm Founder",
    creator: "Minh Lifestyle",
    stage: "Chờ duyệt storyboard",
    progress: 82,
    color: "#67B86F",
    tasks: "5/6 đầu việc",
    schedule: "1 lịch đăng · 1 buổi quay",
  },
  {
    name: "Review máy pha cà phê Mini",
    creator: "Home with Vy",
    stage: "Đang dựng video",
    progress: 91,
    color: "#82C95B",
    tasks: "6/7 đầu việc",
    schedule: "2 lịch đăng · 1 bản review",
  },
];

export const weeklyEvents: WeekEvent[] = [
  {
    dayIndex: 0,
    time: "09:00",
    kind: "plan",
    project: "Summer Skincare Routine",
    creator: "Linh Beauty",
    title: "Chốt content pillars và lịch 7 ngày",
    status: "Đã hoàn tất",
  },
  {
    dayIndex: 1,
    time: "14:30",
    kind: "production",
    project: "Một ngày làm Founder",
    creator: "Minh Lifestyle",
    title: "Duyệt kịch bản và shot list",
    status: "Đã duyệt",
  },
  {
    dayIndex: 2,
    time: "09:30",
    kind: "plan",
    project: "Review máy pha cà phê Mini",
    creator: "Home with Vy",
    title: "Lên plan nội dung và CTA",
    status: "Đang diễn ra",
  },
  {
    dayIndex: 2,
    time: "15:00",
    kind: "publish",
    project: "Summer Skincare Routine",
    creator: "Linh Beauty",
    title: "Đăng Reel: Morning skincare 5 phút",
    status: "Đã lên lịch",
  },
  {
    dayIndex: 2,
    time: "16:30",
    kind: "production",
    project: "Một ngày làm Founder",
    creator: "Minh Lifestyle",
    title: "Review storyboard vòng 1",
    status: "Chờ duyệt",
  },
  {
    dayIndex: 3,
    time: "11:00",
    kind: "publish",
    project: "Một ngày làm Founder",
    creator: "Minh Lifestyle",
    title: "Đăng TikTok: Behind the scenes",
    status: "Đã lên lịch",
  },
  {
    dayIndex: 4,
    time: "10:00",
    kind: "production",
    project: "Summer Skincare Routine",
    creator: "Linh Beauty",
    title: "Quay video theo storyboard đã duyệt",
    status: "Sắp diễn ra",
  },
  {
    dayIndex: 4,
    time: "19:30",
    kind: "publish",
    project: "Review máy pha cà phê Mini",
    creator: "Home with Vy",
    title: "Đăng Reel: Pha cà phê tại nhà",
    status: "Đã lên lịch",
  },
  {
    dayIndex: 5,
    time: "09:00",
    kind: "production",
    project: "Review máy pha cà phê Mini",
    creator: "Home with Vy",
    title: "Duyệt bản dựng cuối",
    status: "Sắp diễn ra",
  },
  {
    dayIndex: 6,
    time: "20:00",
    kind: "publish",
    project: "Summer Skincare Routine",
    creator: "Linh Beauty",
    title: "Đăng TikTok: Night routine",
    status: "Đã lên lịch",
  },
];

export const scheduleKindConfig: Record<
  ScheduleKind,
  { label: string; color: string; surface: string; icon: LucideIcon }
> = {
  plan: {
    label: "Lên kế hoạch",
    color: "#46A82D",
    surface: "#FFE9E6",
    icon: ListTodo,
  },
  publish: {
    label: "Lịch đăng bài",
    color: "#3F7E49",
    surface: "#EEF8EF",
    icon: Send,
  },
  production: {
    label: "Sản xuất",
    color: "#A66E94",
    surface: "#F7EDF4",
    icon: Clapperboard,
  },
};

export function getCurrentWeek() {
  const today = new Date();
  const monday = new Date(today);
  const weekday = today.getDay();
  monday.setDate(today.getDate() + (weekday === 0 ? -6 : 1 - weekday));
  monday.setHours(0, 0, 0, 0);

  const labels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  const days: WeekDay[] = labels.map((label, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return {
      index,
      label,
      date,
      isToday: date.toDateString() === today.toDateString(),
    };
  });

  return { days, today };
}
