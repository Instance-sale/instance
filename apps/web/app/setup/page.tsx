"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import InstagramConnect from "./components/InstagramConnect";
import { buildCompanyDashboardPath } from "@/lib/company";
import { logger } from "@/lib/logger";
import { Building2, User, Sparkles, ArrowRight, ShieldCheck, AlertTriangle } from "lucide-react";

export default function SetupPage() {
  const sessionResult = useSession();
  const session = sessionResult?.data;
  const status = sessionResult?.status ?? "unauthenticated";
  const router = useRouter();
  const searchParams = useSearchParams();

  const isCreateNewAccountMode = searchParams.get("new") === "1";
  const [hasCreatedNewAccount, setHasCreatedNewAccount] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [error, setError] = useState<string | null>(null);

  // If already set up, redirect to dashboard
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status !== "authenticated" || !session?.user) return;
    if (isCreateNewAccountMode) return;

    fetch("/api/company")
      .then((res) => (res.ok ? res.json() : null))
      .then((company) => {
        if (company?.setupComplete) {
          router.push(buildCompanyDashboardPath(company));
        } else if (company?.name) {
          setName((prev) => prev || company.name || "");
          if (company?.ownerName) {
            setOwnerName((prev) => prev || company.ownerName || "");
          }
        }
      })
      .catch(() => { });
  }, [status, session, router, isCreateNewAccountMode]);

  // Load draft from localStorage on mount
  useEffect(() => {
    const draftKey = isCreateNewAccountMode ? "companySetupDraft:new" : "companySetupDraft";
    const draft = localStorage.getItem(draftKey);
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.name) setName((prev) => prev || parsed.name);
        if (parsed.ownerName) setOwnerName((prev) => prev || parsed.ownerName);
      } catch (e) {
        logger.error("Failed to load setup draft:", e);
      }
    }
  }, [isCreateNewAccountMode]);

  // Save draft to localStorage
  const saveDraft = (currentName: string, currentOwner: string) => {
    const draftKey = isCreateNewAccountMode ? "companySetupDraft:new" : "companySetupDraft";
    localStorage.setItem(draftKey, JSON.stringify({ name: currentName, ownerName: currentOwner }));
  };

  // Called before user clicks "Connect Instagram" so the company is saved in DB first
  const ensureCompanyBeforeInstagramConnect = async (): Promise<boolean> => {
    if (!name.trim()) {
      setError("Please enter your Company / Workspace Name first");
      return false;
    }
    setError(null);
    saveDraft(name, ownerName);

    try {
      const response = await fetch("/api/company/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          createNewAccount: isCreateNewAccountMode && !hasCreatedNewAccount,
          name: name.trim(),
          ownerName: ownerName.trim() || null,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Failed to save company" }));
        logger.error("Failed to save progress before connect:", err);
        return false;
      }

      const data = await response.json().catch(() => null);
      if (isCreateNewAccountMode && data?.company?.id) {
        setHasCreatedNewAccount(true);
      }
      return true;
    } catch (e) {
      logger.error("Error saving progress before Instagram connect:", e);
      return false;
    }
  };

  // Final submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Company or brand name is required");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/company/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          createNewAccount: isCreateNewAccountMode && !hasCreatedNewAccount,
          name: name.trim(),
          ownerName: ownerName.trim() || null,
          setupComplete: true,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: "Failed to complete setup" }));
        throw new Error(errData.error || "Failed to complete setup");
      }

      const { company } = await response.json();

      // Clear draft on success
      localStorage.removeItem("companySetupDraft");
      localStorage.removeItem("companySetupDraft:new");

      router.push(buildCompanyDashboardPath(company));
    } catch (err: any) {
      logger.error("Setup error:", err);
      setError(err.message || "Failed to create company. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100" aria-busy="true">
        <p className="text-sm font-semibold text-slate-600">Loading workspace...</p>
      </main>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <main className="relative min-h-screen py-12 px-4 sm:px-6 flex items-center justify-center">
      {/* Atmospheric Mesh Lighting */}
      <div className="mesh-bg">
        <i className="mesh-a" />
        <i className="mesh-b" />
        <i className="mesh-c" />
      </div>

      <section className="mx-auto w-full max-w-xl" aria-label="Setup card">
        {/* Workspace Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-blue-50/80 px-3 py-1 shadow-2xs backdrop-blur-md mb-2.5">
            <Sparkles className="h-3 w-3 text-blue-600" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
              Instance Workspace Setup
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-display">
            Get Started with Instance
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            Name your workspace and link your Instagram account to start building automations in seconds.
          </p>
        </div>

        {/* Clean Single-Screen Setup Form */}
        <form
          onSubmit={handleSubmit}
          className="glass-panel p-6 sm:p-8 rounded-3xl shadow-xl border border-white/80 space-y-6"
        >
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Company / Workspace Name */}
          <div className="space-y-1.5">
            <label
              htmlFor="companyName"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700"
            >
              Company / Brand Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                id="companyName"
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                  saveDraft(e.target.value, ownerName);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 placeholder-slate-400 transition-all"
                placeholder="e.g. Acme Growth Labs"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Used to identify your organization and generate your secure workspace URL.
            </p>
          </div>

          {/* 2. Founder / Your Name */}
          <div className="space-y-1.5">
            <label
              htmlFor="ownerName"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700"
            >
              Your Name <span className="text-slate-400 font-normal lowercase">(optional)</span>
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                id="ownerName"
                type="text"
                value={ownerName}
                onChange={(e) => {
                  setOwnerName(e.target.value);
                  saveDraft(name, e.target.value);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 placeholder-slate-400 transition-all"
                placeholder="e.g. Alex Rivers"
              />
            </div>
          </div>

          {/* 3. Connect Instagram Business Account */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Instagram Connection
              </label>
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Official Meta Graph API
              </span>
            </div>

            <InstagramConnect
              isCreateNewAccountMode={isCreateNewAccountMode}
              hasCreatedNewAccount={hasCreatedNewAccount}
              ensureCompanyBeforeConnect={ensureCompanyBeforeInstagramConnect}
            />

            <p className="text-[11px] text-slate-400">
              Connecting via Meta automatically links your verified Instagram handle and permissions. You can also connect or switch accounts anytime in Settings.
            </p>
          </div>

          {/* 4. Complete Setup Button */}
          <div className="pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 py-3 px-6 text-sm font-bold text-white shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Setting Up Workspace...
                </span>
              ) : (
                <>
                  <span>Enter Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
