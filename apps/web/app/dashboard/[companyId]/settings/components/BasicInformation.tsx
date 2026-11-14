"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { logger } from "@/lib/logger";
import { toast } from "@/lib/toast";

import InstagramConnect from "@/app/setup/components/InstagramConnect";
import { LanguageSelector } from "@/components/LanguageSelector";

interface Company {
  id: string;
  name: string;
  companyId: string;
  instagramHandle: string | null;
  ownerName: string | null;
  ownerRole: string | null;
  numberOfEmployees: number | null;
  websiteUrl: string | null;
  companyEmail: string | null;
}

export default function BasicInformation() {
  const t = useTranslations("settings.basic");
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    instagramHandle: "",
    ownerName: "",
    ownerRole: "",
    numberOfEmployees: "",
    websiteUrl: "",
    companyEmail: "",
  });

  useEffect(() => {
    fetchCompanyData();
  }, []);

  const fetchCompanyData = async () => {
    try {
      const response = await fetch("/api/company");
      if (response.ok) {
        const data = await response.json();
        setCompany(data);
        setFormData({
          name: data.name || "",
          instagramHandle: data.instagramHandle || "",
          ownerName: data.ownerName || "",
          ownerRole: data.ownerRole || "",
          numberOfEmployees: data.numberOfEmployees?.toString() || "",
          websiteUrl: data.websiteUrl || "",
          companyEmail: data.companyEmail || "",
        });
      }
    } catch (error) {
      logger.error("Error fetching company:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch("/api/company/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t("updateError"));
      }

      const data = await response.json();
      setCompany(data.company);
      toast.success(
        t("updateSuccess"),
        t("updateSuccessDesc")
      );
    } catch (error: any) {
      logger.error("Update error:", error);
      toast.error(
        t("updateError"),
        error.message || "Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-lg font-medium text-stone-800">
        {t("loading")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200/60">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight font-display">
          {t("title")}
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          {t("subtitle")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="name" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              {t("companyName")} <span className="text-rose-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-900 shadow-2xs transition-all focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder-slate-400"
              placeholder={t("companyNamePlaceholder")}
            />
          </div>

          <div>
            <label htmlFor="ownerName" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              {t("ownerName")}
            </label>
            <input
              id="ownerName"
              type="text"
              value={formData.ownerName}
              onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-900 shadow-2xs transition-all focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder-slate-400"
              placeholder={t("ownerNamePlaceholder")}
            />
          </div>

          <div>
            <label htmlFor="ownerRole" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              {t("ownerRole")}
            </label>
            <input
              id="ownerRole"
              type="text"
              value={formData.ownerRole}
              onChange={(e) => setFormData({ ...formData, ownerRole: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-900 shadow-2xs transition-all focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder-slate-400"
              placeholder={t("ownerRolePlaceholder")}
            />
          </div>

          <div>
            <label htmlFor="websiteUrl" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              {t("websiteUrl")}
            </label>
            <input
              id="websiteUrl"
              type="url"
              value={formData.websiteUrl}
              onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-900 shadow-2xs transition-all focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder-slate-400"
              placeholder={t("websiteUrlPlaceholder")}
            />
          </div>

          <div>
            <label htmlFor="companyEmail" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              {t("companyEmail")}
            </label>
            <input
              id="companyEmail"
              type="email"
              value={formData.companyEmail}
              onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-900 shadow-2xs transition-all focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder-slate-400"
              placeholder={t("companyEmailPlaceholder")}
            />
          </div>
        </div>

        {/* Instagram Account Connection (Official Meta Graph API OAuth) */}
        <div className="pt-6 border-t border-slate-200/60 space-y-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              {t("instagramConnection")}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {t("instagramDesc")}
            </p>
          </div>
          <InstagramConnect />
        </div>

        {/* Interface Language Preference (Account Profile Only) */}
        <div className="pt-6 border-t border-slate-200/60 space-y-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              {t("interfaceLanguage")}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {t("interfaceLanguageDesc")}
            </p>
          </div>
          <LanguageSelector />
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-200/60">
          <button
            type="submit"
            disabled={isSaving}
            className="cursor-pointer rounded-xl bg-blue-600 px-6 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm shadow-blue-500/25 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-50 transition-all active:scale-95"
          >
            {isSaving ? t("saving") : t("saveProfile")}
          </button>
        </div>
      </form>
    </div>
  );
}
