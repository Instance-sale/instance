"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "@/lib/toast";

interface ApiKeyItem {
  id: string;
  name: string;
  displayKey: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export default function ApiKeysSettings() {
  const t = useTranslations("settings.apiKeys");
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdSecret, setCreatedSecret] = useState<{ name: string; rawKey: string } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeSnippetTab, setActiveSnippetTab] = useState<"curl" | "fetch" | "python" | "mcp">("curl");
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/api-keys");
      if (res.ok) {
        const json = await res.json();
        setKeys(json.data || []);
      }
    } catch {
      toast.error(t("errors.fetchFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    try {
      setIsCreating(true);
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || t("errors.createFailed"));
      }

      const json = await res.json();
      setCreatedSecret({
        name: json.data.name,
        rawKey: json.data.rawKey,
      });
      setNewKeyName("");
      setIsModalOpen(false);
      fetchKeys();
      toast.success(t("success.created"));
    } catch (err: any) {
      toast.error(err.message || t("errors.createFailed"));
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevokeKey = async (id: string) => {
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/api-keys/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error(t("errors.revokeFailed"));
      }

      setKeys((prev) => prev.filter((k) => k.id !== id));
      setDeleteConfirmId(null);
      toast.success(t("success.revoked"));
    } catch {
      toast.error(t("errors.revokeFailed"));
    } finally {
      setIsDeleting(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    toast.success(t("copied"));
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const sampleKey = createdSecret ? createdSecret.rawKey : (keys[0]?.displayKey || "inst_live_your_api_key");

  const codeSnippets = {
    curl: `curl -X GET "https://api.instance.sale/api/v1/contacts?limit=25" \\
  -H "X-API-Key: ${sampleKey}" \\
  -H "Content-Type: application/json"`,
    fetch: `const response = await fetch("https://api.instance.sale/api/v1/contacts?limit=25", {
  method: "GET",
  headers: {
    "X-API-Key": "${sampleKey}",
    "Content-Type": "application/json"
  }
});
const data = await response.json();
console.log(data);`,
    python: `import requests

url = "https://api.instance.sale/api/v1/contacts"
headers = {
    "X-API-Key": "${sampleKey}",
    "Content-Type": "application/json"
}
params = {"limit": 25}

response = requests.get(url, headers=headers, params=params)
print(response.json())`,
    mcp: `{
  "mcpServers": {
    "instance": {
      "command": "npx",
      "args": ["-y", "instance-mcp"],
      "env": {
        "INSTANCE_API_URL": "https://api.instance.sale",
        "INSTANCE_API_KEY": "${sampleKey}"
      }
    }
  }
}`,
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/70">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight font-display">
            {t("title")}
          </h2>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            {t("subtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-all cursor-pointer whitespace-nowrap"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t("actions.createNew")}
        </button>
      </div>

      {/* Freshly Generated Secret Alert (Shown Once) */}
      {createdSecret && (
        <div className="p-5 rounded-xl bg-emerald-50/80 border border-emerald-200 shadow-sm space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <h3 className="text-sm font-semibold text-emerald-900 font-display">
                {t("newKeyAlert.title", { name: createdSecret.name })}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setCreatedSecret(null)}
              className="text-xs text-emerald-700 hover:text-emerald-900 cursor-pointer font-medium"
            >
              {t("newKeyAlert.dismiss")}
            </button>
          </div>
          <p className="text-xs text-emerald-700 leading-relaxed">
            {t("newKeyAlert.warning")}
          </p>
          <div className="flex items-center gap-2 bg-white/90 border border-emerald-300/80 rounded-lg p-2 font-mono text-xs text-slate-800 select-all overflow-x-auto">
            <span className="flex-1 break-all">{createdSecret.rawKey}</span>
            <button
              type="button"
              onClick={() => copyToClipboard(createdSecret.rawKey, "created-secret")}
              className="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded transition-colors cursor-pointer whitespace-nowrap"
            >
              {copiedKeyId === "created-secret" ? t("actions.copied") : t("actions.copy")}
            </button>
          </div>
        </div>
      )}

      {/* Keys Table */}
      <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {t("table.header")}
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            {t("table.count", { count: keys.length })}
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">
            {t("loading")}
          </div>
        ) : keys.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-600">
              {t("table.empty")}
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {t("table.emptySub")}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {keys.map((k) => (
              <div
                key={k.id}
                className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">
                      {k.name}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {k.displayKey}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span>
                      {t("table.created")}: {new Date(k.createdAt).toLocaleDateString()}
                    </span>
                    <span>•</span>
                    <span>
                      {t("table.lastUsed")}: {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : t("table.neverUsed")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(k.displayKey, k.id)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                    title={t("actions.copy")}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>

                  {deleteConfirmId === k.id ? (
                    <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-2 py-1 rounded-lg">
                      <span className="text-xs text-rose-700 font-medium">
                        {t("actions.confirmRevoke")}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRevokeKey(k.id)}
                        disabled={isDeleting}
                        className="text-xs font-bold text-rose-600 hover:text-rose-800 px-1.5 py-0.5 cursor-pointer"
                      >
                        {isDeleting ? "..." : t("actions.yes")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(null)}
                        className="text-xs text-slate-500 hover:text-slate-700 px-1.5 py-0.5 cursor-pointer"
                      >
                        {t("actions.cancel")}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(k.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                      title={t("actions.revoke")}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Interactive Quickstart Sandbox */}
      <div className="bg-white rounded-xl overflow-hidden border border-slate-200/80 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 font-display">
              {t("quickstart.title")}
            </h3>
            <p className="text-xs text-slate-500">
              {t("quickstart.subtitle")}
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setActiveSnippetTab("curl")}
              className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                activeSnippetTab === "curl"
                  ? "bg-white text-slate-900 shadow-sm font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              cURL
            </button>
            <button
              type="button"
              onClick={() => setActiveSnippetTab("fetch")}
              className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                activeSnippetTab === "fetch"
                  ? "bg-white text-slate-900 shadow-sm font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              JavaScript
            </button>
            <button
              type="button"
              onClick={() => setActiveSnippetTab("python")}
              className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                activeSnippetTab === "python"
                  ? "bg-white text-slate-900 shadow-sm font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Python
            </button>
            <button
              type="button"
              onClick={() => setActiveSnippetTab("mcp")}
              className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                activeSnippetTab === "mcp"
                  ? "bg-white text-slate-900 shadow-sm font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              MCP (Claude / Cursor)
            </button>
          </div>
        </div>

        <div className="relative p-5 font-mono text-xs leading-relaxed overflow-x-auto bg-slate-50/80 text-slate-800 border-t border-slate-100">
          <pre className="text-slate-800">{codeSnippets[activeSnippetTab]}</pre>
          <button
            type="button"
            onClick={() => copyToClipboard(codeSnippets[activeSnippetTab], "snippet")}
            className="absolute top-4 right-4 px-2.5 py-1 rounded-md bg-white hover:bg-slate-100 text-[11px] font-sans font-medium text-slate-600 border border-slate-200/80 shadow-xs transition-colors cursor-pointer"
          >
            {copiedKeyId === "snippet" ? t("actions.copied") : t("actions.copy")}
          </button>
        </div>
      </div>

      {/* Create Key Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 font-display">
                {t("modal.title")}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateKey} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t("modal.nameLabel")}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t("modal.namePlaceholder")}
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  {t("modal.nameHelp")}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  {t("actions.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newKeyName.trim()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  {isCreating ? t("modal.creating") : t("modal.submit")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
