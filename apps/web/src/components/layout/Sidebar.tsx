import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  MoreHorizontal,
  Settings,
  X,
} from "lucide-react";
import { useState } from "react";
import { navigationGroups } from "../../data/navigation";
import type { AuthUser } from "../../types/app";
import { EmsenMark } from "../branding/EmsenMark";

type SidebarProps = {
  activeItem: string;
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onCollapse: () => void;
  onLogout: () => void;
  onNavigate: (id: string) => void;
  user: AuthUser;
};

export function Sidebar({
  activeItem,
  collapsed,
  mobileOpen,
  onCloseMobile,
  onCollapse,
  onLogout,
  onNavigate,
  user,
}: SidebarProps) {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const initials =
    user.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toLocaleUpperCase("vi-VN") ?? "")
      .join("") || "CF";

  return (
    <>
      {mobileOpen ? (
        <button
          aria-label="Đóng menu"
          className="fixed inset-0 z-40 bg-[#284D31]/30 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
          type="button"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[#DDEBD6] bg-white/95 shadow-[20px_0_60px_rgba(70,168,45,0.07)] backdrop-blur-xl transition-all duration-300 lg:translate-x-0 ${
          collapsed ? "lg:w-[92px]" : "lg:w-[276px]"
        } ${mobileOpen ? "w-[276px] translate-x-0" : "w-[276px] -translate-x-full"}`}
      >
        <div
          className={`flex h-[88px] shrink-0 items-center border-b border-[#E4EFE0] ${
            collapsed ? "px-4 lg:justify-center lg:px-3" : "px-4"
          }`}
        >
          {collapsed ? (
            <span className="hidden lg:inline-flex">
              <EmsenMark size={58} />
            </span>
          ) : null}
          <div
            className={`flex min-w-0 flex-1 items-center transition-all duration-200 ${
              collapsed ? "lg:hidden" : ""
            }`}
          >
            <EmsenMark full size={58} />
          </div>
          <button
            aria-label="Đóng sidebar"
            className="ml-auto grid h-9 w-9 place-items-center rounded-xl text-[#607760] transition hover:bg-[#EAF6E4] lg:hidden"
            onClick={onCloseMobile}
            type="button"
          >
            <X size={19} />
          </button>
        </div>

        <nav className="flow-scrollbar flex-1 overflow-y-auto px-3 py-6">
          {navigationGroups.map((group, groupIndex) => (
            <div className={groupIndex > 0 ? "mt-8" : ""} key={group.label}>
              <p
                className={`mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#94A794] ${
                  collapsed ? "lg:text-center" : ""
                }`}
              >
                {collapsed ? (
                  <>
                    <span className="lg:hidden">{group.label}</span>
                    <span className="hidden lg:inline">•••</span>
                  </>
                ) : (
                  group.label
                )}
              </p>
              <div className="space-y-1.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = activeItem === item.id;

                  return (
                    <button
                      aria-current={active ? "page" : undefined}
                      aria-label={item.label}
                      className={`group relative flex h-12 w-full items-center rounded-2xl transition-all duration-200 ${
                        collapsed
                          ? "gap-3 px-3.5 lg:justify-center lg:gap-0 lg:px-0"
                          : "gap-3 px-3.5"
                      } ${
                        active
                          ? "bg-gradient-to-r from-[#46A82D] to-[#82C95B] text-white shadow-[0_9px_24px_rgba(70,168,45,0.22)]"
                          : "text-[#526952] hover:bg-[#EFF8E9] hover:text-[#46A82D]"
                      }`}
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.id);
                        onCloseMobile();
                      }}
                      title={collapsed ? item.label : undefined}
                      type="button"
                    >
                      <Icon className="shrink-0" size={20} strokeWidth={2} />
                      <span
                        className={`truncate text-sm font-semibold ${
                          collapsed ? "lg:hidden" : ""
                        }`}
                      >
                        {item.label}
                      </span>
                      {active ? (
                        <span
                          className={`ml-auto h-1.5 w-1.5 rounded-full bg-white/85 ${
                            collapsed ? "lg:hidden" : ""
                          }`}
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-[#E4EFE0] p-3">
          <button
            className={`flex h-11 w-full items-center rounded-2xl transition ${
              activeItem === "settings"
                ? "bg-gradient-to-r from-[#46A82D] to-[#82C95B] text-white shadow-[0_9px_24px_rgba(70,168,45,0.2)]"
                : "text-[#607760] hover:bg-[#EFF8E9] hover:text-[#46A82D]"
            } ${
              collapsed
                ? "gap-3 px-3.5 lg:justify-center lg:gap-0 lg:px-0"
                : "gap-3 px-3.5"
            }`}
            title={collapsed ? "Cài đặt" : undefined}
            aria-current={activeItem === "settings" ? "page" : undefined}
            onClick={() => {
              onNavigate("settings");
              onCloseMobile();
            }}
            type="button"
          >
            <Settings size={19} />
            <span className={`text-sm font-semibold ${collapsed ? "lg:hidden" : ""}`}>
              Cài đặt
            </span>
          </button>
          <div className="relative mt-2">
            {profileMenuOpen ? (
              <div className="absolute bottom-[calc(100%+10px)] left-0 z-20 w-[238px] rounded-2xl border border-[#D8E8D2] bg-white p-2 shadow-[0_18px_48px_rgba(40,77,49,0.16)]">
                <div className="border-b border-[#E6F0E1] px-3 py-2.5">
                  <p className="truncate text-sm font-bold text-[#31583A]">{user.name}</p>
                  <p className="mt-1 truncate text-[11px] text-[#829782]">{user.email}</p>
                </div>
                <button
                  className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#C64343] transition hover:bg-[#FFF2F2]"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    onLogout();
                  }}
                  type="button"
                >
                  <LogOut size={17} />
                  Đăng xuất
                </button>
              </div>
            ) : null}

            <button
              aria-expanded={profileMenuOpen}
              aria-label="Mở menu tài khoản"
              className={`flex w-full items-center rounded-2xl bg-[#F1F8EC] p-2 text-left transition hover:bg-[#EAF6E4] ${
                collapsed ? "gap-3 lg:justify-center lg:gap-0" : "gap-3"
              }`}
              onClick={() => setProfileMenuOpen((current) => !current)}
              title={collapsed ? user.name : undefined}
              type="button"
            >
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#284D31] text-xs font-bold text-white">
                {initials}
              </div>
              <div className={`min-w-0 flex-1 ${collapsed ? "lg:hidden" : ""}`}>
                <p className="truncate text-sm font-bold text-[#31583A]">{user.name}</p>
                <p className="truncate text-xs text-[#829782]">emsen workspace</p>
              </div>
              <MoreHorizontal
                className={`ml-auto shrink-0 text-[#829782] ${collapsed ? "lg:hidden" : ""}`}
                size={18}
              />
            </button>
          </div>
        </div>

        <button
          aria-label={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
          className="absolute -right-3.5 top-[104px] hidden h-8 w-8 place-items-center rounded-full border border-[#D7E7D1] bg-white text-[#526952] shadow-[0_8px_24px_rgba(40,77,49,0.12)] transition hover:border-[#82C95B] hover:text-[#46A82D] lg:grid"
          onClick={onCollapse}
          type="button"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </aside>
    </>
  );
}
