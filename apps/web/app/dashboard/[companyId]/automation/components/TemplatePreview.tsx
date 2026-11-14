"use client";

import { useState, useEffect, useRef } from "react";
import { type AutomationTemplate } from "@/lib/automation/templates";
import {
  X,
  ArrowLeft,
  Sparkles,
  Zap,
  CheckCircle,
  Play,
  RotateCcw,
  BadgeCheck,
  ChevronLeft,
  Phone,
  Video,
  Info,
  ImageIcon,
  Mic,
  Smile,
} from "lucide-react";

interface TemplatePreviewProps {
  template: AutomationTemplate;
  onBack: () => void;
  onSetUp: () => void;
}

interface SimMessage {
  id: string;
  sender: "user" | "business";
  text: string;
  buttons?: Array<{ title: string; type?: string }>;
  contextTag?: string;
}

export default function TemplatePreview({
  template,
  onBack,
  onSetUp,
}: TemplatePreviewProps) {
  const [messages, setMessages] = useState<SimMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize simulation from template data
  const initSimulation = () => {
    const initial: SimMessage[] = [];

    // Trigger context
    let triggerText = "Hi! I'm interested in this offer.";
    let contextTag = "Direct Message";

    if (template.trigger === "comment") {
      triggerText = "Love this! Where can I get the link? 🔥";
      contextTag = "Commented on post";
    } else if (template.trigger === "story") {
      triggerText = "This looks amazing! Can I get the offer? 😍";
      contextTag = "Replied to story";
    } else if (template.trigger === "follower") {
      triggerText = "Started following you!";
      contextTag = "New follower";
    }

    if (template.preview?.conversationMessages && template.preview.conversationMessages.length > 0) {
      const firstReceived = template.preview.conversationMessages.find(
        (m) => m.type === "received"
      );
      if (firstReceived?.text) {
        triggerText = firstReceived.text;
      }
    }

    initial.push({
      id: "trigger",
      sender: "user",
      text: triggerText,
      contextTag,
    });

    setMessages(initial);
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      // First bot reply
      let botText = "Thanks for reaching out! Here are the details:";
      let buttons: Array<{ title: string }> = [];

      const firstSendDM = template.nodes.find(
        (n) => n.type === "ACTION_SEND_DM" || n.type === "ACTION_REPLY_DM"
      );
      if (firstSendDM?.config?.message) {
        botText = firstSendDM.config.message
          .replace(/{name}/g, "Alex")
          .replace(/{username}/g, "alex_dev")
          .replace(/{comment}/g, "Love this!");
      } else if (template.preview?.conversationMessages) {
        const sentMsg = template.preview.conversationMessages.find(
          (m) => m.type === "sent"
        );
        if (sentMsg?.text) botText = sentMsg.text;
      }

      if (firstSendDM?.config?.buttons && Array.isArray(firstSendDM.config.buttons) && firstSendDM.config.buttons.length > 0) {
        buttons = firstSendDM.config.buttons.map((b: any) => ({
          title: b.title || b.text || "Option",
        }));
      } else if (template.preview?.conversationMessages) {
        const buttonMsg = template.preview.conversationMessages.find(
          (m) => m.type === "buttons"
        );
        if (buttonMsg?.buttons && Array.isArray(buttonMsg.buttons)) {
          buttons = buttonMsg.buttons.map((btn: any) => ({
            title: typeof btn === "string" ? btn : btn?.title || "Option",
          }));
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: "bot-1",
          sender: "business",
          text: botText,
          buttons,
        },
      ]);
    }, 600);
  };

  useEffect(() => {
    initSimulation();
  }, [template]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onBack();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onBack]);

  const handleButtonClick = (buttonTitle: string) => {
    const userMsg: SimMessage = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text: buttonTitle,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      // Secondary bot response
      const secondSendDM = template.nodes.filter(
        (n) => n.type === "ACTION_SEND_DM" || n.type === "ACTION_REPLY_DM"
      )[1];

      let replyText = `Awesome! Here is your access for ${buttonTitle}: https://instance.sale/exclusive-link`;
      if (secondSendDM?.config?.message) {
        replyText = secondSendDM.config.message;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `bot-2-${Date.now()}`,
          sender: "business",
          text: replyText,
        },
      ]);
    }, 650);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onBack();
      }}
    >
      <div
        className="relative w-full max-w-5xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col lg:flex-row max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onBack}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl z-20 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Side: Template Info */}
        <div className="flex-1 p-6 sm:p-8 overflow-y-auto flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-100">
          <div className="space-y-6">
            {/* Header Badge */}
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white">
                <Sparkles className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Instagram Template
              </span>
              {template.badge && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-700">
                  {template.badge}
                </span>
              )}
            </div>

            {/* Title & Description */}
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {template.title}
              </h2>
              <p className="text-base text-slate-600 mt-2 leading-relaxed">
                {template.description}
              </p>
            </div>

            {/* Business Value */}
            {template.preview?.businessValue && (
              <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-100/80">
                <div className="flex items-center gap-2 text-blue-800 font-bold text-xs uppercase tracking-wider mb-1">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Business Impact</span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {template.preview.businessValue}
                </p>
              </div>
            )}

            {/* How does it work */}
            {template.preview?.howItWorks && (
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-900">How it works:</h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {template.preview.howItWorks}
                </p>
              </div>
            )}

            {/* Included Steps Checklist */}
            <div className="space-y-2.5 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Included Flow Steps ({template.nodes.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                {template.nodes.map((node, i) => {
                  const stepLabels: Record<string, string> = {
                    TRIGGER_DM: "DM Received",
                    TRIGGER_COMMENT: "Comment Trigger",
                    TRIGGER_STORY: "Story Mention / Reply",
                    TRIGGER_FOLLOWER: "Follower Check",
                    ACTION_SEND_DM: "Send Direct Message",
                    ACTION_REPLY_DM: "Reply in DM",
                    ACTION_REPLY_COMMENT: "Reply to Comment",
                    ACTION_CONDITION: "Branch Condition",
                    ACTION_SET_VARIABLE: "Set Tag / Variable",
                    FLOW_SPLIT: "Split Flow",
                    FLOW_RANDOM: "Randomizer (A/B)",
                    ACTION_WAIT: "Wait Delay",
                    FLOW_END: "End Flow",
                  };
                  const label = stepLabels[node.type] || node.type.replace(/_/g, " ").toLowerCase();

                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200/60"
                    >
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="truncate font-medium capitalize">
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to templates</span>
            </button>
            <button
              type="button"
              onClick={onSetUp}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              Set Up Template →
            </button>
          </div>
        </div>

        {/* Right Side: Realistic iPhone Simulator Preview */}
        <div className="w-full lg:w-[410px] bg-slate-100 p-6 flex flex-col items-center justify-center shrink-0">
          <div className="flex items-center justify-between w-full max-w-[310px] mb-2 px-1 text-xs text-slate-500">
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <Play className="w-3 h-3 text-blue-500" /> Live Interactive Preview
            </span>
            <button
              type="button"
              onClick={initSimulation}
              className="hover:text-blue-600 transition-colors flex items-center gap-1 cursor-pointer"
              title="Reset simulation"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          {/* iPhone Mockup Frame */}
          <div className="relative w-[305px] h-[580px] bg-[#1a1a1a] rounded-[44px] p-[8px] shadow-2xl ring-1 ring-white/10 select-none">
            <div className="w-full h-full bg-white rounded-[36px] overflow-hidden flex flex-col relative border border-black/40">
              {/* Dynamic Island */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 w-20 h-4 bg-black rounded-full" />

              {/* Status bar */}
              <div className="h-7 px-5 pt-1.5 flex items-center justify-between text-[10px] font-bold text-black shrink-0 bg-white">
                <span>9:41</span>
                <div className="flex items-center gap-1">
                  <span>5G</span>
                  <div className="w-3.5 h-1.5 border border-black rounded-xs p-[0.5px]">
                    <div className="w-full h-full bg-black rounded-xs" />
                  </div>
                </div>
              </div>

              {/* Instagram Header */}
              <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <ChevronLeft className="w-5 h-5 text-black -ml-1" />
                  <div className="w-7 h-7 rounded-full p-[1px] bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] shrink-0">
                    <div className="w-full h-full rounded-full bg-slate-900 text-white flex items-center justify-center text-[9px] font-bold border border-white">
                      IN
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-[11px] text-black truncate">
                        instance.sale
                      </span>
                      <BadgeCheck className="w-3 h-3 text-blue-500 fill-blue-500 shrink-0" />
                    </div>
                    <span className="text-[9px] text-slate-400 block leading-none">
                      Active now
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <Phone className="w-3.5 h-3.5" />
                  <Video className="w-3.5 h-3.5" />
                  <Info className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Messages Viewport */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-white min-h-0 text-[11px]">
                {messages.map((m) => {
                  const isBiz = m.sender === "business";
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${
                        isBiz ? "items-start" : "items-end"
                      } space-y-1 animate-in fade-in duration-200`}
                    >
                      {m.contextTag && (
                        <div className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[9px] font-medium flex items-center gap-1 self-center">
                          <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                          <span>{m.contextTag}</span>
                        </div>
                      )}

                      <div
                        className={`px-3 py-2 rounded-[18px] max-w-[85%] leading-relaxed ${
                          isBiz
                            ? "bg-[#efefef] text-black rounded-bl-xs"
                            : "bg-gradient-to-r from-[#5956e9] to-[#3797f0] text-white rounded-br-xs"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{m.text}</p>
                      </div>

                      {/* Interactive Buttons */}
                      {isBiz && m.buttons && m.buttons.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1 max-w-[90%]">
                          {m.buttons.map((btn, bI) => (
                            <button
                              key={bI}
                              type="button"
                              onClick={() => handleButtonClick(btn.title)}
                              className="px-2.5 py-1 bg-white border border-[#3797f0] text-[#3797f0] hover:bg-[#3797f0]/5 rounded-full text-[10px] font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
                            >
                              {btn.title}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {isTyping && (
                  <div className="flex items-center gap-1 px-3 py-2 bg-[#efefef] rounded-[18px] rounded-bl-xs w-12">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]" />
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Bottom input bar */}
              <div className="p-2 border-t border-slate-100 bg-white shrink-0">
                <div className="flex items-center gap-1.5 bg-[#efefef] rounded-full px-3 py-1 text-[11px] text-slate-400">
                  <ImageIcon className="w-3.5 h-3.5 text-[#3797f0]" />
                  <span className="flex-1">Message...</span>
                  <Mic className="w-3.5 h-3.5" />
                  <Smile className="w-3.5 h-3.5" />
                </div>
                <div className="w-20 h-1 bg-black/70 rounded-full mx-auto mt-1.5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}