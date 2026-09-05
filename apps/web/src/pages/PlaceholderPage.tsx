import type { NavigationItem } from "../types/app";

export function PlaceholderPage({ item }: { item: NavigationItem }) {
  const Icon = item.icon;
  return (
    <section className="grid min-h-[calc(100vh-140px)] place-items-center rounded-[28px] border border-[#DDEBD6] bg-white/75 p-8 text-center shadow-[0_14px_40px_rgba(40,77,49,0.05)] backdrop-blur-sm">
      <div className="max-w-md">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-[22px] bg-gradient-to-br from-[#46A82D] to-[#82C95B] text-white shadow-[0_14px_30px_rgba(70,168,45,0.22)]">
          <Icon size={27} />
        </div>
        <h2 className="mt-6 text-2xl font-bold tracking-[-0.03em] text-[#284D31]">
          {item.label}
        </h2>
        <p className="mt-3 text-sm leading-6 text-[#748A74]">{item.description}</p>
        <div className="mx-auto mt-7 h-1.5 w-32 overflow-hidden rounded-full bg-[#F5E3E0]">
          <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-[#67B86F] to-[#82C95B]" />
        </div>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#94A794]">
          Sẽ được hoàn thiện theo timeline MVP
        </p>
      </div>
    </section>
  );
}
