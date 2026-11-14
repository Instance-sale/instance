"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { logger } from "@/lib/logger";
import { RefreshCw } from "lucide-react";

interface InstagramAccount {
  id: string;
  instagramUserId: string;
  username: string;
  profilePictureUrl: string | null;
  followersCount: number | null;
  accountType: string | null;
  isActive: boolean;
  connectedAt: string;
}

export default function InstagramConnect({
  isCreateNewAccountMode = false,
  hasCreatedNewAccount = false,
  ensureCompanyBeforeConnect,
}: {
  isCreateNewAccountMode?: boolean;
  hasCreatedNewAccount?: boolean;
  ensureCompanyBeforeConnect?: () => Promise<boolean>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (isCreateNewAccountMode && !hasCreatedNewAccount) {
      setAccounts([]);
      return;
    }

    // Check for connection success
    const connected = searchParams.get("instagram_connected");
    if (connected === "true") {
      loadAccounts();
    }

    // Check for errors
    const error = searchParams.get("error");
    if (error) {
      logger.error("Instagram connection error:", error);
      // Error messages will be handled by the error display below
    }

    // Load existing accounts
    loadAccounts();
  }, [searchParams, isCreateNewAccountMode, hasCreatedNewAccount]);

  const loadAccounts = async () => {
    if (isCreateNewAccountMode && !hasCreatedNewAccount) {
      setAccounts([]);
      return;
    }

    try {
      const response = await fetch("/api/instagram/accounts");
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      logger.error("Failed to load accounts:", error);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    if (ensureCompanyBeforeConnect) {
      const ready = await ensureCompanyBeforeConnect();
      if (!ready) {
        setIsConnecting(false);
        return;
      }
    }

    window.location.href = isCreateNewAccountMode
      ? "/api/instagram/auth?setupMode=new"
      : "/api/instagram/auth";
  };

  // NOTE: Users disconnecting and re-adding accounts causes problems.
  // Disconnect flow is disabled during onboarding setup.

  // Prefer an active row, but fall back to any connected row so we don't hide the account
  // after Meta deauthorize (isActive false) — user should see "reconnect", not empty state.
  const activeAccount = accounts.find((acc) => acc.isActive) ?? accounts[0];
  const error = searchParams.get("error");
  const accountType = searchParams.get("account_type");
  const isPersonalAccount = activeAccount?.accountType === "PERSONAL" || accountType === "personal";

  // Error messages mapping
  const getErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case "oauth_not_configured":
        return "Instagram OAuth is not configured. Please check your environment variables.";
      case "invalid_app_id":
        return "Invalid App ID. Please check your INSTAGRAM_APP_ID in .env file.";
      case "placeholder_credentials":
        return "App credentials appear to be placeholders. Please set your actual Instagram App credentials.";
      case "invalid_instagram_account":
        return "Unable to read your Instagram account. Make sure you're using a Business or Creator account.";
      case "no_company":
        return "No company found. Please complete the company setup first.";
      case "no_code":
        return "Authorization was cancelled or failed. Please try again.";
      case "instagram_already_connected_elsewhere":
        return "This Instagram account is already connected to another Instance account. Log in to that account to disconnect it first, or use a different Instagram (Business or Creator) account.";
      case "oauth_state_missing":
        return "Connection could not be completed. Please try again from this page (use the same browser and do not open the link in another tab).";
      default:
        if (errorCode) {
          return `Connection error: ${errorCode}. Please check your Instagram App settings.`;
        }
        return null;
    }
  };

  const errorMessage = getErrorMessage(error);

  return (
    <div className="md:col-span-2">
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
        Instagram Business Account <span className="text-rose-500">*</span>
      </label>
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-md transition-all">
        {/* Subtle decorative gradient top bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600" />

        {errorMessage && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 backdrop-blur-sm">
            <p className="text-xs font-semibold text-rose-800">{errorMessage}</p>
            {error === "oauth_not_configured" && (
              <p className="mt-1 text-[11px] text-rose-600">
                Make sure INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET are set in your .env file.
              </p>
            )}
            {error?.includes("domain") && (
              <div className="mt-2 text-[11px] text-rose-600">
                <p className="font-semibold">Domain Configuration Required:</p>
                <ol className="mt-1 ml-4 list-decimal space-y-0.5">
                  <li>Go to Instagram App Settings → Basic</li>
                  <li>Add your domain to "App Domains" (without https://)</li>
                  <li>Add your callback URL to "Valid OAuth Redirect URIs"</li>
                  <li>Add your base URL to "Site URL"</li>
                  <li>Save changes and wait 1-2 minutes</li>
                </ol>
              </div>
            )}
          </div>
        )}

        {searchParams.get("transferred") === "true" && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/90 p-3.5 backdrop-blur-sm">
            <p className="text-xs font-semibold text-emerald-800">
              Instagram account successfully transferred to this workspace.
            </p>
          </div>
        )}

        {activeAccount ? (
          <div>
            {/* Account Type Warning for Personal Accounts */}
            {isPersonalAccount && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/90 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 font-bold text-xs">
                    !
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 mb-1">
                      Professional Account Required
                    </h3>
                    <p className="text-xs text-amber-800 mb-2.5">
                      Your Instagram account is currently personal. To allow automations to respond to incoming DMs, switch to a Business or Creator account in the Instagram app.
                    </p>
                    <div className="rounded-lg border border-amber-200 bg-white/80 p-2.5 text-[11px] text-amber-900 space-y-1">
                      <p className="font-semibold">How to switch:</p>
                      <p>Open Instagram → Settings (☰) → Switch to Professional Account → Choose Business or Creator.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  {activeAccount.profilePictureUrl ? (
                    <img
                      src={activeAccount.profilePictureUrl}
                      alt={activeAccount.username}
                      className="h-12 w-12 rounded-xl object-cover ring-2 ring-purple-500/20"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 text-white font-bold">
                      {activeAccount.username.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <span className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white ${activeAccount.isActive ? "bg-emerald-500" : "bg-amber-400"}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">@{activeAccount.username}</span>
                    {(activeAccount.accountType === "BUSINESS" ||
                      activeAccount.accountType === "CREATOR") && (
                      <span className="inline-flex items-center rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                        {activeAccount.accountType === "BUSINESS" ? "Business" : "Creator"}
                      </span>
                    )}
                  </div>
                  {activeAccount.followersCount !== null && activeAccount.followersCount !== undefined && (
                    <p className="text-xs font-semibold text-slate-500 tnum">
                      {activeAccount.followersCount.toLocaleString()} followers
                    </p>
                  )}
                  {!activeAccount.isActive && (
                    <p className="text-[11px] font-semibold text-amber-600 mt-0.5">
                      Token expired - reconnect to resume active DMs and automations.
                    </p>
                  )}
                </div>
              </div>

              {activeAccount && (
                <div className="flex items-center gap-2 shrink-0">
                  {!activeAccount.isActive ? (
                    <button
                      type="button"
                      onClick={handleConnect}
                      disabled={isConnecting}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 transition-all cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isConnecting ? "animate-spin" : ""}`} />
                      <span>{isConnecting ? "Connecting…" : "Reconnect Instagram"}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConnect}
                      disabled={isConnecting}
                      title="Reconnect or refresh Meta access token (e.g. if you changed your password)"
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm disabled:opacity-50 transition-all cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isConnecting ? "animate-spin" : ""}`} />
                      <span>{isConnecting ? "Connecting…" : "Reconnect Account"}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-3 text-center sm:text-left sm:flex sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Connect Instagram DM Automation
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Links your Business or Creator account to run automated DM flows, auto-replies, and sync contacts.
              </p>
            </div>
            <button
              type="button"
              onClick={handleConnect}
              disabled={isConnecting}
              className="mt-3 sm:mt-0 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-500/20 hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-purple-500/30 disabled:opacity-50 transition-all cursor-pointer shrink-0"
            >
              {isConnecting ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Connecting...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                  Connect Instagram Account
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
