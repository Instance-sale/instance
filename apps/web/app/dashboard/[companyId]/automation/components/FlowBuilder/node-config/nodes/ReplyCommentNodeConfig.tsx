"use client";

import { CornerDownLeft } from "lucide-react";
import {
  MessageWithPlaceholderHighlight,
  PlaceholderHelperChips,
  MessageVariationsSection,
  AutoLikeCommentToggle,
  ActionDelayFields,
} from "../index";

interface ReplyCommentNodeConfigProps {
  config: Record<string, any>;
  setConfig: (config: any) => void;
}

export function ReplyCommentNodeConfig({ config, setConfig }: ReplyCommentNodeConfigProps) {
  return (
    <div className="space-y-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50/80 p-3">
              <p className="text-xs font-semibold text-blue-900 mb-1.5 flex items-center gap-1.5">
                <CornerDownLeft className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                <span>Public Comment Reply</span>
              </p>
              <p className="text-xs text-blue-800 leading-relaxed mb-2">
                Automatically posts a public reply to the comment that triggered this flow.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-md bg-blue-100 px-2 py-0.5 font-mono text-xs font-medium text-blue-900 ring-1 ring-blue-200">{'{name}'}</span>
                <span className="inline-flex items-center rounded-md bg-blue-100 px-2 py-0.5 font-mono text-xs font-medium text-blue-900 ring-1 ring-blue-200">{'{username}'}</span>
                <span className="inline-flex items-center rounded-md bg-blue-100 px-2 py-0.5 font-mono text-xs font-medium text-blue-900 ring-1 ring-blue-200">{'{comment}'}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold text-slate-800">
                  Primary Reply Message
                </label>
                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  Primary Message
                </span>
              </div>
              <MessageWithPlaceholderHighlight
                value={config.message || ""}
                onChange={(message) => setConfig({ ...config, message })}
                placeholder="e.g. Sent you a DM {name}! Check your inbox requests"
                rows={3}
              />
              <PlaceholderHelperChips
                onInsert={(token) => {
                  const cur = config.message || "";
                  const next = cur
                    ? cur.endsWith(" ")
                      ? `${cur}${token}`
                      : `${cur} ${token}`
                    : token;
                  setConfig({ ...config, message: next });
                }}
              />
              <p className="mt-1 text-xs text-slate-500">
                <span className="font-medium text-blue-700">{'{name}'}</span>, <span className="font-medium text-blue-700">{'{username}'}</span>, <span className="font-medium text-blue-700">{'{comment}'}</span>, and <span className="font-medium text-purple-700">{'{promo}'}</span> will be replaced dynamically.
              </p>
              {Array.isArray(config.messageVariations) && config.messageVariations.filter((v: any) => typeof v === "string" ? v.trim() : v?.text?.trim()).length > 0 && (
                <p className="mt-1 text-[11px] text-amber-600 font-medium">
                  ⚠️ Variations are active below. A random variation will be sent instead of this primary message.
                </p>
              )}
            </div>

            {/* Feature 4: Variations for Anti-Spam */}
            <MessageVariationsSection config={config} setConfig={setConfig} />

            {/* Feature 5: Auto-Like Comment */}
            <AutoLikeCommentToggle config={config} setConfig={setConfig} />

            <ActionDelayFields config={config} setConfig={setConfig} />
          </div>
  );
}
