import {
  CalendarDays,
  Compass,
  Dna,
  FileText,
  PenLine,
  type LucideIcon,
} from "lucide-react";
import type {
  ContentPlanStateDto,
  CreatorDnaStateDto,
  DirectionStateDto,
  ScriptDocumentDto,
  ScriptWorkspaceDto,
} from "@creator-flow/contracts";

export type DashboardDestination = "creator-dna" | "direction" | "content-plan" | "scripts";
export type ScheduleKind = "plan" | "script";

export type DashboardSnapshot = {
  creatorDna: CreatorDnaStateDto;
  direction: DirectionStateDto;
  plan: ContentPlanStateDto;
  scriptWorkspace: ScriptWorkspaceDto;
};

export type ProductProgressStep = {
  id: DashboardDestination;
  label: string;
  caption: string;
  icon: LucideIcon;
  state: "done" | "active" | "waiting";
};

export type WeekEvent = {
  id: string;
  dayIndex: number;
  time: string;
  kind: ScheduleKind;
  title: string;
  subtitle: string;
  status: string;
  destination: DashboardDestination;
};

export type WeekDay = {
  index: number;
  label: string;
  date: Date;
  isToday: boolean;
};

export const scheduleKindConfig: Record<
  ScheduleKind,
  { label: string; color: string; surface: string; icon: LucideIcon }
> = {
  plan: {
    label: "Kế hoạch nội dung",
    color: "#3F7E49",
    surface: "#EEF8EF",
    icon: CalendarDays,
  },
  script: {
    label: "Kịch bản",
    color: "#A66E94",
    surface: "#F7EDF4",
    icon: PenLine,
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
    return { index, label, date, isToday: date.toDateString() === today.toDateString() };
  });
  return { days, today };
}

export function getProductProgress(snapshot: DashboardSnapshot): ProductProgressStep[] {
  const dnaDone = snapshot.creatorDna.status === "completed" || snapshot.creatorDna.status === "skipped";
  const approvedDirection = snapshot.direction.versions.find((version) => version.status === "approved");
  const approvedPlan = snapshot.plan.versions.find((version) => version.status === "approved");
  const visibleScripts = snapshot.scriptWorkspace.scripts.filter((script) => script.status !== "archived");
  const workingScripts = visibleScripts.filter((script) => script.status !== "completed");
  const completedScripts = visibleScripts.filter((script) => script.status === "completed");

  return [
    {
      id: "creator-dna",
      label: "Creator DNA",
      caption: snapshot.creatorDna.status === "completed" ? "Đã hoàn thiện" : snapshot.creatorDna.status === "skipped" ? "Đã để làm sau" : snapshot.creatorDna.status === "in-progress" ? `Đang làm · ${snapshot.creatorDna.currentStep}/5` : "Chưa hoàn thiện",
      icon: Dna,
      state: dnaDone ? "done" : "active",
    },
    {
      id: "direction",
      label: "Định hướng",
      caption: approvedDirection ? `Đã chốt · phiên bản ${approvedDirection.version}` : snapshot.direction.versions.length ? "Có bản nháp" : "Chưa bắt đầu",
      icon: Compass,
      state: approvedDirection ? "done" : dnaDone ? "active" : "waiting",
    },
    {
      id: "content-plan",
      label: "Kế hoạch tuần",
      caption: approvedPlan ? `Đã chốt ${approvedPlan.items.length} nội dung` : snapshot.plan.versions.length ? "Có bản nháp" : "Chưa lên kế hoạch",
      icon: FileText,
      state: approvedPlan ? "done" : approvedDirection ? "active" : "waiting",
    },
    {
      id: "scripts",
      label: "Kịch bản",
      caption: workingScripts.length ? `${workingScripts.length} bản đang làm` : completedScripts.length ? `${completedScripts.length} bản đã thực hiện` : "Sẵn sàng để viết",
      icon: PenLine,
      state: workingScripts.length ? "active" : completedScripts.length ? "done" : approvedPlan ? "active" : "waiting",
    },
  ];
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function scriptStatus(script: ScriptDocumentDto) {
  return script.status === "draft" ? "Bản nháp" : script.status === "in-progress" ? "Đang thực hiện" : script.status === "ready" ? "Sẵn sàng quay" : script.status === "completed" ? "Đã thực hiện" : "Đã lưu trữ";
}

export function getWeekEvents(snapshot: DashboardSnapshot, days: WeekDay[]): WeekEvent[] {
  const indexByDate = new Map(days.map((day) => [dateKey(day.date), day.index]));
  const approvedPlan = snapshot.plan.versions.find((version) => version.status === "approved");
  const planEvents: WeekEvent[] = approvedPlan ? approvedPlan.items.map((item) => ({
    id: `plan-${approvedPlan.id}-${item.id}`,
    dayIndex: item.dayIndex,
    time: "Cả ngày",
    kind: "plan",
    title: item.title,
    subtitle: `${item.platform} · ${item.format} · ${item.objective}`,
    status: "Đã lên kế hoạch",
    destination: "content-plan",
  })) : [];
  const scriptEvents: WeekEvent[] = snapshot.scriptWorkspace.scripts.flatMap((script) => {
    const dayIndex = script.settings.scheduledFor ? indexByDate.get(script.settings.scheduledFor) : undefined;
    if (dayIndex === undefined || script.status === "archived") return [];
    return [{
      id: `script-${script.id}`,
      dayIndex,
      time: "Kịch bản",
      kind: "script" as const,
      title: script.title,
      subtitle: `${script.settings.platform || "Chưa chọn nền tảng"} · ${script.content.storyboard.length} keyframe`,
      status: scriptStatus(script),
      destination: "scripts" as const,
    }];
  });
  return [...planEvents, ...scriptEvents].sort((a, b) => a.dayIndex - b.dayIndex || a.kind.localeCompare(b.kind));
}
