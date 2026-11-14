"use client";

import { AlertTriangle, Lightbulb } from "lucide-react";

export function TriggerFollowerNodeConfig() {
  return (
    <div className="space-y-4">
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>Meta Follower Policy Notice</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                Meta does <strong>not</strong> provide a real-time webhook when someone clicks &quot;Follow&quot;, and strictly prohibits sending unsolicited cold DMs to users who haven&apos;t messaged or commented first.
              </p>
            </div>

            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-900">
                <Lightbulb className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                <span>Recommended Growth Pattern: Follower Gate</span>
              </div>
              <p className="text-xs text-blue-800 leading-relaxed">
                To turn followers into leads 100% compliantly without risking account restrictions:
              </p>
              <ol className="text-xs text-blue-800 list-decimal list-inside space-y-1.5 pl-1">
                <li>Start with a <strong>Comment</strong> or <strong>DM Received</strong> trigger (e.g. user comments &quot;CHECKLIST&quot;).</li>
                <li>Send an initial DM asking them to follow your account to unlock the bonus.</li>
                <li>Add a <strong>Condition node (Follower Status)</strong>:
                  <ul className="list-disc list-inside pl-3 pt-1 text-[11px] text-blue-700 space-y-1">
                    <li className="flex items-center"><span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1.5" /><strong>True:</strong>&nbsp;User is following → Instantly deliver the link or coupon.</li>
                    <li className="flex items-center"><span className="inline-block w-2 h-2 rounded-full bg-rose-500 mr-1.5" /><strong>False:</strong>&nbsp;User is not following → Send a reminder with a follow button.</li>
                  </ul>
                </li>
              </ol>
            </div>
          </div>
  );
}
