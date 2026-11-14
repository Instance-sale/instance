"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { SUPPORTED_LANGUAGES, LOCALE_COOKIE } from "@/config/languages";
import { useLocale } from "next-intl";

export function LanguageSelector() {
  const currentLocale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLanguageChange = (newLocale: string) => {
    document.cookie = `${LOCALE_COOKIE}=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;

    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className="relative inline-block w-full max-w-xs">
      <select
        value={currentLocale}
        onChange={(e) => handleLanguageChange(e.target.value)}
        disabled={isPending}
        className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 shadow-2xs transition-all hover:border-slate-300 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 cursor-pointer"
        aria-label="Select display language"
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang.id} value={lang.id}>
            {lang.flag} {lang.name} ({lang.nativeName})
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
