"use client";

import { MessageSquare, Layers } from "lucide-react";
import {
  MessageWithPlaceholderHighlight,
  PlaceholderHelperChips,
  RichMediaSelector,
  MessageVariationsSection,
  ActionDelayFields,
  WaitForReplyFields,
  CarouselCardBuilder,
} from "../index";

interface SendDmNodeConfigProps {
  config: Record<string, any>;
  setConfig: (config: any) => void;
}

export function SendDmNodeConfig({ config, setConfig }: SendDmNodeConfigProps) {
  const isCarousel = config.messageFormat === "carousel";

  return (
    <div className="space-y-4">
      {/* Format Selector Tabs */}
      <div className="flex rounded-lg border border-slate-200 bg-slate-100/70 p-1 gap-1">
        <button
          type="button"
          onClick={() => setConfig({ ...config, messageFormat: "text" })}
          className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            !isCarousel
              ? "bg-white text-slate-900 shadow-2xs border border-slate-200/80"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Standard Message
        </button>
        <button
          type="button"
          onClick={() => setConfig({ ...config, messageFormat: "carousel" })}
          className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            isCarousel
              ? "bg-white text-indigo-700 shadow-2xs border border-indigo-200"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-indigo-600" />
          Interactive Carousel
        </button>
      </div>

      {isCarousel ? (
        <CarouselCardBuilder config={config} setConfig={setConfig} />
      ) : (
        <>
          <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3">
              <p className="text-xs font-medium text-amber-800 mb-2">Available placeholders (use these in your message)</p>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 font-mono text-xs font-medium text-amber-900 ring-1 ring-amber-200">{'{name}'}</span>
                <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 font-mono text-xs font-medium text-amber-900 ring-1 ring-amber-200">{'{comment}'}</span>
                <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 font-mono text-xs font-medium text-amber-900 ring-1 ring-amber-200">{'{username}'}</span>
                <span className="inline-flex items-center rounded-md bg-purple-100 px-2 py-0.5 font-mono text-xs font-medium text-purple-900 ring-1 ring-purple-200">{'{promo_code}'}</span>
              </div>
              <p className="mt-2 text-xs text-amber-700">
                Works for <strong>Comment</strong>, <strong>DM Received</strong>, and <strong>Story Mention / Story Reply</strong> triggers. <code className="bg-amber-100/80 px-1 rounded">{'{name}'}</code> = their name, <code className="bg-amber-100/80 px-1 rounded">{'{comment}'}</code> = keyword/text that triggered, <code className="bg-amber-100/80 px-1 rounded">{'{username}'}</code> = @username, <code className="bg-purple-100/80 px-1 rounded">{'{promo_code}'}</code> = urgent coupon.
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold text-slate-800">
                  Primary Message Caption
                </label>
                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  Primary Message
                </span>
              </div>
              <MessageWithPlaceholderHighlight
                value={config.message || ""}
                onChange={(message) => setConfig({ ...config, message })}
                placeholder="e.g. Hey {name}! Thanks for your interest in &quot;{comment}&quot;. Here are the details."
                rows={4}
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
              <p className="mt-1.5 text-xs text-slate-500">
                <span className="font-medium text-blue-700">{'{name}'}</span>, <span className="font-medium text-blue-700">{'{comment}'}</span>, <span className="font-medium text-blue-700">{'{username}'}</span>, <span className="font-medium text-purple-700">{'{promo}'}</span> are replaced with real values when the DM is sent.
              </p>
              {Array.isArray(config.messageVariations) && config.messageVariations.filter((v: any) => typeof v === "string" ? v.trim() : v?.text?.trim()).length > 0 && (
                <p className="mt-1.5 text-[11px] text-amber-600 font-medium">
                  ⚠️ Variations are active below. A random variation will be sent instead of this primary message.
                </p>
              )}
            </div>

            <RichMediaSelector config={config} setConfig={setConfig} />

            <MessageVariationsSection config={config} setConfig={setConfig} />

            {/* Button Configuration - Inline Buttons (max 3) or Native Quick Replies (max 13) */}
            <div className="border-t border-slate-100 pt-6">
              {(() => {
                const buttonStyle: 'buttons' | 'quick_replies' = config.buttonStyle || 'buttons';
                const isQuickReply = buttonStyle === 'quick_replies';
                const maxButtons = isQuickReply ? 13 : 3;

                return (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-800">
                          Interactive Options
                        </label>
                        <p className="text-xs text-slate-500">
                          {isQuickReply
                            ? 'Floating pill buttons above user keyboard (max 13)'
                            : 'Inline message buttons inside chat bubble (max 3)'}
                        </p>
                      </div>

                      <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 shrink-0 self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => {
                            const trimmed = (config.buttons || []).slice(0, 3);
                            setConfig({ ...config, buttonStyle: 'buttons', buttons: trimmed });
                          }}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                            !isQuickReply
                              ? 'bg-white text-blue-600 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Inline Buttons (3)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const converted = (config.buttons || []).map((b: any) => ({
                              ...b,
                              type: 'reply',
                              url: undefined,
                            }));
                            setConfig({ ...config, buttonStyle: 'quick_replies', buttons: converted });
                          }}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                            isQuickReply
                              ? 'bg-white text-blue-600 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Quick Replies (13)
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {(config.buttons || []).map((btn: any, idx: number) => (
                        <div key={idx} className="bg-slate-50 rounded-lg p-3 border border-slate-100 relative">
                          {config.buttons && config.buttons.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newButtons = [...(config.buttons || [])];
                                newButtons.splice(idx, 1);
                                setConfig({ ...config, buttons: newButtons });
                              }}
                              className="absolute top-2 right-2 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                              title="Remove button"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                          <div className="space-y-3">
                            {isQuickReply ? (
                              <div className="flex items-center justify-between">
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                  Pill {idx + 1} (Disappearing Quick Reply)
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <label className="block text-xs font-medium text-slate-600">
                                  Button {idx + 1} Type
                                </label>
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs ${btn.type === 'reply' ? 'font-medium text-slate-900' : 'text-slate-500'}`}>Reply</span>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={btn.type === 'link'}
                                      onChange={(e) => {
                                        const newButtons = [...(config.buttons || [])];
                                        newButtons[idx] = {
                                          ...newButtons[idx],
                                          type: e.target.checked ? 'link' : 'reply',
                                          url: e.target.checked ? (newButtons[idx].url || '') : undefined,
                                          enableBranch: e.target.checked ? false : newButtons[idx].enableBranch,
                                        };
                                        setConfig({ ...config, buttons: newButtons });
                                      }}
                                      className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                                  </label>
                                  <span className={`text-xs ${btn.type === 'link' ? 'font-medium text-slate-900' : 'text-slate-500'}`}>Link</span>
                                </div>
                              </div>
                            )}

                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">
                                {isQuickReply ? 'Pill Text' : 'Button Text'} <span className="text-stone-400">(max 20 characters)</span>
                              </label>
                              <input
                                type="text"
                                value={btn.title || ""}
                                onChange={(e) => {
                                  const newButtons = [...(config.buttons || [])];
                                  newButtons[idx] = { ...newButtons[idx], title: e.target.value.substring(0, 20) };
                                  setConfig({ ...config, buttons: newButtons });
                                }}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm cursor-pointer"
                                placeholder={isQuickReply ? "e.g., Book Demo" : "e.g., Get Details"}
                                maxLength={20}
                              />
                              <p className="mt-0.5 text-xs text-stone-400">
                                {btn.title?.length || 0}/20 characters
                              </p>
                            </div>

                            {!isQuickReply && btn.type === 'link' && (
                              <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">
                                  Link URL <span className="text-stone-400">(required)</span>
                                </label>
                                <input
                                  type="url"
                                  value={btn.url || ""}
                                  onChange={(e) => {
                                    const newButtons = [...(config.buttons || [])];
                                    newButtons[idx] = { ...newButtons[idx], url: e.target.value };
                                    setConfig({ ...config, buttons: newButtons });
                                  }}
                                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm cursor-pointer"
                                  placeholder="https://example.com"
                                />
                              </div>
                            )}

                            {(isQuickReply || btn.type === 'reply') && (
                              <div className="space-y-2">
                                <p className="text-xs text-slate-500">
                                  {isQuickReply
                                    ? 'Tapping sends text into thread and dismisses all pills'
                                    : 'One tap sends this as their reply (no pop-up)'}
                                </p>
                                <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${btn.enableBranch
                                        ? idx === 0
                                          ? "bg-emerald-500"
                                          : idx === 1
                                            ? "bg-violet-500"
                                            : idx === 2
                                              ? "bg-amber-500"
                                              : idx === 3
                                                ? "bg-sky-500"
                                                : "bg-rose-500"
                                        : "bg-slate-300"
                                        }`}
                                    />
                                    <div>
                                      <span className="block text-xs font-semibold text-slate-700">
                                        Create Branch Wire
                                      </span>
                                      <span className="block text-[11px] text-slate-400">
                                        {btn.enableBranch
                                          ? "Sprouts dedicated right-side handle on canvas"
                                          : "Falls back to Default flow (data captured)"}
                                      </span>
                                    </div>
                                  </div>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(btn.enableBranch)}
                                      onChange={(e) => {
                                        const newButtons = [...(config.buttons || [])];
                                        newButtons[idx] = {
                                          ...newButtons[idx],
                                          enableBranch: e.target.checked,
                                        };
                                        setConfig({ ...config, buttons: newButtons });
                                      }}
                                      className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-200 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                                  </label>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {(!config.buttons || config.buttons.length === 0) && (
                        <button
                          type="button"
                          onClick={() => {
                            setConfig({
                              ...config,
                              buttons: [{ type: 'reply', title: '' }],
                            });
                          }}
                          className="w-full py-2 px-3 border-2 border-dashed border-slate-300 rounded-lg text-sm text-slate-600 hover:border-purple-400 hover:text-purple-600 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          {isQuickReply ? 'Add Quick Reply Pill' : 'Add Button'}
                        </button>
                      )}

                      {config.buttons && config.buttons.length > 0 && config.buttons.length < maxButtons && (
                        <button
                          type="button"
                          onClick={() => {
                            const newButtons = [...(config.buttons || []), { type: 'reply', title: '' }];
                            setConfig({ ...config, buttons: newButtons });
                          }}
                          className="w-full py-2 px-3 border-2 border-dashed border-slate-300 rounded-lg text-sm text-slate-600 hover:border-purple-400 hover:text-purple-600 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          {isQuickReply ? 'Add Another Quick Reply' : 'Add Another Button'}
                        </button>
                      )}

                      {config.buttons && config.buttons.length >= maxButtons && (
                        <p className="text-xs text-slate-400 text-center">
                          Maximum {maxButtons} {isQuickReply ? 'quick replies' : 'buttons'} allowed
                        </p>
                      )}

                      {isQuickReply ? (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                          <p className="text-xs text-blue-700">
                            <strong>Quick Replies:</strong> Float horizontally above the keyboard and disappear once tapped by the user. URLs/links are not supported on Quick Replies by Meta.
                          </p>
                        </div>
                      ) : (
                        config.buttons && config.buttons.length > 0 && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                            <p className="text-xs text-blue-700">
                              <strong>Note:</strong> Reply buttons send text as message. Link buttons open URL. Works best on mobile.
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </>
        )}
        <ActionDelayFields config={config} setConfig={setConfig} />
        <WaitForReplyFields config={config} setConfig={setConfig} />
      </div>
  );
}
