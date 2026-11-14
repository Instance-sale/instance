"use client";

import { useState, useMemo } from "react";
import { Shield, ShieldAlert, CheckCircle2, X } from "lucide-react";
import { analyzeCommentSentiment } from "@/lib/automation/sentiment-detector";

export function NegativeSentimentShield({
  config,
  setConfig,
}: {
  config: Record<string, any>;
  setConfig: (next: Record<string, any>) => void;
}) {
  const autoHideNegative = Boolean(config.autoHideNegative);
  const autoHideSpam = Boolean(config.autoHideSpam);
  const skipReply = config.skipReplyOnHarmful !== false;
  const sensitivity = config.sentimentSensitivity || "moderate";
  const customBlocklist: string[] = Array.isArray(config.customBlocklist) ? config.customBlocklist : [];

  const [newWord, setNewWord] = useState("");
  const [testComment, setTestComment] = useState("");

  const testAnalysis = useMemo(() => {
    if (!testComment.trim()) return null;
    return analyzeCommentSentiment(testComment, {
      customBlocklist,
      sensitivity,
    });
  }, [testComment, customBlocklist, sensitivity]);

  const addBlockWord = () => {
    const trimmed = newWord.trim();
    if (!trimmed || customBlocklist.includes(trimmed)) return;
    setConfig({
      ...config,
      customBlocklist: [...customBlocklist, trimmed],
    });
    setNewWord("");
  };

  const removeBlockWord = (word: string) => {
    setConfig({
      ...config,
      customBlocklist: customBlocklist.filter((w) => w !== word),
    });
  };

  return (
    <div className="border-t border-slate-100 pt-4 space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-slate-700 shrink-0" />
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-800">
            Negative Sentiment &amp; Spam Shield
          </span>
          <p className="text-[11px] text-slate-500">
            Protect your ad spend &amp; brand by automatically hiding toxic comments
          </p>
        </div>
      </div>

      <div className="space-y-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={autoHideNegative}
            onChange={(e) =>
              setConfig({ ...config, autoHideNegative: e.target.checked })
            }
            className="mt-0.5 rounded text-red-600 focus:ring-red-500 cursor-pointer"
          />
          <div className="text-xs">
            <span className="font-semibold text-slate-800">
              Auto-Hide Negative &amp; Toxic Comments
            </span>
            <p className="text-[11px] text-slate-500">
              Hides profanity, hate, scam accusations, and refund complaints from the public
            </p>
          </div>
        </label>

        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={autoHideSpam}
            onChange={(e) =>
              setConfig({ ...config, autoHideSpam: e.target.checked })
            }
            className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
          />
          <div className="text-xs">
            <span className="font-semibold text-slate-800">
              Auto-Hide Bot &amp; Promo Spam
            </span>
            <p className="text-[11px] text-slate-500">
              Hides Telegram links, WhatsApp spam, crypto bots, and unsolicited promo
            </p>
          </div>
        </label>

        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={skipReply}
            onChange={(e) =>
              setConfig({ ...config, skipReplyOnHarmful: e.target.checked })
            }
            className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
          <div className="text-xs">
            <span className="font-semibold text-slate-800">
              Skip Automated Promo Reply on Hidden Comments
            </span>
            <p className="text-[11px] text-slate-500">
              Avoids sending welcome DMs or rewards to toxic trolls or spam bots
            </p>
          </div>
        </label>

        {(autoHideNegative || autoHideSpam) && (
          <div className="pt-2 border-t border-slate-200/70 space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Protection Sensitivity
              </label>
              <select
                value={sensitivity}
                onChange={(e) =>
                  setConfig({ ...config, sentimentSensitivity: e.target.value })
                }
                className="w-full text-xs rounded-lg border border-slate-200 px-2.5 py-1.5 bg-white font-medium"
              >
                <option value="strict">Strict (Hides any slightly negative comments)</option>
                <option value="moderate">Moderate (Balanced protection - Recommended)</option>
                <option value="loose">Loose (Hides severe toxicity &amp; explicit spam only)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Custom Blocklist Keywords (e.g. competitors, specific words)
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addBlockWord();
                    }
                  }}
                  placeholder="Enter word or phrase..."
                  className="flex-1 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white"
                />
                <button
                  type="button"
                  onClick={addBlockWord}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-800 text-white rounded-lg hover:bg-slate-700 cursor-pointer"
                >
                  Add
                </button>
              </div>

              {customBlocklist.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {customBlocklist.map((word) => (
                    <span
                      key={word}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-md text-[11px] font-medium"
                    >
                      {word}
                      <button
                        type="button"
                        onClick={() => removeBlockWord(word)}
                        className="text-red-400 hover:text-red-700 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Live Interactive Testing Sandbox */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                <Shield className="w-3.5 h-3.5 text-slate-500" />
                <span>Live Shield Simulator</span>
              </span>
              <input
                type="text"
                placeholder="Type a test comment (e.g. 'This is a scam refund me now')..."
                value={testComment}
                onChange={(e) => setTestComment(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-400"
              />
              {testAnalysis && (
                <div
                  className={`p-2.5 rounded-lg border text-xs space-y-1 ${testAnalysis.isHarmful
                    ? "bg-red-50/80 border-red-200 text-red-900"
                    : "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                    }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    {testAnalysis.isHarmful ? (
                      <span className="flex items-center gap-1.5 text-red-700">
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                        <span>Would Be Auto-Hidden from Public</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Allowed on Public Feed</span>
                      </span>
                    )}
                    <span className="font-mono text-[11px]">
                      Toxicity: {testAnalysis.score}/100
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Reason: {testAnalysis.reason}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
