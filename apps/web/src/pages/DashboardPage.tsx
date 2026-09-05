import { FlowHero } from "../features/dashboard/components/FlowHero";
import { ProductProgress } from "../features/dashboard/components/ProductProgress";
import { WeekSchedule } from "../features/dashboard/components/WeekSchedule";

export function DashboardPage({ compact }: { compact: boolean }) {
  return (
    <div className="space-y-6">
      <FlowHero compact={compact} />
      <ProductProgress />
      <WeekSchedule compact={compact} />
    </div>
  );
}
