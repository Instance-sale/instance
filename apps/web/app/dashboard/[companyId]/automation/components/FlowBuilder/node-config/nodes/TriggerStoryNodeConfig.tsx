"use client";

import { Camera, MessageSquare, Plus, Smile, Film, Layers, CheckCircle2 } from "lucide-react";
import MediaSelector from "../../../MediaSelector";
import { logger } from "@/lib/logger";
import {
  StoryMentionSettings,
  FuzzyMatchSettings,
  AudienceFilterSelector,
} from "../index";

interface TriggerStoryNodeConfigProps {
  config: Record<string, any>;
  setConfig: (config: any) => void;
  keywordsInput: string;
  setKeywordsInput: (val: string) => void;
  showMediaSelector: boolean;
  setShowMediaSelector: (val: boolean) => void;
  showManualStoryInput: boolean;
  setShowManualStoryInput: (val: boolean) => void;
  instagramAccountId?: string;
  automationId?: string;
}

export function TriggerStoryNodeConfig({
  config,
  setConfig,
  keywordsInput,
  setKeywordsInput,
  showMediaSelector,
  setShowMediaSelector,
  showManualStoryInput,
  setShowManualStoryInput,
  instagramAccountId,
  automationId,
}: TriggerStoryNodeConfigProps) {
  const storyType = config.storyType || "mention";
  const isMention = storyType === "mention";
  const isReaction = storyType === "reaction";
  const isReply = storyType === "reply";

  const storyScope = config.storyScope || (config.selectedMediaId ? "SPECIFIC" : "ALL");

  const handleSetScope = (newScope: "ALL" | "SPECIFIC") => {
    if (newScope === "ALL") {
      setShowManualStoryInput(false);
      setShowMediaSelector(false);
      setConfig({
        ...config,
        storyScope: "ALL",
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
    } else {
      setConfig({
        ...config,
        storyScope: "SPECIFIC",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Story Interaction Type
        </label>
        <select
          value={storyType}
          onChange={(e) =>
            setConfig({ ...config, storyType: e.target.value })
          }
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm cursor-pointer font-medium"
        >
          <option value="mention">Story Mention (Tagged in their story)</option>
          <option value="reply">Story Reply (Replied with text to your story)</option>
          <option value="reaction">Story Reaction (Tapped an emoji on your story)</option>
        </select>
      </div>

      {isMention && (
        <>
          <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl space-y-1.5">
            <p className="text-xs font-semibold text-purple-900 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-purple-700 shrink-0" />
              <span>How Story Mention Works</span>
            </p>
            <p className="text-xs text-purple-800 leading-relaxed">
              Fires automatically when an Instagram user tags your handle in <strong>their own story</strong>.
            </p>
            <p className="text-xs text-purple-700">
              Because users tag you without typing text, <strong>leave keywords empty</strong> to reward any user who mentions your brand!
            </p>
          </div>

          {/* Feature 7: Follower Tier Segmentation & Promo Codes */}
          <StoryMentionSettings config={config} setConfig={setConfig} />
        </>
      )}

      {isReply && (
        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-1.5">
          <p className="text-xs font-semibold text-blue-900 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-blue-700 shrink-0" />
            <span>How Story Reply Works</span>
          </p>
          <p className="text-xs text-blue-800 leading-relaxed">
            Fires when a follower watches <strong>your story</strong> and sends a text message.
          </p>
        </div>
      )}

      {/* Feature 3: Story Reaction / Emoji Trigger */}
      {isReaction && (
        <div className="space-y-3 p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
            <Smile className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>Story Reaction / Emoji Trigger</span>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            Fires when a viewer taps an emoji reaction on your story. Zero typing effort gives 40% higher response rates!
          </p>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Trigger on Specific Reactions (optional):
            </label>
            <div className="flex flex-wrap gap-1.5">
              {["🔥", "❤️", "👏", "😍", "🙌", "😂", "😮", "😢"].map((emoji) => {
                const selectedEmojis: string[] = Array.isArray(config.storyEmojis)
                  ? config.storyEmojis
                  : [];
                const isSelected = selectedEmojis.includes(emoji);
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      const updated = isSelected
                        ? selectedEmojis.filter((e) => e !== emoji)
                        : [...selectedEmojis, emoji];
                      setConfig({ ...config, storyEmojis: updated });
                    }}
                    className={`text-base px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${isSelected
                      ? "bg-amber-100 border-amber-400 ring-2 ring-amber-300 font-bold scale-105"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                      }`}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              {(!config.storyEmojis || config.storyEmojis.length === 0)
                ? "All reaction emojis trigger this automation."
                : `Triggering only on: ${config.storyEmojis.join(" ")}`}
            </p>
          </div>
        </div>
      )}

      {!isReaction && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Keywords {isMention ? "(optional - usually leave blank)" : "(optional)"}
          </label>
          <textarea
            value={keywordsInput}
            onChange={(e) => setKeywordsInput(e.target.value)}
            onBlur={(e) => {
              const keywords = e.target.value.split(",").map((k: string) => k.trim()).filter(Boolean);
              setConfig({
                ...config,
                keywords,
                matchType: config.fuzzyMatch ? "FUZZY" : "CONTAINS",
              });
            }}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm cursor-pointer"
            rows={2}
            placeholder={isMention ? "Leave empty to trigger on any story mention..." : "e.g., info, link, price, yes"}
          />
          <p className="text-xs text-slate-500 mt-1">
            {isMention
              ? "Leave empty to trigger on any story mention. (Recommended)"
              : (config.keywords && config.keywords.length > 0
                ? `Automation triggers if the reply contains any of these ${config.keywords.length} keywords.`
                : "Leave empty to trigger on any story reply, or enter keywords separated by commas.")}
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
      )}

      {/* Feature 1: Universal Fuzzy Keyword Matching for Story Replies */}
      {isReply && (
        <FuzzyMatchSettings
          config={config}
          setConfig={setConfig}
          keywords={config.keywords || []}
        />
      )}

      {!isMention && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-semibold text-slate-800">
              Story Scope
            </label>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {storyScope === "ALL" ? "All Stories" : "Specific Story"}
            </span>
          </div>

          {/* Segmented Scope Control */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100/80 border border-slate-200/80 rounded-xl">
            <button
              type="button"
              onClick={() => handleSetScope("ALL")}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${storyScope === "ALL"
                  ? "bg-white text-blue-600 shadow-xs border border-slate-200/50"
                  : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Any Story (All Stories)
            </button>

            <button
              type="button"
              onClick={() => handleSetScope("SPECIFIC")}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${storyScope === "SPECIFIC"
                  ? "bg-white text-blue-600 shadow-xs border border-slate-200/50"
                  : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <Film className="w-3.5 h-3.5" />
              Specific Story
            </button>
          </div>

          {storyScope === "ALL" ? (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Triggering on Any Story</span>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                This automation triggers whenever a follower {isReaction ? "reacts to" : "replies to"} <strong>any current live story or future story</strong> you publish.
              </p>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {config.selectedMediaId ? (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">
                      Target Story ID: {config.selectedMediaId}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Automation will strictly monitor replies to this single story.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSetScope("ALL")}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-800 cursor-pointer shrink-0"
                  >
                    Reset to All Stories
                  </button>
                </div>
              ) : showManualStoryInput ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={config.selectedMediaId || ""}
                    onChange={(e) => {
                      const storyId = e.target.value.trim();
                      setConfig({
                        ...config,
                        storyScope: "SPECIFIC",
                        selectedMediaId: storyId || null,
                        selectedMediaType: storyId ? "STORY" : null,
                      });
                      if (automationId && storyId) {
                        fetch(`/api/automations/${automationId}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ mediaId: storyId, mediaType: "STORY" }),
                        }).catch(logger.error);
                      }
                    }}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono"
                    placeholder="Enter Story ID (e.g., 17841478306731836_123456789)"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowManualStoryInput(false)}
                      className="text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      &larr; Back to visual selector
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowMediaSelector(true)}
                    className="w-full px-4 py-2.5 text-xs font-semibold text-blue-600 bg-blue-50/70 border border-blue-200 rounded-xl hover:bg-blue-100/70 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Film className="w-3.5 h-3.5" />
                    {instagramAccountId ? "Choose from Live Stories" : "Connect Instagram to choose story"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowManualStoryInput(true)}
                    className="w-full px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Or enter Story ID manually
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {instagramAccountId && !isMention && (
        <MediaSelector
          isOpen={showMediaSelector}
          onClose={() => setShowMediaSelector(false)}
          onSelect={(mediaId, mediaType) => {
            setConfig({
              ...config,
              storyScope: "SPECIFIC",
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
          type="story"
        />
      )}

      {/* Feature 2: Audience Eligibility Filter */}
      <AudienceFilterSelector config={config} setConfig={setConfig} />
    </div>
  );
}
