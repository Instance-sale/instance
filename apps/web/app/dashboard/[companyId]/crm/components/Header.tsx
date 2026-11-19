"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { User, LogOut } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";

interface HeaderProps {
    initials: string;
    userName: string;
    userEmail: string;
    basePath: string;
}

export default function Header({ initials, userName, userEmail, basePath }: HeaderProps) {
    const [profileOpen, setProfileOpen] = useState(false);
    const router = useRouter();

    return (
        <>
            <header className="px-4 sm:px-6 lg:px-8 py-4 bg-transparent flex items-center justify-between w-full transition-all">
                <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-display">
                            Lead CRM
                        </h1>
                        <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Live Sync
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 hidden sm:block mt-0.5">
                        Audience management, contact enrichment, and pipeline conversion
                    </p>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                    {/* Activity / Notification button */}
                    <NotificationBell basePath={basePath} />

                    <div className="h-5 w-px bg-slate-200" />

                    {/* Profile avatar button */}
                    <button
                        type="button"
                        onClick={() => setProfileOpen(true)}
                        className="flex cursor-pointer items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-slate-100/70 border border-transparent hover:border-slate-200/60 transition-all"
                    >
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-xs">
                            {initials}
                        </div>
                        <span className="text-xs font-semibold text-slate-800 hidden md:inline truncate max-w-[100px]">
                            {userName}
                        </span>
                    </button>
                </div>
            </header>

            {/* Profile Modal */}
            <AnimatePresence>
                {profileOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setProfileOpen(false)}
                            className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-xs"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            className="fixed top-20 right-8 z-50 w-72 bg-white rounded-2xl shadow-xl ring-1 ring-black/5 overflow-hidden"
                        >
                            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-white p-1 ring-1 ring-slate-200">
                                        <div className="w-full h-full rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg font-bold">
                                            {initials}
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-900">{userName}</h3>
                                        <p className="text-xs text-slate-500">{userEmail}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-2 space-y-1">
                                <button
                                    type="button"
                                    onClick={() => router.push(`${basePath}/settings`)}
                                    className="w-full flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
                                >
                                    <User size={18} />
                                    Profile Settings
                                </button>
                                <div className="h-px bg-slate-100 my-1 mx-2"></div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        signOut({ callbackUrl: "/login?loginState=signedOut" });
                                    }}
                                    className="w-full flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 rounded-xl hover:bg-red-50 transition-colors"
                                >
                                    <LogOut size={18} />
                                    Sign Out
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
