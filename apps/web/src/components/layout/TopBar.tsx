import { Bell, ChevronRight, CircleHelp, Menu, Plus, Search } from "lucide-react";

type TopBarProps = {
  compact: boolean;
  currentPage: string;
  onOpenMobile: () => void;
};

export function TopBar({ compact, currentPage, onOpenMobile }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-[76px] items-center border-b border-[#DDEBD6] bg-white/80 px-4 backdrop-blur-xl sm:px-6 xl:px-8">
      <button
        aria-label="Mở menu"
        className="mr-3 grid h-10 w-10 place-items-center rounded-xl text-[#526952] hover:bg-[#EFF8E9] lg:hidden"
        onClick={onOpenMobile}
        type="button"
      >
        <Menu size={21} />
      </button>

      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs font-medium text-[#829782]">
          <span>Workspace</span>
          <ChevronRight size={13} />
          <span className="truncate text-[#46A82D]">{currentPage}</span>
        </div>
        <h1 className="mt-1 truncate text-lg font-bold tracking-[-0.02em] text-[#284D31]">
          {currentPage}
        </h1>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <label className={`relative ${compact ? "hidden" : "hidden lg:block"}`}>
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#829782]"
            size={17}
          />
          <input
            aria-label="Tìm kiếm"
            className="h-10 w-56 rounded-xl border border-[#D7E7D1] bg-[#FBFDF8] pl-10 pr-4 text-sm text-[#31583A] outline-none transition placeholder:text-[#91A38F] focus:w-64 focus:border-[#82C95B] focus:bg-white focus:ring-4 focus:ring-[#82C95B]/10"
            placeholder="Tìm kiếm..."
          />
        </label>
        <button
          aria-label="Trợ giúp"
          className={`h-10 w-10 place-items-center rounded-xl border border-[#D7E7D1] text-[#607760] transition hover:border-[#82C95B] hover:text-[#46A82D] ${
            compact ? "hidden" : "hidden sm:grid"
          }`}
          type="button"
        >
          <CircleHelp size={19} />
        </button>
        <button
          aria-label="Thông báo"
          className="relative grid h-10 w-10 place-items-center rounded-xl border border-[#D7E7D1] text-[#607760] transition hover:border-[#82C95B] hover:text-[#46A82D]"
          type="button"
        >
          <Bell size={19} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-[#67B86F]" />
        </button>
        <button
          className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#46A82D] to-[#82C95B] px-3.5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(70,168,45,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgba(70,168,45,0.28)] sm:px-4"
          type="button"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Dự án mới</span>
        </button>
      </div>
    </header>
  );
}
