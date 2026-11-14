"use client";

import { Camera } from "lucide-react";

export function StoryMentionSettings({
  config,
  setConfig,
}: {
  config: Record<string, any>;
  setConfig: (next: Record<string, any>) => void;
}) {
  const enableFollowerTier = Boolean(config.enableFollowerTier);
  const threshold = config.followerThreshold ?? 5000;
  const generatePromoCode = Boolean(config.generatePromoCode);

  return (
    <div className="space-y-4 pt-2 border-t border-slate-100">
      {/* Follower Tier Segmentation */}
      <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-3">
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={enableFollowerTier}
            onChange={(e) =>
              setConfig({ ...config, enableFollowerTier: e.target.checked })
            }
            className="mt-0.5 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
          />
          <div className="text-xs">
            <span className="font-bold text-purple-900">
              Follower Tier Segmentation (VIP vs Standard Routing)
            </span>
            <p className="text-[11px] text-purple-700 leading-relaxed mt-0.5">
              Routes micro-influencers (&gt; threshold) to collaboration offers while giving standard fans discount codes.
            </p>
          </div>
        </label>

        {enableFollowerTier && (
          <div className="pl-6 space-y-2 pt-1 border-t border-purple-200/60">
            <label className="block text-[11px] font-semibold text-purple-900">
              VIP Influencer Follower Threshold:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={100}
                step={500}
                value={threshold}
                onChange={(e) =>
                  setConfig({ ...config, followerThreshold: Number(e.target.value) || 5000 })
                }
                className="w-32 text-xs border border-purple-300 rounded-lg px-2.5 py-1.5 bg-white font-mono font-bold text-purple-900"
              />
              <span className="text-xs text-purple-700 font-medium">followers</span>
            </div>
            <div className="text-[11px] text-purple-800 space-y-1.5 pt-1">
              <p className="flex items-center"><span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1.5 shrink-0" /><span><strong>VIP Branch ({Number(threshold).toLocaleString()}+ followers):</strong> Connect to VIP Collab DM</span></p>
              <p className="flex items-center"><span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1.5 shrink-0" /><span><strong>Standard Branch (&lt; {Number(threshold).toLocaleString()} followers):</strong> Connect to Thank-You Offer</span></p>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Urgent Promo Code */}
      <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={generatePromoCode}
            onChange={(e) =>
              setConfig({ ...config, generatePromoCode: e.target.checked })
            }
            className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
          />
          <div className="text-xs">
            <span className="font-bold text-amber-900">
              Generate 12-Hour Urgent Coupon Code
            </span>
            <p className="text-[11px] text-amber-700 leading-relaxed mt-0.5">
              Automatically creates a unique code (e.g. <code>STORY-4921</code>) for each user. Use <code className="bg-amber-100 font-bold px-1 rounded">&#123;promo_code&#125;</code> in your DM!
            </p>
          </div>
        </label>
      </div>

      {/* UGC Archive Banner */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center gap-2">
        <Camera className="w-4 h-4 text-slate-500 shrink-0" />
        <span>All tagged Story assets are automatically archived in your <strong>CRM &gt; Story Mentions &amp; UGC</strong> tab for 1-click reposting.</span>
      </div>
    </div>
  );
}
