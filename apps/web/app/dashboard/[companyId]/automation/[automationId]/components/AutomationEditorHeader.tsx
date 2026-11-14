"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Edit2,
  Check,
  RotateCcw,
  RotateCw,
  Monitor,
  Smartphone,
  MoreVertical,
  Copy,
  Trash2,
  PlayCircle,
  PauseCircle,
  Save,
  Workflow,
  BarChart2,
  FolderInput,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Hook to detect mobile screen size
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
}

interface AutomationEditorHeaderProps {
  automation: {
    id: string;
    name: string;
    status: "DRAFT" | "LIVE" | "PAUSED";
  };
  basePath: string;
  isSaved: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onPreview: (mode?: "mobile" | "desktop") => void;
  onSetLive: () => void;
  onNameEdit: (newName: string) => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
  activeView?: "canvas" | "analytics";
  onViewChange?: (view: "canvas" | "analytics") => void;
  onOpenImportModal?: () => void;
}

export default function AutomationEditorHeader({
  automation,
  basePath,
  isSaved,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onPreview,
  onSetLive,
  onNameEdit,
  onDuplicate,
  onDelete,
  onToggleSidebar,
  isSidebarOpen,
  activeView = "canvas",
  onViewChange,
  onOpenImportModal,
}: AutomationEditorHeaderProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(automation.name);
  const [showPreviewDropdown, setShowPreviewDropdown] = useState(false);
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const [moreDropdownPosition, setMoreDropdownPosition] = useState({ top: 0, right: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const moreMenuPortalRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const [moreMenuMounted, setMoreMenuMounted] = useState(false);

  useEffect(() => {
    setMoreMenuMounted(true);
  }, []);

  // Calculate dropdown position when opening
  useEffect(() => {
    if (showMoreDropdown && moreButtonRef.current) {
      const rect = moreButtonRef.current.getBoundingClientRect();
      setMoreDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [showMoreDropdown]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const t = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(t)
      ) {
        setShowPreviewDropdown(false);
      }
      if (showMoreDropdown) {
        const insideMore =
          moreButtonRef.current?.contains(t) ||
          moreMenuPortalRef.current?.contains(t);
        if (!insideMore) {
          setShowMoreDropdown(false);
        }
      }
    };

    if (showPreviewDropdown || showMoreDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showPreviewDropdown, showMoreDropdown]);

  const handleNameSave = () => {
    if (editedName.trim() && editedName !== automation.name) {
      onNameEdit(editedName.trim());
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleNameSave();
    } else if (e.key === "Escape") {
      setEditedName(automation.name);
      setIsEditingName(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "LIVE":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "PAUSED":
        return "bg-amber-100 text-amber-700 border-amber-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="z-50 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 backdrop-blur-sm px-4 sm:px-6 py-2.5 shadow-xs sticky top-0 isolate">
      {/* Left side: Breadcrumb and name */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <button
          onClick={() => router.push(`${basePath}/automation`)}
          className="text-xs sm:text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors whitespace-nowrap"
        >
          Automations
        </button>
        <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
        {isEditingName ? (
          <input
            type="text"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={handleNameKeyDown}
            className="px-2.5 py-1 border border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs sm:text-sm font-semibold text-slate-900 bg-white min-w-[140px] max-w-[260px]"
            autoFocus
          />
        ) : (
          <div className="flex items-center gap-1.5 min-w-0 max-w-[180px] sm:max-w-[260px] lg:max-w-[340px]">
            <h1 className="text-xs sm:text-sm font-semibold text-slate-900 truncate" title={automation.name}>
              {automation.name}
            </h1>
            <button
              type="button"
              onClick={() => setIsEditingName(true)}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors shrink-0 cursor-pointer"
              aria-label="Edit name"
            >
              <Edit2 className="h-3 w-3" />
            </button>
          </div>
        )}
        <span className={cn(
          "px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border shrink-0",
          getStatusColor(automation.status)
        )}>
          {automation.status}
        </span>
      </div>

      {/* Middle: Status and controls (desktop only) */}
      <div className="hidden lg:flex items-center gap-3.5 border-l border-slate-200 pl-3.5">
        {/* Saved status */}
        <div className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md bg-slate-50 border border-slate-200/80 shrink-0">
          {isSaved ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-700">Saved</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="text-amber-700">Unsaved</span>
            </>
          )}
        </div>

        {/* Undo/Redo */}
        <div className="flex items-center gap-1 border-l border-slate-200 pl-3.5 h-7">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className={cn("p-1 rounded-md transition-all flex items-center justify-center",
              canUndo
                ? "text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                : "text-slate-300 cursor-not-allowed"
            )}
            aria-label="Undo"
            title="Undo (Ctrl+Z)"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={cn("p-1 rounded-md transition-all flex items-center justify-center",
              canRedo
                ? "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                : "text-slate-300 cursor-not-allowed"
            )}
            aria-label="Redo"
            title="Redo (Ctrl+Y)"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* View Switcher: Flow Canvas vs Analytics & Funnel */}
        <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200/80 shrink-0">
          <button
            type="button"
            onClick={() => onViewChange?.("canvas")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
              activeView === "canvas" ? "bg-white text-violet-700 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Workflow className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Flow Canvas</span>
          </button>
          <button
            type="button"
            onClick={() => onViewChange?.("analytics")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
              activeView === "analytics" ? "bg-white text-blue-700 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Analytics & Funnel</span>
          </button>
        </div>
      </div>

      {/* Right side: Preview, Nodes toggle (mobile) and Set Live */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 pl-2 lg:pl-3.5 lg:border-l border-slate-200">
        {/* Mobile: toggle nodes sidebar */}
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 cursor-pointer"
          >
            <span>{isSidebarOpen ? "Hide nodes" : "Nodes"}</span>
          </button>
        )}
        {/* Preview button with dropdown */}
        <div className="relative" ref={dropdownRef}>
          {isMobile ? (
            <button
              type="button"
              onClick={() => {
                onPreview("mobile");
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs cursor-pointer"
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Preview</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setShowPreviewDropdown(!showPreviewDropdown)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs cursor-pointer"
              >
                <Monitor className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Preview</span>
                <ChevronRight className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  showPreviewDropdown && "rotate-90"
                )} />
              </button>
              {showPreviewDropdown && (
                <div className="absolute right-0 mt-2 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-[200] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      onPreview("mobile");
                      setShowPreviewDropdown(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Smartphone className="h-4 w-4 text-slate-400" />
                    Mobile View
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onPreview("desktop");
                      setShowPreviewDropdown(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors border-t border-slate-100 cursor-pointer"
                  >
                    <Monitor className="h-4 w-4 text-slate-400" />
                    Desktop View
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Set Live / Stop Live button */}
        {automation.status === "LIVE" ? (
          <button
            type="button"
            onClick={onSetLive}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-red-600 to-red-700 text-white text-xs font-bold rounded-lg hover:from-red-700 hover:to-red-800 transition-all shadow-xs shadow-red-200 active:scale-95 cursor-pointer"
          >
            <PauseCircle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Stop Live</span>
            <span className="sm:hidden">Stop</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onSetLive}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-xs shadow-blue-200 active:scale-95 cursor-pointer"
          >
            <PlayCircle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Set Live</span>
            <span className="sm:hidden">Live</span>
          </button>
        )}

        {/* More options: portaled so React Flow / panes never sit above the menu */}
        <div className="relative">
          <button
            type="button"
            ref={moreButtonRef}
            onClick={() => setShowMoreDropdown(!showMoreDropdown)}
            className="p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition-all cursor-pointer"
            aria-label="More options"
            aria-expanded={showMoreDropdown}
          >
            <MoreVertical className="h-5 w-5 pointer-events-none" />
          </button>
          {showMoreDropdown &&
            moreMenuMounted &&
            createPortal(
              <div ref={moreMenuPortalRef} className="pointer-events-auto">
                <div
                  className="fixed inset-0 z-[99998] bg-transparent"
                  aria-hidden
                  onClick={() => setShowMoreDropdown(false)}
                />
                <div
                  role="menu"
                  className="fixed w-48 bg-white border border-slate-200 rounded-xl shadow-2xl z-[99999] overflow-hidden"
                  style={{
                    top: `${moreDropdownPosition.top}px`,
                    right: `${moreDropdownPosition.right}px`,
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {onOpenImportModal && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        onOpenImportModal();
                        setShowMoreDropdown(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <FolderInput className="h-4 w-4 text-blue-600 shrink-0" />
                      Import Flow
                    </button>
                  )}
                  {onDuplicate && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        onDuplicate();
                        setShowMoreDropdown(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Copy className="h-4 w-4 text-slate-400 shrink-0" />
                      Duplicate
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        onDelete();
                        setShowMoreDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors border-t border-slate-100 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4 shrink-0" />
                      Delete
                    </button>
                  )}
                </div>
              </div>,
              document.body
            )}
        </div>
      </div>
    </div>
  );
}