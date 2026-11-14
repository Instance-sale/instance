"use client";

import React from "react";
import {
  BadgeCheck,
  ChevronLeft,
  Image as ImageIcon,
  Info,
  Mic,
  Phone,
  Smile,
  Sparkles,
  Video,
} from "lucide-react";
import { ChatButton, ChatMessage } from "./types";

interface MobilePhonePreviewProps {
  userName?: string;
  userProfilePicture?: string;
  messages: ChatMessage[];
  isTyping: boolean;
  customInput: string;
  setCustomInput: (val: string) => void;
  handleSendMessage: (e: React.FormEvent) => void;
  handleButtonClick: (btn: ChatButton) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onClose?: () => void;
}

export function MobilePhonePreview({
  userName = "instance",
  userProfilePicture,
  messages,
  isTyping,
  customInput,
  setCustomInput,
  handleSendMessage,
  handleButtonClick,
  messagesEndRef,
  onClose,
}: MobilePhonePreviewProps) {
  const activeQuickReplies = (() => {
    const lastMsg = messages[messages.length - 1];
    if (
      lastMsg &&
      lastMsg.sender === "business" &&
      lastMsg.buttonStyle === "quick_replies" &&
      Array.isArray(lastMsg.buttons) &&
      lastMsg.buttons.length > 0
    ) {
      return lastMsg.buttons;
    }
    return [];
  })();

  return (
          <div className="relative shrink-0 select-none">
            {/* iPhone Chassis Outer Ring */}
            <div className="relative w-[360px] sm:w-[385px] h-[740px] sm:h-[780px] bg-[#1c1c1e] rounded-[52px] p-[10px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] ring-1 ring-white/20 ring-inset">
              {/* Screen Bezel */}
              <div className="w-full h-full bg-white rounded-[44px] overflow-hidden flex flex-col relative border border-black/40">
                {/* Dynamic Island Pill */}
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-30 w-[108px] h-[26px] bg-black rounded-full flex items-center justify-between px-2.5 shadow-md">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#0a0a0a] ring-1 ring-white/10" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#111] ring-1 ring-white/10" />
                </div>

                {/* iOS Status Bar */}
                <div className="h-10 pt-2 px-7 flex items-center justify-between text-[13px] font-semibold text-black shrink-0 bg-white z-20">
                  <span className="tracking-tight">9:41</span>
                  <div className="flex items-center gap-1.5 text-black">
                    <span className="text-[10px] tracking-tighter font-mono">5G</span>
                    {/* Signal bars */}
                    <div className="flex items-end gap-[1.5px] h-3">
                      <div className="w-[3px] h-1.5 bg-black rounded-xs" />
                      <div className="w-[3px] h-2 bg-black rounded-xs" />
                      <div className="w-[3px] h-2.5 bg-black rounded-xs" />
                      <div className="w-[3px] h-3 bg-black rounded-xs" />
                    </div>
                    {/* Battery icon */}
                    <div className="w-5 h-2.5 rounded-[4px] border border-black p-[1px] flex items-center">
                      <div className="w-full h-full bg-black rounded-[2px]" />
                    </div>
                  </div>
                </div>

                {/* Instagram Direct Header */}
                <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0 z-10 shadow-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={onClose}
                      className="p-1 -ml-1 text-black hover:opacity-70 transition-opacity cursor-pointer"
                    >
                      <ChevronLeft className="w-6 h-6 stroke-[2.2]" />
                    </button>

                    {/* Profile avatar with story ring */}
                    <div className="relative shrink-0">
                      <div className="w-9 h-9 rounded-full p-[1.5px] bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]">
                        {userProfilePicture ? (
                          <img
                            src={userProfilePicture}
                            alt={userName}
                            className="w-full h-full rounded-full object-cover border-2 border-white"
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs border-2 border-white">
                            {userName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-xs text-black truncate leading-tight">
                          {userName}
                        </span>
                        <BadgeCheck className="w-3.5 h-3.5 text-blue-500 fill-blue-500 shrink-0" />
                      </div>
                      <span className="text-[10px] text-slate-400 block leading-tight">
                        Active now
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5 text-black pr-1">
                    <Phone className="w-4 h-4 opacity-80 cursor-pointer hover:opacity-100" />
                    <Video className="w-4 h-4 opacity-80 cursor-pointer hover:opacity-100" />
                    <Info className="w-4 h-4 opacity-80 cursor-pointer hover:opacity-100" />
                  </div>
                </div>

                {/* Chat Body */}
                <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-3 bg-[#ffffff] min-h-0">
                  <div className="text-center my-1">
                    <span className="text-[10px] text-slate-400 font-medium">
                      Today 9:41 AM
                    </span>
                  </div>

                  {messages.map((msg) => {
                    const isBusiness = msg.sender === "business";

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isBusiness ? "items-start" : "items-end"
                          } space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200`}
                      >
                        {/* Context pill if triggered from comment/story */}
                        {msg.contextTag && (
                          <div className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-medium flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            <span>{msg.contextTag}</span>
                          </div>
                        )}

                        <div className="flex items-end gap-2 max-w-[84%]">
                          {isBusiness && (
                            <div className="w-6 h-6 rounded-full bg-slate-200 shrink-0 overflow-hidden mb-0.5">
                              {userProfilePicture ? (
                                <img
                                  src={userProfilePicture}
                                  alt="Bot"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold">
                                  {userName.slice(0, 1).toUpperCase()}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Message Bubble */}
                          {(msg.text || msg.mediaUrl || msg.mediaType === "AUDIO" || msg.mediaType === "FILE") && (
                            <div
                              className={`px-3.5 py-2.5 text-[13px] leading-relaxed break-words shadow-xs select-text ${isBusiness
                                ? "bg-[#efefef] text-[#000000] rounded-[20px] rounded-bl-sm"
                                : "bg-gradient-to-r from-[#5956e9] to-[#3797f0] text-white rounded-[20px] rounded-br-sm"
                                }`}
                            >
                              {msg.mediaType === "AUDIO" && (
                                <div className="flex items-center gap-2.5 pb-2 mb-1.5 border-b border-black/10">
                                  <div className="w-7 h-7 rounded-full bg-[#3797f0] text-white flex items-center justify-center text-xs">
                                    ▶
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-0.5 h-3">
                                      {[8, 14, 20, 10, 16, 22, 12, 18, 6, 15, 20, 10].map((h, i) => (
                                        <div key={i} className="w-1 bg-[#3797f0] rounded-full" style={{ height: `${h}px` }} />
                                      ))}
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-mono">0:24 • Voice Memo</span>
                                  </div>
                                </div>
                              )}

                              {msg.mediaType === "FILE" && (
                                <div className="flex items-center gap-2 pb-2 mb-1.5 border-b border-black/10">
                                  <span className="text-xl">📄</span>
                                  <div className="flex-1 overflow-hidden">
                                    <span className="font-semibold text-xs block truncate">Document Attachment</span>
                                    <span className="text-[10px] text-slate-500">Tap to download</span>
                                  </div>
                                </div>
                              )}

                              {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                            </div>
                          )}
                        </div>

                        {/* Interactive Carousel Cards Deck */}
                        {isBusiness && msg.carouselCards && msg.carouselCards.length > 0 && (
                          <div className="w-full pl-8 overflow-hidden">
                            <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none snap-x">
                              {msg.carouselCards.map((card, cIdx) => (
                                <div
                                  key={card.id || cIdx}
                                  className="shrink-0 w-[205px] rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden snap-start flex flex-col"
                                >
                                  {card.imageUrl ? (
                                    <div className="w-full h-[115px] bg-slate-100 overflow-hidden relative">
                                      <img
                                        src={card.imageUrl}
                                        alt={card.title}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-full h-[115px] bg-slate-100 flex items-center justify-center text-slate-400">
                                      <ImageIcon className="w-6 h-6 stroke-[1.5]" />
                                    </div>
                                  )}
                                  <div className="p-2.5 flex-1 flex flex-col justify-between">
                                    <div>
                                      <h4 className="text-xs font-semibold text-slate-900 line-clamp-1">
                                        {card.title}
                                      </h4>
                                      {card.subtitle && (
                                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-tight">
                                          {card.subtitle}
                                        </p>
                                      )}
                                    </div>

                                    {card.buttons && card.buttons.length > 0 && (
                                      <div className="mt-2.5 pt-1.5 border-t border-slate-100 space-y-1">
                                        {card.buttons.map((btn, bIdx) => (
                                          <button
                                            key={bIdx}
                                            type="button"
                                            onClick={() => handleButtonClick(btn)}
                                            className="w-full py-1.5 px-2 rounded-lg text-xs font-semibold text-[#3797f0] hover:bg-[#3797f0]/10 border border-[#3797f0]/30 transition-colors text-center cursor-pointer flex items-center justify-center gap-1"
                                          >
                                            <span className="truncate">{btn.title}</span>
                                            {(btn.type === "url" || btn.type === "link") && (
                                              <span className="text-[10px] opacity-70">↗</span>
                                            )}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Interactive Buttons (Inline Buttons inside chat bubble) */}
                        {isBusiness && msg.buttons && msg.buttons.length > 0 && msg.buttonStyle !== "quick_replies" && (
                          <div className="flex flex-wrap gap-1.5 pt-1 pl-8 max-w-[90%]">
                            {msg.buttons.map((btn, bIdx) => (
                              <button
                                key={bIdx}
                                type="button"
                                onClick={() => handleButtonClick(btn)}
                                className="group/btn px-3 py-1.5 bg-white border border-[#3797f0]/40 hover:border-[#3797f0] text-[#3797f0] hover:bg-[#3797f0]/5 rounded-full text-xs font-semibold shadow-xs hover:shadow-sm transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center gap-1"
                              >
                                <span>{btn.title}</span>
                                {btn.type === "url" && (
                                  <span className="text-[10px] opacity-70">↗</span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Typing Indicator */}
                  {isTyping && (
                    <div className="flex items-end gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 shrink-0 mb-0.5 overflow-hidden">
                        <div className="w-full h-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold">
                          {userName.slice(0, 1).toUpperCase()}
                        </div>
                      </div>
                      <div className="px-3.5 py-2.5 bg-[#efefef] rounded-[20px] rounded-bl-sm flex items-center gap-1 shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Floating Quick Replies Pill Bar (Native Instagram pills floating above keyboard) */}
                {activeQuickReplies.length > 0 && (
                  <div className="px-3 py-2 bg-white/95 backdrop-blur-xs border-t border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 z-10">
                    {activeQuickReplies.map((btn, qIdx) => (
                      <button
                        key={qIdx}
                        type="button"
                        onClick={() => handleButtonClick(btn)}
                        className="px-3.5 py-1.5 bg-white border border-[#3797f0] text-[#3797f0] hover:bg-[#3797f0] hover:text-white rounded-full text-xs font-semibold shadow-xs whitespace-nowrap transition-all shrink-0 cursor-pointer"
                      >
                        {btn.title}
                      </button>
                    ))}
                  </div>
                )}

                {/* Instagram Bottom Input Bar */}
                <div className="p-2.5 bg-white border-t border-slate-100 shrink-0">
                  <form
                    onSubmit={handleSendMessage}
                    className="flex items-center gap-2 bg-[#efefef] rounded-full px-3.5 py-1.5 border border-slate-200/60"
                  >
                    <div className="w-6 h-6 rounded-full bg-[#3797f0] flex items-center justify-center text-white shrink-0 cursor-pointer">
                      <ImageIcon className="w-3.5 h-3.5" />
                    </div>

                    <input
                      type="text"
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder="Message..."
                      className="flex-1 bg-transparent text-xs text-black placeholder:text-slate-400 focus:outline-none"
                    />

                    {customInput.trim() ? (
                      <button
                        type="submit"
                        className="text-[#3797f0] font-bold text-xs hover:opacity-80 transition-opacity cursor-pointer shrink-0"
                      >
                        Send
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-500 shrink-0">
                        <Mic className="w-4 h-4 cursor-pointer hover:text-black" />
                        <Smile className="w-4 h-4 cursor-pointer hover:text-black" />
                      </div>
                    )}
                  </form>
                  {/* iOS Home Indicator Bar */}
                  <div className="w-32 h-1 bg-black/80 rounded-full mx-auto mt-2" />
                </div>
              </div>
            </div>
          </div>
  );
}
