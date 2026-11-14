"use client";

import Image from "next/image";
import { ReactNode, useState, useEffect } from "react";
import { useRouter, usePathname, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  BarChart3,
  Settings,
  Calendar,
  Zap,
  ChevronLeft,
  ChevronRight,
  Mail,
  Menu,
  X,
  Users2
} from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { FailedJobsBanner } from "@/components/notifications/FailedJobsBanner";

const tabs = [
  {
    id: "crm",
    label: "CRM",
    icon: Users,
    description: "Centralize contacts, deals, and daily activities.",
  },
  {
    id: "audience-lists",
    label: "Audience Lists",
    icon: Users2,
    description: "Segment contacts, route campaign leads, and export audiences.",
  },
  {
    id: "automation",
    label: "Automation",
    icon: Zap,
    description: "Design automations that keep pipelines warm.",
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
    description: "Growth metrics, campaign health, and experiments.",
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    description: "Controls for billing, integrations, and team roles.",
  },
];

interface DashboardShellProps {
  companyName: string;
  userName: string;
  userEmail: string;
  userRole?: string;
  initials: string;
  activeTabId: string;
  basePath: string;
  children?: ReactNode;
}

export default function DashboardShell({
  companyName,
  userName,
  userEmail,
  userRole,
  initials,
  activeTabId,
  basePath,
  children,
}: DashboardShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const tNav = useTranslations("navigation");

  const tabKeyMap: Record<string, string> = {
    crm: "crm",
    "audience-lists": "audienceLists",
    automation: "automation",
    analytics: "analytics",
    settings: "settings",
  };

  const getTabInfo = (id: string, fallbackLabel: string, fallbackDesc: string) => {
    const key = tabKeyMap[id];
    if (!key) return { label: fallbackLabel, desc: fallbackDesc };
    try {
      return {
        label: tNav(key),
        desc: tNav(`descriptions.${key}`),
      };
    } catch {
      return { label: fallbackLabel, desc: fallbackDesc };
    }
  };

  const activeTab = (activeTabId === "email" ? "audience-lists" : activeTabId) || "crm";
  const currentTab = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];
  const currentTabInfo = getTabInfo(currentTab.id, currentTab.label, currentTab.description);
  const params = useParams();
  const activeCompanyPublicId = (params?.companyId as string) || pathname?.split("/")[4] || "";

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const navigateToTab = (tabId: string) => {
    if (isMobile) {
      setMobileMenuOpen(false);
    }
    switch (tabId) {
      case "crm":
        router.push(`${basePath}/crm`);
        break;
      case "email":
      case "audience-lists":
        router.push(`${basePath}/audience-lists`);
        break;
      case "automation":
        router.push(`${basePath}/automation`);
        break;
      case "analytics":
        router.push(`${basePath}/analytics`);
        break;
      case "settings":
        router.push(`${basePath}/settings`);
        break;
      default:
        router.push(basePath);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f8f7f4] text-slate-900 font-sans selection:bg-amber-200 selection:text-slate-900 relative">
      <div className="mesh-bg" aria-hidden="true">
        <i className="mesh-a" />
        <i className="mesh-b" />
        <i className="mesh-c" />
      </div>

      {/* Mobile Menu Button & Mobile Notification Bell */}
      <div className="fixed top-4 left-4 z-50 lg:hidden">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2.5 rounded-xl bg-white/90 backdrop-blur-md border border-white/80 shadow-sm text-slate-700 hover:text-slate-900 transition-colors"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <div className="fixed top-4 right-4 z-50 lg:hidden">
        <NotificationBell basePath={basePath} />
      </div>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{
          width: isMobile ? (mobileMenuOpen ? 270 : 0) : (sidebarCollapsed ? 76 : 248),
          x: isMobile ? (mobileMenuOpen ? 0 : -270) : 0,
        }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className={cn(
          "fixed inset-y-0 left-0 z-40 bg-white/85 backdrop-blur-xl border-r border-slate-200/70 shadow-[2px_0_24px_rgba(20,20,30,0.03)] flex flex-col justify-between",
          isMobile && "overflow-hidden"
        )}
      >
        {/* Top Brand Section */}
        <div>
          <div className="flex items-center justify-between p-4 lg:p-5 pb-3">
            <AnimatePresence mode="wait">
              {(!sidebarCollapsed || isMobile) && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  className="flex items-center gap-2.5"
                >
                  <div className="relative flex items-center justify-center w-8 h-8 rounded-xl overflow-hidden shadow-md shadow-blue-500/20 shrink-0 border border-slate-100">
                    <Image
                      src="/instance-square.webp"
                      alt="Instance"
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                      priority
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-slate-900 tracking-tight leading-tight text-sm font-display">
                      Instance
                    </span>
                    <span className="text-[10.5px] uppercase font-semibold text-blue-600 tracking-wider truncate max-w-[130px]">
                      {companyName}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-1">
              {!isMobile && (
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className={cn(
                    "p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100/70 transition-colors cursor-pointer",
                    sidebarCollapsed ? "mx-auto" : ""
                  )}
                  aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  {sidebarCollapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
                </button>
              )}
            </div>
          </div>
          {(!sidebarCollapsed || isMobile) && (
            <div className="px-4 pb-2">
              <button
                type="button"
                onClick={() => {
                  const searchInput = document.querySelector<HTMLInputElement>("input[type='text'], input[type='search']");
                  searchInput?.focus();
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-100/70 hover:bg-slate-100 text-slate-400 text-xs transition-colors border border-slate-200/50 focus:ring-2 focus:ring-blue-500/20"
              >
                <span className="flex items-center gap-2 text-slate-500">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  {tNav("search")}
                </span>
                <kbd className="px-1.5 py-0.5 rounded text-[10px] bg-white border border-slate-200 text-slate-600 font-mono shadow-xs">
                  ⌘K
                </kbd>
              </button>
            </div>
          )}

          {/* Navigation Items */}
          <div className="px-3 py-2 space-y-1 overflow-y-auto custom-scrollbar">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              const info = getTabInfo(tab.id, tab.label, tab.description);

              return (
                <button
                  key={tab.id}
                  onClick={() => navigateToTab(tab.id)}
                  className={cn(
                    "relative flex items-center w-full px-3 py-2 rounded-xl transition-all duration-200 group cursor-pointer text-left",
                    isActive
                      ? "text-blue-700 font-semibold shadow-xs"
                      : "text-slate-600 hover:bg-white/60 hover:text-slate-900 font-medium"
                  )}
                  title={sidebarCollapsed && !isMobile ? info.label : undefined}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute inset-0 bg-white border border-blue-200/80 rounded-xl shadow-xs"
                      initial={false}
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}

                  <span className={cn(
                    "relative z-10 flex items-center justify-center w-5 h-5 shrink-0 transition-colors",
                    isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-700"
                  )}>
                    <Icon size={18} strokeWidth={isActive ? 2.4 : 1.9} />
                  </span>

                  <AnimatePresence>
                    {(!sidebarCollapsed || isMobile) && (
                      <motion.div
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        className="relative z-10 ml-3 flex items-center justify-between flex-1 overflow-hidden"
                      >
                        <span className="text-sm whitespace-nowrap">
                          {info.label}
                        </span>
                        {tab.id === "crm" && (
                          <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            {tNav("live")}
                          </span>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-3 border-t border-slate-100 relative">
          <div
            className={cn(
              "flex items-center gap-2.5 p-2 rounded-xl bg-white/70 border border-slate-200/70 transition-all shadow-xs",
              sidebarCollapsed && !isMobile ? "justify-center px-0" : ""
            )}
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
              {initials}
            </div>
            {(!sidebarCollapsed || isMobile) && (
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-semibold text-slate-900 truncate leading-tight">{userName}</span>
                <span className="text-[10.5px] text-blue-600 font-medium truncate">
                  {companyName}
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <motion.div
        className="flex-1 flex flex-col min-h-screen max-h-screen h-screen min-w-0 w-full overflow-hidden"
        animate={{
          marginLeft: isMobile ? 0 : (sidebarCollapsed ? 76 : 248),
          paddingTop: isMobile ? "3.5rem" : 0
        }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
      >
        <main className="flex-1 flex flex-col min-h-0 relative w-full h-full overflow-y-auto overflow-x-hidden">
          <FailedJobsBanner basePath={basePath} />
          {children ? children : (
            <div className="flex-1 flex flex-col items-center justify-center p-4 lg:p-6">
              <div className="mt-10 lg:mt-20 text-center">
                <div className="w-12 h-12 lg:w-16 lg:h-16 bg-white/80 border border-slate-200/80 text-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 lg:mb-6 shadow-sm">
                  {currentTab.icon ? <currentTab.icon size={isMobile ? 24 : 30} /> : <LayoutDashboard size={isMobile ? 24 : 30} />}
                </div>
                <h2 className="text-lg lg:text-xl font-bold text-slate-900 mb-2">{currentTabInfo.label}</h2>
                <p className="text-sm lg:text-base text-slate-500 max-w-md mx-auto px-4">{currentTabInfo.desc}</p>
              </div>
            </div>
          )}
        </main>
      </motion.div>
    </div>
  );
}
