import { useEffect, useState } from "react";
import { Sidebar } from "./components/layout/Sidebar";
import { TopBar } from "./components/layout/TopBar";
import {
  navigationGroups,
  overviewNavigationItem,
  settingsNavigationItem,
} from "./data/navigation";
import {
  getCurrentSession,
  login,
  logout,
  signup,
} from "./features/auth/authApi";
import { ChatAssistant } from "./features/chat/ChatAssistant";
import { chatOpenStorageKey, clearChatStorage } from "./features/chat/chatConfig";
import { AuthPage } from "./pages/AuthPage";
import { CreatorDnaPage } from "./pages/CreatorDnaPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DirectionPage } from "./pages/DirectionPage";
import { ContentPlanPage } from "./pages/ContentPlanPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ScriptsPage } from "./pages/ScriptsPage";
import type { AuthRequest, AuthUser } from "./types/app";

export function App() {
  const [authUser, setAuthUser] = useState<AuthUser | null | undefined>(undefined);
  const [activeItem, setActiveItem] = useState("overview");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(() =>
    typeof window === "undefined"
      ? false
      : window.localStorage.getItem(chatOpenStorageKey) === "true",
  );
  const [aiPreferencesRevision, setAiPreferencesRevision] = useState(0);

  const currentItem =
    activeItem === "settings"
      ? settingsNavigationItem
      : navigationGroups
          .flatMap((group) => group.items)
          .find((item) => item.id === activeItem) ?? overviewNavigationItem;

  useEffect(() => {
    window.localStorage.setItem(chatOpenStorageKey, String(chatOpen));
  }, [chatOpen]);

  useEffect(() => {
    let active = true;
    void getCurrentSession()
      .then((session) => {
        if (active) {
          setAuthUser(session?.user ?? null);
        }
      })
      .catch(() => {
        if (active) {
          setAuthUser(null);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === chatOpenStorageKey) {
        setChatOpen(event.newValue === "true");
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const handleAuthenticate = async (request: AuthRequest) => {
    if (request.source === "signup") {
      const session = await signup({
        acceptedTerms: request.acceptedTerms,
        creatorDnaChoice: request.creatorDna,
        name: request.name,
        password: request.password,
        phoneNumber: request.phoneNumber,
      });
      setActiveItem(request.creatorDna === "start" ? "creator-dna" : "overview");
      setAuthUser(session.user);
    } else {
      const session = await login({
        password: request.password,
        phoneNumber: request.phoneNumber,
        remember: request.remember,
      });
      setActiveItem("overview");
      setAuthUser(session.user);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      setAuthUser(null);
    }
    clearChatStorage();
    setChatOpen(false);
    setActiveItem("overview");
    setAuthUser(null);
  };

  if (authUser === undefined) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#FBFDF7]">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-pulse rounded-2xl bg-[#E3F2DB]" />
          <p className="mt-4 text-sm font-bold text-[#607760]">Đang mở emsen…</p>
        </div>
      </main>
    );
  }

  if (!authUser) {
    return <AuthPage onAuthenticate={handleAuthenticate} />;
  }

  return (
    <div className="min-h-screen bg-[#FBFDF7] text-[#31583A]">
      <Sidebar
        activeItem={activeItem}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onCollapse={() => setCollapsed((current) => !current)}
        onLogout={handleLogout}
        onNavigate={setActiveItem}
        user={authUser}
      />

      <div
        className={`min-h-screen transition-[padding] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          collapsed ? "lg:pl-[92px]" : "lg:pl-[276px]"
        } ${chatOpen ? "lg:pr-[440px]" : "lg:pr-0"}`}
      >
        <TopBar
          compact={chatOpen}
          currentPage={currentItem.label}
          onOpenMobile={() => setMobileOpen(true)}
        />
        <main className="flow-canvas min-h-[calc(100vh-76px)] p-4 sm:p-6 xl:p-8">
          <div className="mx-auto max-w-[1500px]">
            {activeItem === "overview" ? (
              <DashboardPage compact={chatOpen} userName={authUser.name} onNavigate={setActiveItem} />
            ) : activeItem === "creator-dna" ? (
              <CreatorDnaPage onStartCreating={() => setActiveItem("direction")} />
            ) : activeItem === "settings" ? (
              <SettingsPage
                onPreferencesChanged={() =>
                  setAiPreferencesRevision((current) => current + 1)
                }
              />
            ) : activeItem !== "direction" && activeItem !== "content-plan" && activeItem !== "scripts" ? (
              <PlaceholderPage item={currentItem} />
            ) : null}
            <DirectionPage key={authUser.id} active={activeItem === "direction"} compact={chatOpen} onOpenDna={() => setActiveItem("creator-dna")} onContentPlan={() => setActiveItem("content-plan")} />
            <ContentPlanPage key={`plan-${authUser.id}`} active={activeItem === "content-plan"} onDirection={() => setActiveItem("direction")} onSettings={() => setActiveItem("settings")} />
            <ScriptsPage key={`scripts-${authUser.id}`} active={activeItem === "scripts"} onSettings={() => setActiveItem("settings")} />
          </div>
        </main>
      </div>

      <ChatAssistant
        currentPage={currentItem.label}
        onClose={() => setChatOpen(false)}
        onOpen={() => setChatOpen(true)}
        open={chatOpen}
        preferencesRevision={aiPreferencesRevision}
      />
    </div>
  );
}
