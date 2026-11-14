"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Node, Edge } from "@xyflow/react";
import {
  X,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Workflow,
  Search,
  Check,
  Loader2,
  ArrowRight,
  Layers,
  Sparkles,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { logger } from "@/lib/logger";
import {
  dbNodesToFlowNodes,
  dbNodesToFlowEdges,
  getNodeLabel,
  getNodeIcon,
  DatabaseNode,
} from "./utils/nodeTransformers";
import { getExecutionNodes } from "../../components/FlowBuilder/stickyNoteTypes";
import { NodeIcon } from "../../components/FlowBuilder/node-icons";

interface ImportFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAutomationId: string;
  instagramAccountId?: string;
  existingNodes: Node[];
  onImport: (importedNodes: Node[], importedEdges: Edge[]) => void;
}

interface AutomationSummary {
  id: string;
  name: string;
  description?: string | null;
  triggerType?: string | null;
  nodes?: DatabaseNode[];
  _count?: {
    nodes?: number;
    executions?: number;
  };
  createdAt?: string;
}

interface FolderItem {
  id: string;
  name: string;
  _count?: {
    automations: number;
  };
}

export default function ImportFlowModal({
  isOpen,
  onClose,
  currentAutomationId,
  instagramAccountId,
  existingNodes,
  onImport,
}: ImportFlowModalProps) {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set());
  const [folderAutomations, setFolderAutomations] = useState<Record<string, AutomationSummary[]>>({});
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [loadingFolderId, setLoadingFolderId] = useState<string | null>(null);
  const [selectedAutomation, setSelectedAutomation] = useState<AutomationSummary | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  // Check if existing canvas already has a starting trigger
  const hasExistingTrigger = useMemo(() => {
    return existingNodes.some((n) => {
      const type = ((n.data as any)?.type || n.type || "") as string;
      return type.startsWith("TRIGGER_") || type === "trigger";
    });
  }, [existingNodes]);

  // Include trigger toggle: default to false if canvas already has a trigger, true otherwise
  const [includeTrigger, setIncludeTrigger] = useState(!hasExistingTrigger);

  // Sync includeTrigger default whenever modal opens or canvas trigger presence changes
  useEffect(() => {
    if (isOpen) {
      setIncludeTrigger(!hasExistingTrigger);
    }
  }, [isOpen, hasExistingTrigger]);

  // Load folders on mount / when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function fetchFolders() {
      if (!instagramAccountId) return;
      setLoadingFolders(true);
      try {
        const res = await fetch(`/api/automations/folders?instagramAccountId=${instagramAccountId}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            const list = data.folders || [];
            setFolders(list);
            // Auto-expand first folder if available
            if (list.length > 0) {
              const firstId = list[0].id;
              setExpandedFolderIds(new Set([firstId]));
              loadAutomationsForFolder(firstId);
            }
          }
        }
      } catch (err) {
        logger.error("[ImportFlowModal] Error loading folders:", err);
      } finally {
        if (isMounted) setLoadingFolders(false);
      }
    }

    fetchFolders();
    return () => {
      isMounted = false;
    };
  }, [isOpen, instagramAccountId]);

  // Load automations for a specific folder
  const loadAutomationsForFolder = useCallback(
    async (folderId: string) => {
      if (folderAutomations[folderId]) return;
      setLoadingFolderId(folderId);
      try {
        const res = await fetch(`/api/automations?folderId=${folderId}`);
        if (res.ok) {
          const data = await res.json();
          const items: AutomationSummary[] = data.automations || [];
          setFolderAutomations((prev) => ({
            ...prev,
            [folderId]: items,
          }));
        }
      } catch (err) {
        logger.error("[ImportFlowModal] Error loading automations for folder:", err);
      } finally {
        setLoadingFolderId(null);
      }
    },
    [folderAutomations]
  );

  const toggleFolder = (folderId: string) => {
    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
        loadAutomationsForFolder(folderId);
      }
      return next;
    });
  };

  // Filter automations based on search query
  const filteredFoldersWithAutomations = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return folders;

    return folders.filter((folder) => {
      const matchFolder = folder.name.toLowerCase().includes(q);
      const automations = folderAutomations[folder.id] || [];
      const matchAuto = automations.some((a) => a.name.toLowerCase().includes(q));
      return matchFolder || matchAuto;
    });
  }, [folders, folderAutomations, searchQuery]);

  // Handle flow import
  const handlePerformImport = async () => {
    if (!selectedAutomation || selectedAutomation.id === currentAutomationId) return;

    setIsImporting(true);
    try {
      // Fetch full automation details to guarantee full node configs
      const res = await fetch(`/api/automations/${selectedAutomation.id}`);
      if (!res.ok) {
        throw new Error("Failed to load source automation flow data.");
      }
      const data = await res.json();
      const sourceAuto = data.automation || selectedAutomation;
      const rawNodes: DatabaseNode[] = sourceAuto.nodes || [];

      if (rawNodes.length === 0) {
        toast.warning("Empty Automation", "The selected automation has no steps to import.");
        setIsImporting(false);
        return;
      }

      // Convert DB nodes to Flow nodes & edges
      const flowNodes = dbNodesToFlowNodes(rawNodes);
      const flowEdges = dbNodesToFlowEdges(rawNodes);

      // Filter out trigger nodes if user opted out
      const nodesToImport = flowNodes.filter((node) => {
        if (includeTrigger) return true;
        const type = ((node.data as any)?.type || node.type || "") as string;
        return !type.startsWith("TRIGGER_") && type !== "trigger";
      });

      if (nodesToImport.length === 0) {
        toast.warning(
          "No Action Steps Found",
          "This automation only contains a trigger step. Check 'Include Starting Trigger' to import it."
        );
        setIsImporting(false);
        return;
      }

      // 1. Generate unique IDs and build oldId -> newId mapping
      const idMap = new Map<string, string>();
      nodesToImport.forEach((node, index) => {
        const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${index}`;
        const newId = `node_${uniqueSuffix}`;
        idMap.set(node.id, newId);
      });

      // 2. Compute smart placement position (avoid overlapping existing nodes)
      const existingExecNodes = getExecutionNodes(existingNodes);
      let offsetX = 0;
      let offsetY = 0;

      const importMinX = Math.min(...nodesToImport.map((n) => n.position?.x ?? 0));
      const importMinY = Math.min(...nodesToImport.map((n) => n.position?.y ?? 0));

      if (existingExecNodes.length > 0) {
        // Place cluster to the right of the existing flow with generous padding
        const maxX = Math.max(
          ...existingExecNodes.map((n) => (n.position?.x ?? 0) + ((n.measured?.width as number) || 260))
        );
        const minY = Math.min(...existingExecNodes.map((n) => n.position?.y ?? 0));
        offsetX = maxX + 180 - importMinX;
        offsetY = minY - importMinY;
      } else {
        // Canvas is empty: position nicely near canvas origin
        offsetX = 100 - importMinX;
        offsetY = 100 - importMinY;
      }

      // 3. Map nodes with new IDs, offset positions, and auto-select
      const finalNodes: Node[] = nodesToImport.map((node) => {
        const newId = idMap.get(node.id)!;
        const oldConfig = (node.data as any)?.config || {};
        const newConfig = JSON.parse(JSON.stringify(oldConfig));

        // Remap internal branch targets in node configs
        if (newConfig.conditionPaths) {
          if (newConfig.conditionPaths.true && idMap.has(newConfig.conditionPaths.true)) {
            newConfig.conditionPaths.true = idMap.get(newConfig.conditionPaths.true);
          }
          if (newConfig.conditionPaths.false && idMap.has(newConfig.conditionPaths.false)) {
            newConfig.conditionPaths.false = idMap.get(newConfig.conditionPaths.false);
          }
          if (newConfig.conditionPaths.qualified && idMap.has(newConfig.conditionPaths.qualified)) {
            newConfig.conditionPaths.qualified = idMap.get(newConfig.conditionPaths.qualified);
          }
          if (newConfig.conditionPaths.unqualified && idMap.has(newConfig.conditionPaths.unqualified)) {
            newConfig.conditionPaths.unqualified = idMap.get(newConfig.conditionPaths.unqualified);
          }
        }
        if (Array.isArray(newConfig.randomPaths)) {
          newConfig.randomPaths = newConfig.randomPaths.map((rp: any) => ({
            ...rp,
            target: idMap.get(rp.target) || rp.target,
          }));
        }
        if (Array.isArray(newConfig.splitBranches)) {
          newConfig.splitBranches = newConfig.splitBranches.map((sb: any) => ({
            ...sb,
            target: idMap.get(sb.target) || sb.target,
          }));
        }

        return {
          ...node,
          id: newId,
          position: {
            x: Math.round(node.position.x + offsetX),
            y: Math.round(node.position.y + offsetY),
          },
          selected: true, // Pre-selected so user can move the cluster together
          data: {
            ...node.data,
            config: newConfig,
          },
        };
      });

      // 4. Map edges where both endpoints exist in the imported set
      const finalEdges: Edge[] = [];
      for (const edge of flowEdges) {
        const newSource = idMap.get(edge.source);
        const newTarget = idMap.get(edge.target);
        if (newSource && newTarget) {
          finalEdges.push({
            ...edge,
            id: `edge_${newSource}_${newTarget}_${Math.random().toString(36).substring(2, 6)}`,
            source: newSource,
            target: newTarget,
            selected: false,
          });
        }
      }

      onImport(finalNodes, finalEdges);
      onClose();
    } catch (err: any) {
      logger.error("[ImportFlowModal] Import error:", err);
      toast.error("Import failed", err?.message || "Could not import the selected automation.");
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[120] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-4xl max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500/10 to-indigo-500/10 border border-blue-200/60 flex items-center justify-center text-blue-600 shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                Import Automation Flow
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                  Reusable Template
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Browse your folder library to insert an existing sequence into your canvas.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: 2 Columns */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-200">
          {/* Left Column: Folders & Automations */}
          <div className="w-full md:w-5/12 flex flex-col min-h-0 bg-slate-50/50">
            {/* Search Box */}
            <div className="p-3 border-b border-slate-200 bg-white">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search automations or folders..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50 text-slate-800 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Folder & Automation Tree */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
              {loadingFolders ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  <span className="text-xs font-medium">Loading folders...</span>
                </div>
              ) : filteredFoldersWithAutomations.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs italic">
                  No matching automations found.
                </div>
              ) : (
                filteredFoldersWithAutomations.map((folder) => {
                  const isExpanded = expandedFolderIds.has(folder.id);
                  const automations = folderAutomations[folder.id] || [];
                  const isLoadingThisFolder = loadingFolderId === folder.id;

                  return (
                    <div
                      key={folder.id}
                      className="rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-xs"
                    >
                      {/* Folder Title Bar */}
                      <button
                        type="button"
                        onClick={() => toggleFolder(folder.id)}
                        className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          {isExpanded ? (
                            <FolderOpen className="w-4 h-4 text-amber-500 shrink-0" />
                          ) : (
                            <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                          )}
                          <span className="text-xs font-bold text-slate-800 truncate">
                            {folder.name}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
                          {folder._count?.automations ?? automations.length}
                        </span>
                      </button>

                      {/* Automation Items in Folder */}
                      {isExpanded && (
                        <div className="border-t border-slate-100 bg-slate-50/40 p-2 space-y-1">
                          {isLoadingThisFolder ? (
                            <div className="py-4 flex items-center justify-center gap-2 text-slate-400 text-xs">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                              <span>Loading flows...</span>
                            </div>
                          ) : automations.length === 0 ? (
                            <div className="py-3 text-center text-[11px] text-slate-400 italic">
                              No automations in this folder
                            </div>
                          ) : (
                            automations.map((auto) => {
                              const isSelected = selectedAutomation?.id === auto.id;
                              const isCurrent = auto.id === currentAutomationId;

                              return (
                                <button
                                  key={auto.id}
                                  type="button"
                                  disabled={isCurrent}
                                  onClick={() => setSelectedAutomation(auto)}
                                  className={cn(
                                    "w-full text-left p-2.5 rounded-lg border transition-all flex items-start gap-2.5 cursor-pointer",
                                    isSelected
                                      ? "bg-blue-50/90 border-blue-400 text-blue-900 shadow-xs ring-1 ring-blue-400/50"
                                      : "bg-white border-slate-200/70 hover:border-blue-200 hover:bg-white text-slate-700",
                                    isCurrent && "opacity-50 cursor-not-allowed bg-slate-100 hover:border-slate-200"
                                  )}
                                >
                                  <Workflow
                                    className={cn(
                                      "w-4 h-4 mt-0.5 shrink-0",
                                      isSelected ? "text-blue-600" : "text-slate-400"
                                    )}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-semibold truncate text-slate-900">
                                        {auto.name}
                                      </span>
                                      {isCurrent && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-600">
                                          Current
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                                      <span>
                                        {auto.nodes?.length ?? auto._count?.nodes ?? 0} steps
                                      </span>
                                      {auto.triggerType && (
                                        <>
                                          <span>•</span>
                                          <span className="text-amber-700 font-medium">
                                            {getNodeLabel(auto.triggerType)}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Flow Preview & Settings */}
          <div className="w-full md:w-7/12 flex flex-col min-h-0 bg-white">
            {selectedAutomation ? (
              <div className="flex-1 min-h-0 flex flex-col p-5 overflow-y-auto space-y-5">
                {/* Automation Details Header */}
                <div className="pb-4 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        {selectedAutomation.name}
                      </h3>
                      {selectedAutomation.description ? (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {selectedAutomation.description}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 italic mt-0.5">
                          No description provided for this automation.
                        </p>
                      )}
                    </div>
                    <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                      {selectedAutomation.nodes?.length || 0} Steps
                    </span>
                  </div>
                </div>

                {/* Flow Sequence Preview */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                    Flow Sequence Preview
                  </h4>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {(selectedAutomation.nodes || []).map((node, index) => {
                      const isTrigger =
                        node.type.startsWith("TRIGGER_") || node.type === "trigger";
                      const isSkippedTrigger = isTrigger && !includeTrigger;

                      return (
                        <div
                          key={node.nodeId || index}
                          className={cn(
                            "flex items-center gap-3 p-2.5 rounded-xl border transition-all",
                            isSkippedTrigger
                              ? "bg-slate-50/70 border-slate-200/60 opacity-40 line-through"
                              : "bg-white border-slate-200/90 shadow-xs"
                          )}
                        >
                          <div
                            className={cn(
                              "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold",
                              isTrigger
                                ? "bg-amber-100 text-amber-700"
                                : "bg-blue-100 text-blue-700"
                            )}
                          >
                            <NodeIcon icon={getNodeIcon(node.type)} size={15} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-900 truncate">
                                {getNodeLabel(node.type)}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                #{index + 1}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {isTrigger ? "Initial trigger event" : "Step execution node"}
                            </div>
                          </div>
                          {isSkippedTrigger && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-600 shrink-0">
                              Omitted
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Import Configuration Options */}
                <div className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/70 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    Import Options
                  </h4>

                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeTrigger}
                      onChange={(e) => setIncludeTrigger(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-slate-900 block">
                        Include Starting Trigger Step
                      </span>
                      <span className="text-slate-500 leading-relaxed block text-[11px] mt-0.5">
                        {hasExistingTrigger
                          ? "Your current canvas already has an active trigger. Unchecking this imports only the action sequence ready to connect."
                          : "Your canvas is currently empty. Checking this preserves the starting trigger."}
                      </span>
                    </div>
                  </label>

                  <div className="flex items-start gap-2 pt-2 border-t border-slate-200/70 text-[11px] text-slate-500">
                    <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>
                      Nodes are automatically given fresh unique IDs and placed to the right of
                      existing steps to prevent overlapping.
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 mb-3 shadow-xs">
                  <Layers className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 mb-1">
                  Select an automation from the left
                </h4>
                <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                  Expand a folder, click on any automation to preview its steps, and import its
                  flow into your editor.
                </p>
              </div>
            )}

            {/* Bottom Actions Bar */}
            <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedAutomation || selectedAutomation.id === currentAutomationId || isImporting}
                onClick={handlePerformImport}
                className={cn(
                  "flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all active:scale-95 cursor-pointer",
                  !selectedAutomation || selectedAutomation.id === currentAutomationId || isImporting
                    ? "bg-slate-300 cursor-not-allowed shadow-none"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/20"
                )}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Importing Flow...</span>
                  </>
                ) : (
                  <>
                    <span>Import Flow into Canvas</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
