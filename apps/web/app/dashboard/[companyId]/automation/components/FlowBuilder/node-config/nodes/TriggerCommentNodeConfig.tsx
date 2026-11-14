"use client";

import MediaSelector from "../../../MediaSelector";
import { logger } from "@/lib/logger";
import {
  FuzzyMatchSettings,
  AutoLikeCommentToggle,
  NegativeSentimentShield,
  AudienceFilterSelector,
} from "../index";

interface TriggerCommentNodeConfigProps {
  config: Record<string, any>;
  setConfig: (config: any) => void;
  keywordsInput: string;
  setKeywordsInput: (val: string) => void;
  showMediaSelector: boolean;
  setShowMediaSelector: (val: boolean) => void;
  instagramAccountId?: string;
  automationId?: string;
}

export function TriggerCommentNodeConfig({
  config,
  setConfig,
  keywordsInput,
  setKeywordsInput,
  showMediaSelector,
  setShowMediaSelector,
  instagramAccountId,
  automationId,
}: TriggerCommentNodeConfigProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Keywords (optional - separate multiple with commas)
        </label>
        <textarea
          value={keywordsInput}
          onChange={(e) => {
            setKeywordsInput(e.target.value);
          }}
          onBlur={(e) => {
            const keywords = e.target.value.split(",").map((k: string) => k.trim()).filter(Boolean);
            setConfig({
              ...config,
              keywords,
              matchType: config.fuzzyMatch ? "FUZZY" : "CONTAINS",
            });
          }}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm cursor-pointer"
          rows={3}
          placeholder="interested, want, info, price, buy, how much"
        />
        <p className="text-xs text-slate-500 mt-1">
          {config.keywords && config.keywords.length > 0
            ? `Enter multiple keywords separated by commas. Automation triggers if the comment contains any of these ${config.keywords.length} keywords.`
            : "Leave empty to trigger on any comment. Or enter keywords separated by commas to trigger only when comment contains any of them."}
        </p>
        {config.keywords && config.keywords.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {config.keywords.map((keyword: string, index: number) => (
              <span
                key={index}
                className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded font-medium"
              >
                {keyword}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Feature 1: Universal Fuzzy Keyword Matching for Comments */}
      <FuzzyMatchSettings
        config={config}
        setConfig={setConfig}
        keywords={config.keywords || []}
      />

      {/* Feature 5: Auto-Like Comment */}
      <AutoLikeCommentToggle config={config} setConfig={setConfig} />

      {/* Feature 6: Negative Sentiment & Spam Shield */}
      <NegativeSentimentShield config={config} setConfig={setConfig} />

      {/* Feature 2: Audience Filter */}
      <AudienceFilterSelector config={config} setConfig={setConfig} />

      <div className="border-t border-slate-100 pt-4">
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Select Post/Reel (optional)
        </label>
        {config.selectedMediaId ? (
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">
                Selected: {config.selectedMediaId}
              </p>
              <p className="text-[11px] text-slate-500">
                Type: {config.selectedMediaType || "Not specified"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setConfig({
                  ...config,
                  selectedMediaId: null,
                  selectedMediaType: null,
                });
                if (automationId) {
                  fetch(`/api/automations/${automationId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ mediaId: null, mediaType: null }),
                  }).catch(logger.error);
                }
              }}
              className="text-xs font-semibold text-rose-600 hover:text-rose-800 cursor-pointer shrink-0"
            >
              Clear
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowMediaSelector(true)}
            className="w-full px-4 py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 cursor-pointer"
          >
            {instagramAccountId ? "Select Post/Reel" : "Connect Instagram to select media"}
          </button>
        )}
        <p className="text-xs text-slate-500 mt-1">
          Choose a specific post/reel to monitor. Leave empty to monitor all posts/reels.
        </p>
      </div>
      {/* Only show Media Type Filter when NO specific media is selected */}
      {!config.selectedMediaId && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Media Type Filter
          </label>
          <select
            value={config.mediaType || "ALL"}
            onChange={(e) =>
              setConfig({ ...config, mediaType: e.target.value })
            }
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm cursor-pointer"
          >
            <option value="ALL">Any Post/Reel</option>
            <option value="POST">Post Only</option>
            <option value="REEL">Reel Only</option>
          </select>
          <p className="text-xs text-slate-500 mt-1">
            Filter comment triggers by media type (only applies when no specific post/reel is selected)
          </p>
        </div>
      )}
      {instagramAccountId && (
        <MediaSelector
          isOpen={showMediaSelector}
          onClose={() => setShowMediaSelector(false)}
          onSelect={(mediaId, mediaType) => {
            setConfig({
              ...config,
              selectedMediaId: mediaId,
              selectedMediaType: mediaType,
            });
            if (automationId) {
              fetch(`/api/automations/${automationId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  mediaId,
                  mediaType,
                }),
              }).catch(logger.error);
            }
          }}
          accountId={instagramAccountId}
          type={config.mediaType === "REEL" ? "reel" : config.mediaType === "POST" ? "post" : "all"}
        />
      )}
    </div>
  );
}
