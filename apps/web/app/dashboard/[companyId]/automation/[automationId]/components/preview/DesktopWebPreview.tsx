"use client";

import React from "react";
import {
  BadgeCheck,
  Clapperboard,
  Heart,
  Home,
  Info,
  Lock,
  MessageCircle,
  Mic,
  Image as ImageIcon,
  Phone,
  Search,
  Smile,
  Sparkles,
  User,
  Video,
} from "lucide-react";
import { ChatButton, ChatMessage } from "./types";

interface DesktopWebPreviewProps {
  userName?: string;
  userProfilePicture?: string;
  messages: ChatMessage[];
  isTyping: boolean;
  customInput: string;
  setCustomInput: (val: string) => void;
  handleSendMessage: (e: React.FormEvent) => void;
  handleButtonClick: (btn: ChatButton) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export function DesktopWebPreview({
  userName = "instance",
  userProfilePicture,
  messages,
  isTyping,
  customInput,
  setCustomInput,
  handleSendMessage,
  handleButtonClick,
  messagesEndRef,
}: DesktopWebPreviewProps) {
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
          <div className="w-[min(94vw,1100px)] h-[min(82vh,780px)] bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
            {/* Top Browser Bar */}
            <div className="bg-slate-50 px-4 py-2 flex items-center justify-between text-xs text-slate-600 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2 font-mono text-[11px] bg-white px-3 py-1 rounded-lg border border-slate-200 text-slate-700 shadow-2xs">
                <Lock className="w-3 h-3 text-emerald-600 shrink-0" />
                <span className="truncate">instagram.com/direct/t/{userName.replace(/\s+/g, "").toLowerCase()}</span>
              </div>
              <span className="text-slate-400 font-medium text-[10px]">Desktop Web DM</span>
            </div>

            {/* Desktop Direct Layout: Narrow rail + Chat */}
            <div className="flex flex-1 min-h-0 bg-white">
              {/* Instagram Left Navigation Icons Rail */}
              <aside className="w-16 border-r border-slate-200 bg-white flex flex-col items-center py-6 gap-6 text-slate-800 shrink-0">
                <Home className="w-5 h-5 opacity-80 hover:opacity-100 cursor-pointer" />
                <Search className="w-5 h-5 opacity-80 hover:opacity-100 cursor-pointer" />
                <Clapperboard className="w-5 h-5 opacity-80 hover:opacity-100 cursor-pointer" />
                <div className="p-2 bg-slate-100 rounded-xl text-blue-600">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <Heart className="w-5 h-5 opacity-80 hover:opacity-100 cursor-pointer" />
                <User className="w-5 h-5 opacity-80 hover:opacity-100 cursor-pointer mt-auto" />
              </aside>

              {/* Chat Window */}
              <div className="flex-1 flex flex-col min-w-0 bg-white">
                {/* Header */}
                <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full p-[1.5px] bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]">
                        {userProfilePicture ? (
                          <img
                            src={userProfilePicture}
                            alt={userName}
                            className="w-full h-full rounded-full object-cover border-2 border-white"
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs border-2 border-white">
                            {userName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-slate-900">{userName}</span>
                        <BadgeCheck className="w-4 h-4 text-blue-500 fill-blue-500" />
                      </div>
                      <span className="text-xs text-slate-400">Active now</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-slate-700">
                    <Phone className="w-4 h-4 cursor-pointer hover:text-black" />
                    <Video className="w-4 h-4 cursor-pointer hover:text-black" />
                    <Info className="w-4 h-4 cursor-pointer hover:text-black" />
                  </div>
                </div>

                {/* Messages Viewport */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 bg-white min-h-0">
                  {messages.map((msg) => {
                    const isBusiness = msg.sender === "business";

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isBusiness ? "items-start" : "items-end"
                          } space-y-1.5`}
                      >
                        {msg.contextTag && (
                          <div className="px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-medium flex items-center gap-1.5 mb-1">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            <span>{msg.contextTag}</span>
                          </div>
                        )}

                        {(msg.text || msg.mediaUrl) && (
                          <div className="flex items-end gap-2.5 max-w-[70%]">
                            {isBusiness && (
                              <div className="w-7 h-7 rounded-full bg-slate-200 shrink-0 overflow-hidden mb-1">
                                {userProfilePicture ? (
                                  <img
                                    src={userProfilePicture}
                                    alt="Bot"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-[11px] font-bold">
                                    {userName.slice(0, 1).toUpperCase()}
                                  </div>
                                )}
                              </div>
                            )}

                            <div
                              className={`px-4 py-3 text-sm leading-relaxed rounded-[20px] shadow-xs select-text ${isBusiness
                                ? "bg-[#efefef] text-[#000000] rounded-bl-sm"
                                : "bg-gradient-to-r from-[#5956e9] to-[#3797f0] text-white rounded-br-sm"
                                }`}
                            >
                              <p className="whitespace-pre-wrap">{msg.text}</p>
                            </div>
                          </div>
                        )}

                        {/* Interactive Carousel Cards Deck in Desktop */}
                        {isBusiness && msg.carouselCards && msg.carouselCards.length > 0 && (
                          <div className="w-full pl-9 overflow-hidden">
                            <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-none snap-x">
                              {msg.carouselCards.map((card, cIdx) => (
                                <div
                                  key={card.id || cIdx}
                                  className="shrink-0 w-[220px] rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden snap-start flex flex-col"
                                >
                                  {card.imageUrl ? (
                                    <div className="w-full h-[125px] bg-slate-100 overflow-hidden relative">
                                      <img
                                        src={card.imageUrl}
                                        alt={card.title}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-full h-[125px] bg-slate-100 flex items-center justify-center text-slate-400">
                                      <ImageIcon className="w-6 h-6 stroke-[1.5]" />
                                    </div>
                                  )}
                                  <div className="p-3 flex-1 flex flex-col justify-between">
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
                                      <div className="mt-3 pt-2 border-t border-slate-100 space-y-1.5">
                                        {card.buttons.map((btn, bIdx) => (
                                          <button
                                            key={bIdx}
                                            type="button"
                                            onClick={() => handleButtonClick(btn)}
                                            className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold text-[#3797f0] hover:bg-[#3797f0]/10 border border-[#3797f0]/30 transition-colors text-center cursor-pointer flex items-center justify-center gap-1"
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

                        {/* Buttons in Desktop (Inline message buttons) */}
                        {isBusiness && msg.buttons && msg.buttons.length > 0 && msg.buttonStyle !== "quick_replies" && (
                          <div className="flex flex-wrap gap-2 pt-1 pl-9">
                            {msg.buttons.map((btn, bIdx) => (
                              <button
                                key={bIdx}
                                type="button"
                                onClick={() => handleButtonClick(btn)}
                                className="px-4 py-2 bg-white border border-[#3797f0]/50 hover:border-[#3797f0] text-[#3797f0] hover:bg-[#3797f0]/5 rounded-full text-xs font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer flex items-center gap-1"
                              >
                                <span>{btn.title}</span>
                                {btn.type === "url" && <span>↗</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {isTyping && (
                    <div className="flex items-center gap-2 pl-9">
                      <div className="w-7 h-7 rounded-full bg-slate-200 shrink-0 overflow-hidden">
                        {userProfilePicture ? (
                          <img
                            src={userProfilePicture}
                            alt="Bot"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-[11px] font-bold">
                            {userName.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="px-4 py-3 bg-[#efefef] rounded-[20px] rounded-bl-sm flex items-center gap-1.5 shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" />
                        <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]" />
                        <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Floating Quick Replies Pill Bar in Desktop */}
                {activeQuickReplies.length > 0 && (
                  <div className="px-4 py-2.5 bg-white border-t border-slate-200 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
                    {activeQuickReplies.map((btn, qIdx) => (
                      <button
                        key={qIdx}
                        type="button"
                        onClick={() => handleButtonClick(btn)}
                        className="px-4 py-2 bg-white border border-[#3797f0] text-[#3797f0] hover:bg-[#3797f0] hover:text-white rounded-full text-xs font-semibold shadow-xs whitespace-nowrap transition-all shrink-0 cursor-pointer"
                      >
                        {btn.title}
                      </button>
                    ))}
                  </div>
                )}

                {/* Desktop Input */}
                <div className="p-4 border-t border-slate-200 bg-white shrink-0">
                  <form
                    onSubmit={handleSendMessage}
                    className="flex items-center gap-3 bg-[#efefef] rounded-full px-5 py-2.5 border border-slate-200/80"
                  >
                    <input
                      type="text"
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder="Message (type and press Enter to test)..."
                      className="flex-1 bg-transparent text-sm text-black placeholder:text-slate-400 focus:outline-none"
                    />

                    {customInput.trim() ? (
                      <button
                        type="submit"
                        className="text-[#3797f0] font-bold text-sm hover:opacity-80 transition-opacity cursor-pointer"
                      >
                        Send
                      </button>
                    ) : (
                      <div className="flex items-center gap-3 text-slate-500">
                        <Smile className="w-5 h-5 cursor-pointer hover:text-black" />
                        <Mic className="w-5 h-5 cursor-pointer hover:text-black" />
                      </div>
                    )}
                  </form>
                </div>
              </div>
            </div>
          </div>
  );
}
