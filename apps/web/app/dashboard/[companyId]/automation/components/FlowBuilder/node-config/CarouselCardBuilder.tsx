"use client";

import React, { useState } from "react";
import {
  Plus,
  Trash2,
  Image as ImageIcon,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Layers,
} from "lucide-react";
import { DmCarouselCard, DmCarouselButton } from "@instance/types";

interface CarouselCardBuilderProps {
  config: Record<string, any>;
  setConfig: (config: any) => void;
}

const DEFAULT_CARDS: DmCarouselCard[] = [
  {
    id: "card-1",
    title: "Welcome Offer",
    subtitle: "Swipe to explore our top picks",
    imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80",
    buttons: [
      { type: "link", title: "Shop Now", url: "https://example.com/shop" },
      { type: "reply", title: "Learn More" },
    ],
  },
  {
    id: "card-2",
    title: "Exclusive Deal",
    subtitle: "Get 20% off your first order",
    imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
    buttons: [
      { type: "link", title: "Claim Code", url: "https://example.com/deal" },
      { type: "reply", title: "Contact Us" },
    ],
  },
];

export function CarouselCardBuilder({ config, setConfig }: CarouselCardBuilderProps) {
  const cards: DmCarouselCard[] = Array.isArray(config.carouselCards) && config.carouselCards.length > 0
    ? config.carouselCards
    : DEFAULT_CARDS;

  const [activeCardIndex, setActiveCardIndex] = useState<number>(0);

  const safeIndex = Math.min(Math.max(activeCardIndex, 0), Math.max(cards.length - 1, 0));
  const currentCard = cards[safeIndex] || cards[0];

  const updateCards = (newCards: DmCarouselCard[]) => {
    setConfig({
      ...config,
      messageFormat: "carousel",
      carouselCards: newCards,
    });
  };

  const handleAddCard = () => {
    if (cards.length >= 10) return;
    const newId = `card-${Date.now()}`;
    const newCard: DmCarouselCard = {
      id: newId,
      title: `Item #${cards.length + 1}`,
      subtitle: "Discover features and pricing",
      imageUrl: "",
      buttons: [{ type: "reply", title: "Select Option" }],
    };
    const nextCards = [...cards, newCard];
    updateCards(nextCards);
    setActiveCardIndex(nextCards.length - 1);
  };

  const handleDeleteCard = (idx: number) => {
    if (cards.length <= 1) return;
    const nextCards = cards.filter((_, i) => i !== idx);
    updateCards(nextCards);
    if (safeIndex >= nextCards.length) {
      setActiveCardIndex(nextCards.length - 1);
    }
  };

  const handleUpdateCurrentCard = (updates: Partial<DmCarouselCard>) => {
    const nextCards = cards.map((c, i) => (i === safeIndex ? { ...c, ...updates } : c));
    updateCards(nextCards);
  };

  const handleAddButton = () => {
    if (!currentCard || (currentCard.buttons && currentCard.buttons.length >= 3)) return;
    const nextButtons: DmCarouselButton[] = [
      ...(currentCard.buttons || []),
      { type: "reply", title: "Quick Action" },
    ];
    handleUpdateCurrentCard({ buttons: nextButtons });
  };

  const handleUpdateButton = (bIdx: number, updates: Partial<DmCarouselButton>) => {
    if (!currentCard) return;
    const nextButtons = (currentCard.buttons || []).map((b, i) =>
      i === bIdx ? { ...b, ...updates } : b,
    );
    handleUpdateCurrentCard({ buttons: nextButtons });
  };

  const handleDeleteButton = (bIdx: number) => {
    if (!currentCard) return;
    const nextButtons = (currentCard.buttons || []).filter((_, i) => i !== bIdx);
    handleUpdateCurrentCard({ buttons: nextButtons });
  };

  // Validation diagnostics
  const validationErrors: string[] = [];
  if (cards.length < 1) {
    validationErrors.push("Instagram requires at least 1 card.");
  }
  cards.forEach((c, idx) => {
    if (!c.title || !c.title.trim()) {
      validationErrors.push(`Card #${idx + 1} is missing a title.`);
    }
    if (!c.imageUrl || !c.imageUrl.trim()) {
      validationErrors.push(`Card #${idx + 1} is missing an image URL.`);
    }
    if (!c.buttons || c.buttons.length === 0) {
      validationErrors.push(`Card #${idx + 1} needs at least 1 interactive button.`);
    }
    (c.buttons || []).forEach((b, bIdx) => {
      if (b.type === "link" && (!b.url || !b.url.trim())) {
        validationErrors.push(`Card #${idx + 1} button #${bIdx + 1} is missing a link URL.`);
      }
    });
  });

  return (
    <div className="space-y-4">
      {/* Intro info box */}
      <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-3.5">
        <div className="flex items-start gap-2.5">
          <Layers className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
          <div className="text-xs text-indigo-900 leading-relaxed">
            <span className="font-semibold text-indigo-950">Interactive Carousel &amp; Cards</span>
            <p className="mt-0.5 text-indigo-800">
              Sends an interactive swipeable deck directly inside Instagram DM (1 to 10 cards). Each card has an image, title, subtitle, and up to 3 buttons.
            </p>
          </div>
        </div>
      </div>

      {/* Validation status badge */}
      {validationErrors.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold">Carousel Requirements:</span>
            <ul className="mt-1 list-disc list-inside space-y-0.5 text-amber-800">
              {validationErrors.slice(0, 3).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
              {validationErrors.length > 3 && (
                <li>...and {validationErrors.length - 3} more issue(s)</li>
              )}
            </ul>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-2.5 text-xs text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Carousel valid: <strong>{cards.length} {cards.length === 1 ? 'card' : 'cards'}</strong> ready to send.
          </span>
        </div>
      )}

      {/* Card Tabs Bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
            Cards ({cards.length}/10)
          </label>
          <button
            type="button"
            onClick={handleAddCard}
            disabled={cards.length >= 10}
            className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md border transition-colors ${
              cards.length >= 10
                ? "border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed"
                : "border-indigo-200 text-indigo-700 bg-indigo-50/60 hover:bg-indigo-100 cursor-pointer"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Card
          </button>
        </div>

        {/* Scrollable list of cards */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {cards.map((card, idx) => {
            const isSelected = idx === safeIndex;
            return (
              <button
                key={card.id || idx}
                type="button"
                onClick={() => setActiveCardIndex(idx)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span>Card {idx + 1}</span>
                {card.title && (
                  <span
                    className={`max-w-[70px] truncate opacity-80 text-[11px] font-normal ${
                      isSelected ? "text-indigo-100" : "text-slate-500"
                    }`}
                  >
                    • {card.title}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Card Configuration Panel */}
      {currentCard && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs">
                {safeIndex + 1}
              </span>
              <span className="text-sm font-semibold text-slate-900">
                Card #{safeIndex + 1} Settings
              </span>
            </div>

            {cards.length > 2 && (
              <button
                type="button"
                onClick={() => handleDeleteCard(safeIndex)}
                className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-medium cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove Card
              </button>
            )}
          </div>

          {/* Card Image */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Image URL <span className="text-rose-500">*</span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="url"
                  value={currentCard.imageUrl || ""}
                  onChange={(e) => handleUpdateCurrentCard({ imageUrl: e.target.value })}
                  placeholder="https://example.com/product-image.jpg"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-900"
                />
              </div>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Must be a public HTTPS image URL (.jpg, .png). Square 1:1 or 1.91:1 ratio looks best.
            </p>

            {/* Thumbnail Preview */}
            {currentCard.imageUrl && (
              <div className="mt-2 relative w-full h-28 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                <img
                  src={currentCard.imageUrl}
                  alt={currentCard.title || "Card preview"}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              </div>
            )}
          </div>

          {/* Card Title */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Card Title <span className="text-rose-500">*</span>
              </label>
              <span
                className={`text-[11px] font-mono ${
                  (currentCard.title || "").length > 80 ? "text-rose-600 font-bold" : "text-slate-400"
                }`}
              >
                {(currentCard.title || "").length}/80
              </span>
            </div>
            <input
              type="text"
              maxLength={80}
              value={currentCard.title || ""}
              onChange={(e) => handleUpdateCurrentCard({ title: e.target.value })}
              placeholder="e.g. Premium Sneaker Collection"
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-900 font-medium"
            />
          </div>

          {/* Card Subtitle */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Subtitle / Description
              </label>
              <span
                className={`text-[11px] font-mono ${
                  (currentCard.subtitle || "").length > 80 ? "text-rose-600 font-bold" : "text-slate-400"
                }`}
              >
                {(currentCard.subtitle || "").length}/80
              </span>
            </div>
            <input
              type="text"
              maxLength={80}
              value={currentCard.subtitle || ""}
              onChange={(e) => handleUpdateCurrentCard({ subtitle: e.target.value })}
              placeholder="e.g. Free shipping on orders over $50"
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-900"
            />
          </div>

          {/* Interactive Card Buttons (Up to 3) */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-semibold text-slate-700">
                Buttons ({currentCard.buttons?.length || 0}/3)
              </label>
              <button
                type="button"
                onClick={handleAddButton}
                disabled={(currentCard.buttons?.length || 0) >= 3}
                className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md border ${
                  (currentCard.buttons?.length || 0) >= 3
                    ? "border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed"
                    : "border-indigo-200 text-indigo-700 bg-indigo-50/60 hover:bg-indigo-100 cursor-pointer"
                }`}
              >
                <Plus className="w-3 h-3" />
                Add Button
              </button>
            </div>

            <div className="space-y-2.5">
              {(currentCard.buttons || []).map((btn, bIdx) => (
                <div
                  key={bIdx}
                  className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 relative space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-600">
                      Button #{bIdx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteButton(bIdx)}
                      className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                      title="Delete button"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Button Type Selector */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateButton(bIdx, { type: "reply" })}
                      className={`flex-1 py-1 px-2 rounded-md text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        btn.type !== "link"
                          ? "bg-white text-indigo-700 border-indigo-300 shadow-2xs"
                          : "bg-slate-100/80 text-slate-600 border-slate-200 hover:bg-white"
                      }`}
                    >
                      <MessageSquare className="w-3 h-3" />
                      Reply (Triggers Flow)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateButton(bIdx, { type: "link" })}
                      className={`flex-1 py-1 px-2 rounded-md text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        btn.type === "link"
                          ? "bg-white text-indigo-700 border-indigo-300 shadow-2xs"
                          : "bg-slate-100/80 text-slate-600 border-slate-200 hover:bg-white"
                      }`}
                    >
                      <ExternalLink className="w-3 h-3" />
                      Link (Opens URL)
                    </button>
                  </div>

                  {/* Button Title */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-slate-600 font-medium">Button Label</span>
                      <span
                        className={`text-[10px] font-mono ${
                          (btn.title || "").length > 20 ? "text-rose-600 font-bold" : "text-slate-400"
                        }`}
                      >
                        {(btn.title || "").length}/20
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={20}
                      value={btn.title || ""}
                      onChange={(e) => handleUpdateButton(bIdx, { title: e.target.value })}
                      placeholder="e.g. View Product"
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-md bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  {/* URL input if link button */}
                  {btn.type === "link" && (
                    <div>
                      <span className="text-[11px] text-slate-600 font-medium block mb-1">
                        Web URL (HTTPS)
                      </span>
                      <input
                        type="url"
                        value={btn.url || ""}
                        onChange={(e) => handleUpdateButton(bIdx, { url: e.target.value })}
                        placeholder="https://example.com/details"
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-md bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Horizontal Carousel Preview Bar */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700">Live Card Deck Preview</span>
          <span className="text-[11px] text-slate-500">Swipe horizontally</span>
        </div>
        <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-thin">
          {cards.map((c, i) => (
            <div
              key={c.id || i}
              onClick={() => setActiveCardIndex(i)}
              className={`shrink-0 w-44 rounded-xl border bg-white overflow-hidden shadow-2xs transition-all cursor-pointer ${
                i === safeIndex
                  ? "ring-2 ring-indigo-500 border-indigo-400"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              {c.imageUrl ? (
                <img
                  src={c.imageUrl}
                  alt={c.title || `Card ${i + 1}`}
                  className="w-full h-24 object-cover"
                />
              ) : (
                <div className="w-full h-24 bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
                  <ImageIcon className="w-6 h-6 stroke-[1.5]" />
                </div>
              )}
              <div className="p-2 space-y-1">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {c.title || "Untitled Card"}
                </p>
                {c.subtitle && (
                  <p className="text-[11px] text-slate-500 truncate">{c.subtitle}</p>
                )}
                <div className="pt-1.5 space-y-1">
                  {(c.buttons || []).map((b, bIdx) => (
                    <div
                      key={bIdx}
                      className="text-[10px] font-medium text-center py-1 px-2 rounded-md bg-slate-50 border border-slate-200 text-indigo-600 truncate"
                    >
                      {b.title || `Button ${bIdx + 1}`}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
