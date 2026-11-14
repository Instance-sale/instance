"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  AUTOMATION_TEMPLATES,
  getTemplatesByGoal,
  getTemplatesByTrigger,
  searchTemplates,
  type AutomationTemplate,
} from "@/lib/automation/templates";
import TemplatePreview from "./TemplatePreview";
import { Search, X, Sparkles, Workflow, Zap } from "lucide-react";

interface AutomationTemplatesProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: AutomationTemplate) => void;
  onStartFromScratch: () => void;
}

export default function AutomationTemplates({
  isOpen,
  onClose,
  onSelectTemplate,
  onStartFromScratch,
}: AutomationTemplatesProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGoal, setSelectedGoal] = useState<string>("all");
  const [selectedTrigger, setSelectedTrigger] = useState<string>("all");
  const [previewTemplate, setPreviewTemplate] = useState<AutomationTemplate | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle escape key and click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  // Filter templates based on search and filters
  const filteredTemplates = useMemo(() => {
    let templates = AUTOMATION_TEMPLATES;

    // Apply goal filter
    if (selectedGoal !== "all") {
      templates = getTemplatesByGoal(selectedGoal);
    }

    // Apply trigger filter
    if (selectedTrigger !== "all") {
      templates = templates.filter((t) => t.trigger === selectedTrigger);
    }

    // Apply search on filtered results
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      templates = templates.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }

    return templates;
  }, [searchQuery, selectedGoal, selectedTrigger]);

  // Separate Quick Automations and Flow Builder templates
  const quickTemplates = filteredTemplates.filter((t) => t.category === "quick");
  const flowTemplates = filteredTemplates.filter((t) => t.category === "flow");

  if (!isOpen) return null;

  // Show template preview if one is selected
  if (previewTemplate) {
    return (
      <TemplatePreview
        template={previewTemplate}
        onBack={() => setPreviewTemplate(null)}
        onSetUp={() => {
          onSelectTemplate(previewTemplate);
          setPreviewTemplate(null);
          onClose();
        }}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => {
        // Close if clicking the backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-7xl mx-auto bg-white rounded-3xl shadow-2xl my-8 max-h-[90vh] overflow-hidden flex flex-col border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Templates</h2>
            <p className="text-slate-500 text-sm mt-0.5">Start with a pre-built workflow or build from scratch</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onStartFromScratch}
              className="px-5 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-semibold rounded-xl transition-colors cursor-pointer"
            >
              + Start From Scratch
            </button>
            <button
              onClick={onClose}
              className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
              aria-label="Close templates"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden bg-slate-50">
          {/* Left Sidebar - Filters */}
          <div className="w-72 border-r border-slate-200 bg-white p-5 overflow-y-auto">
            {/* Search */}
            <div className="mb-8">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="space-y-8">
              {/* All templates button */}
              <button
                onClick={() => {
                  setSelectedGoal("all");
                  setSelectedTrigger("all");
                }}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${selectedGoal === "all" && selectedTrigger === "all"
                  ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100"
                  : "text-slate-600 hover:bg-slate-50"
                  }`}
              >
                All templates
              </button>

              {/* By Goal */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">
                  By goal
                </h3>
                <div className="space-y-1">
                  {[
                    { id: "grow", label: "Grow your followers" },
                    { id: "engage", label: "Engage your audience" },
                    { id: "drive", label: "Drive traffic" },
                    { id: "convert", label: "Convert leads" },
                    { id: "qualify", label: "Qualify prospects" },
                  ].map((goal) => (
                    <button
                      key={goal.id}
                      onClick={() => {
                        setSelectedGoal(goal.id);
                        setSelectedTrigger("all");
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedGoal === goal.id
                        ? "bg-slate-100 text-slate-900 font-medium"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                    >
                      {goal.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* By Trigger */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">
                  By trigger
                </h3>
                <div className="space-y-1">
                  {[
                    { id: "comment", label: "Post or Reel comment" },
                    { id: "dm", label: "Direct Message" },
                    { id: "story", label: "Story reply" },
                  ].map((trigger) => (
                    <button
                      key={trigger.id}
                      onClick={() => {
                        setSelectedTrigger(trigger.id);
                        setSelectedGoal("all");
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedTrigger === trigger.id
                        ? "bg-slate-100 text-slate-900 font-medium"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                    >
                      {trigger.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content - Templates */}
          <div className="flex-1 p-8 overflow-y-auto">
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                  <Search className="w-8 h-8 opacity-50" />
                </div>
                <p className="text-slate-500 font-medium">No templates found matching your criteria.</p>
                <button
                  onClick={() => { setSelectedGoal("all"); setSelectedTrigger("all"); setSearchQuery("") }}
                  className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="space-y-10">
                {/* Quick Automations */}
                {quickTemplates.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-5 h-5 text-amber-500" />
                      <h3 className="text-lg font-bold text-slate-900">
                        Quick Automations
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {quickTemplates.map((template) => (
                        <TemplateCard
                          key={template.id}
                          template={template}
                          onClick={() => setPreviewTemplate(template)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Flow Builder Templates */}
                {flowTemplates.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Workflow className="w-5 h-5 text-blue-500" />
                      <h3 className="text-lg font-bold text-slate-900">
                        Advanced Workflows
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {flowTemplates.map((template) => (
                        <TemplateCard
                          key={template.id}
                          template={template}
                          onClick={() => setPreviewTemplate(template)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  onClick,
}: {
  template: AutomationTemplate;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative text-left p-5 bg-white border border-slate-200 rounded-2xl hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 flex flex-col h-full"
    >
      <div className="flex items-start justify-between mb-3 w-full">
        <div className={`p-2 rounded-xl transition-colors ${template.category === 'quick' ? 'bg-amber-50 text-amber-600 group-hover:bg-amber-100' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-100'
          }`}>
          {template.category === 'quick' ? <Zap className="w-5 h-5" /> : <Workflow className="w-5 h-5" />}
        </div>
        {template.badge && (
          <span
            className={`px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase rounded-full ${template.badge === "NEW"
              ? "bg-purple-100 text-purple-700 border border-purple-200"
              : template.badge === "POPULAR"
                ? "bg-orange-100 text-orange-700 border border-orange-200"
                : "bg-blue-100 text-blue-700 border border-blue-200"
              }`}
          >
            {template.badge}
          </span>
        )}
      </div>

      <h4 className="font-bold text-slate-900 mb-2 group-hover:text-blue-700 transition-colors">{template.title}</h4>
      <p className="text-sm text-slate-500 mb-4 line-clamp-3 leading-relaxed flex-1">
        {template.description}
      </p>

      <div className="w-full pt-4 border-t border-slate-100 flex items-center justify-between mt-auto">
        <span className="text-xs font-medium text-slate-500 group-hover:text-blue-600 transition-colors">View Details</span>
        <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="opacity-0 group-hover:opacity-100 transition-opacity">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  );
}