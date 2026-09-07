import { useEffect, useState } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { FlowHero } from "../features/dashboard/components/FlowHero";
import { ProductProgress } from "../features/dashboard/components/ProductProgress";
import { WeekSchedule } from "../features/dashboard/components/WeekSchedule";
import { getDashboardSnapshot } from "../features/dashboard/dashboardApi";
import { getProductProgress, type DashboardDestination, type DashboardSnapshot } from "../features/dashboard/dashboardData";

export function DashboardPage({ compact, userName, onNavigate }: { compact: boolean; userName: string; onNavigate: (destination: DashboardDestination) => void }) {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try { setSnapshot(await getDashboardSnapshot()); }
    catch (error) { setError(error instanceof Error ? error.message : "Chưa thể tải dữ liệu Tổng quan."); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  if (loading && !snapshot) return <section className="grid min-h-[480px] place-items-center rounded-[30px] border border-[#DDEBD6] bg-white"><div className="text-center"><LoaderCircle size={28} className="mx-auto animate-spin text-[#4E8052]" /><p className="mt-3 text-sm font-bold text-[#607760]">Emsen đang nối lại hành trình của bạn…</p></div></section>;
  if (!snapshot) return <section className="grid min-h-[360px] place-items-center rounded-[30px] border border-[#F0D7D2] bg-[#FFF8F5] p-8 text-center"><div><p className="font-bold text-[#8F514A]">{error || "Chưa thể mở Tổng quan."}</p><button type="button" onClick={() => void load()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#4E8052] px-4 py-2.5 text-sm font-bold text-white"><RefreshCw size={15} /> Thử lại</button></div></section>;

  const steps = getProductProgress(snapshot);
  const nextStep = steps.find((step) => step.state === "active") ?? steps.at(-1)!;
  const hasScripts = snapshot.scriptWorkspace.scripts.some((script) => script.status !== "archived");
  return <div className="space-y-6">
    <FlowHero compact={compact} userName={userName} nextStep={nextStep} hasScripts={hasScripts} onNavigate={onNavigate} />
    {error && <p role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#F1C9C2] bg-[#FFF0EC] p-4 text-sm text-[#9A4B42]"><span>{error}</span><button type="button" onClick={() => void load()} className="inline-flex items-center gap-1.5 font-bold"><RefreshCw size={14} /> Tải lại</button></p>}
    <ProductProgress steps={steps} onNavigate={onNavigate} />
    <WeekSchedule compact={compact} snapshot={snapshot} onNavigate={onNavigate} />
  </div>;
}
