import { Check, ChevronDown } from "lucide-react";
import { productProgressSteps } from "../dashboardData";

export function ProductProgress() {
  return (
    <section className="rounded-[24px] border border-[#DDEBD6] bg-white p-5 shadow-[0_14px_40px_rgba(40,77,49,0.05)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#46A82D]">
            Tiến độ sản phẩm hiện tại
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold tracking-[-0.02em] text-[#284D31]">
              Summer Skincare Routine
            </h2>
            <span className="rounded-full bg-[#E3F2DB] px-2.5 py-1 text-[11px] font-bold text-[#46A82D]">
              Linh Beauty
            </span>
          </div>
          <p className="mt-2 text-sm text-[#829782]">
            Mục tiêu hoàn tất: Thứ Sáu, 28/08
          </p>
        </div>
        <button
          className="flex h-10 items-center gap-2 rounded-xl border border-[#D7E7D1] bg-[#FFFDF8] px-3.5 text-xs font-bold text-[#526952] transition hover:border-[#82C95B] hover:text-[#46A82D]"
          type="button"
        >
          Đổi sản phẩm
          <ChevronDown size={15} />
        </button>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#F3E3DF]">
          <div className="h-full w-[54%] rounded-full bg-gradient-to-r from-[#67B86F] via-[#82C95B] to-[#46A82D]" />
        </div>
        <span className="text-sm font-bold text-[#46A82D]">54%</span>
      </div>

      <div className="flow-scrollbar mt-7 overflow-x-auto pb-2">
        <div className="flex min-w-[680px] items-start">
          {productProgressSteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div className="flex flex-1 items-start" key={step.label}>
                <div className="relative z-10 flex w-[118px] shrink-0 flex-col items-center text-center">
                  <div
                    className={`grid h-12 w-12 place-items-center rounded-2xl border-2 transition ${
                      step.state === "done"
                        ? "border-[#67B86F] bg-[#EEF8EF] text-[#3F7E49]"
                        : step.state === "active"
                          ? "border-[#82C95B] bg-gradient-to-br from-[#46A82D] to-[#82C95B] text-white shadow-[0_9px_22px_rgba(70,168,45,0.24)]"
                          : "border-[#EEDDD9] bg-[#FFFAF8] text-[#94A794]"
                    }`}
                  >
                    {step.state === "done" ? <Check size={20} /> : <Icon size={20} />}
                  </div>
                  <p className="mt-3 text-sm font-bold text-[#31583A]">{step.label}</p>
                  <p
                    className={`mt-1 text-[11px] font-semibold ${
                      step.state === "active" ? "text-[#46A82D]" : "text-[#94A794]"
                    }`}
                  >
                    {step.caption}
                  </p>
                </div>
                {index < productProgressSteps.length - 1 ? (
                  <div className="mt-6 h-[2px] flex-1 bg-[#F1DFDB]">
                    <div
                      className={`h-full rounded-full ${
                        step.state === "done"
                          ? "w-full bg-gradient-to-r from-[#67B86F] to-[#82C95B]"
                          : "w-0"
                      }`}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
