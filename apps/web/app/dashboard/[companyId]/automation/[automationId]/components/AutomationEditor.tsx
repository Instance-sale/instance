"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import FlowCanvas from "../../components/FlowBuilder/FlowCanvas";
import { StickyNoteProvider } from "../../components/FlowBuilder/StickyNoteContext";
import { getExecutionNodes } from "../../components/FlowBuilder/stickyNoteTypes";
import NodeSidebar from "../../components/FlowBuilder/NodeSidebar";
import NodeConfig from "../../components/FlowBuilder/NodeConfig";
import AutomationEditorHeader from "./AutomationEditorHeader";
import AutomationPreview from "./AutomationPreview";
import AutomationAnalyticsView from "./AutomationAnalyticsView";
import { useAutomationState } from "./hooks/useAutomationState";
import { useAutoSave } from "./hooks/useAutoSave";
import { useNodeHistory } from "./hooks/useNodeHistory";
import { useNodeConfig } from "./hooks/useNodeConfig";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { toast } from "@/lib/toast";
import { Workflow, MessageSquare, Send, FolderInput, AlertTriangle, Loader2 } from "lucide-react";
import ImportFlowModal from "./ImportFlowModal";

interface AutomationEditorProps {
  automation: any;
  basePath: string;
}

export default function AutomationEditor({
  automation,
  basePath,
}: AutomationEditorProps) {
  const router = useRouter();
  const [showPreview, setShowPreview] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [previewMode, setPreviewMode] = useState<"mobile" | "desktop">("mobile");
  const [automationName, setAutomationName] = useState(automation.name);
  const [showSidebar, setShowSidebar] = useState(true);
  const [activeView, setActiveView] = useState<"canvas" | "analytics">("canvas");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // State management
  const {
    nodes,
    edges,
    selectedNode,
    isInitialized,
    setNodes,
    setEdges,
    setSelectedNode,
    handleNodeClick,
    syncNodesFromDatabase,
  } = useAutomationState({ automation });

  // History management
  const { addToHistory, resetHistory, undo, redo, canUndo, canRedo } = useNodeHistory(
    nodes,
    edges
  );

  // Update history when nodes/edges change
  useEffect(() => {
    if (isInitialized) {
      addToHistory(nodes, edges);
    }
  }, [nodes, edges, isInitialized, addToHistory]);

  // Auto-save
  const { saving, isSaved, manualSave, cancelPending } = useAutoSave({
    automationId: automation.id,
    nodes,
    edges,
    initialFlowData: automation.flowData,
    onSaveSuccess: (savedNodes) => {
      syncNodesFromDatabase(savedNodes);
    },
    onSaveError: (error) => {
      logger.error("[AutomationEditor] Auto-save error:", error);
      toast.error("Auto-save failed", error?.message || "Please check your network and try again.");
    },
  });

  // Node config management
  const { updateNodeConfig } = useNodeConfig({
    automationId: automation.id,
    selectedNode,
    nodes,
    edges,
    setNodes,
    setSelectedNode,
    onSaveSuccess: (savedNodes) => {
      syncNodesFromDatabase(savedNodes);
    },
    onCancelAutoSave: () => {
      // Cancel pending auto-save when config is being saved
      cancelPending();
    },
  });

  // Warn user about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isSaved) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isSaved]);

  // Fetch live node analytics from database and inject into canvas nodes
  useEffect(() => {
    let isMounted = true;
    async function loadNodeAnalytics() {
      try {
        const res = await fetch(`/api/automations/${automation.id}/analytics`);
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json?.nodeAnalytics) {
            setNodes((prevNodes) =>
              prevNodes.map((node) => {
                const nodeStats = json.nodeAnalytics[node.id];
                if (!nodeStats) return node;
                return {
                  ...node,
                  data: {
                    ...(node.data as any),
                    analytics: nodeStats,
                  },
                };
              })
            );
          }
        }
      } catch (err) {
        logger.warn("[AutomationEditor] Failed to load node analytics:", err);
      }
    }
    loadNodeAnalytics();
    return () => {
      isMounted = false;
    };
  }, [automation.id, setNodes]);

  // Delete selected sticky note with Delete / Backspace (when not typing)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const active = document.activeElement;
      if (
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLInputElement ||
        (active instanceof HTMLElement && active.isContentEditable)
      ) {
        return;
      }

      const selectedNote = nodes.find((n) => n.type === "note" && n.selected);
      if (selectedNote) {
        e.preventDefault();
        setNodes((prev) => prev.filter((n) => n.id !== selectedNote.id));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nodes, setNodes]);

  // Handle undo
  const handleUndo = useCallback(() => {
    const previousState = undo();
    if (previousState) {
      setNodes(previousState.nodes);
      setEdges(previousState.edges);
    }
  }, [undo, setNodes, setEdges]);

  // Handle redo
  const handleRedo = useCallback(() => {
    const nextState = redo();
    if (nextState) {
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
    }
  }, [redo, setNodes, setEdges]);

  // Handle flow template import
  const handleImportFlow = useCallback(
    (importedNodes: any[], importedEdges: any[]) => {
      setNodes((prevNodes) => [
        ...prevNodes.map((n) => ({ ...n, selected: false })),
        ...importedNodes,
      ]);
      setEdges((prevEdges) => [
        ...prevEdges,
        ...importedEdges,
      ]);
      toast.success(
        "Flow imported",
        `Successfully added ${importedNodes.length} step${importedNodes.length === 1 ? "" : "s"} to your canvas.`
      );
    },
    [setNodes, setEdges]
  );

  // Handle set live
  const handleSetLive = useCallback(async () => {
    // If already active, stop it
    if (automation.isActive) {
      try {
        const response = await fetch(`/api/automations/${automation.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: false }),
        });
        if (response.ok) {
          toast.info("Automation paused", "Automation has been set to draft mode.");
          router.refresh();
        } else {
          const errData = await response.json().catch(() => ({}));
          toast.error("Failed to pause automation", errData.error || errData.message);
        }
      } catch (error: any) {
        toast.error("Failed to pause automation", error?.message);
      }
      return;
    }

    try {
      // First save the automation before setting live
      await manualSave();

      // Then set it to live
      const response = await fetch(`/api/automations/${automation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });

      if (response.ok) {
        toast.success("Automation is Live!", "All configured triggers are now actively listening.");
        router.refresh();
      } else {
        const errData = await response.json().catch(() => ({}));
        toast.error("Failed to set automation live", errData.error || errData.message || "Please check your node configurations.");
      }
    } catch (error: any) {
      logger.error("Set live error:", error);
      toast.error("Failed to set automation live", error?.message || "Please check your connections and try again.");
    }
  }, [automation.id, automation.isActive, manualSave, router]);

  // Handle duplicate
  const handleDuplicate = useCallback(async () => {
    // No native confirm - execute directly and inform via toast

    try {
      const response = await fetch(`/api/automations/${automation.id}/duplicate`, {
        method: "POST",
      });
      if (response.ok) {
        const data = await response.json();
        toast.success("Automation duplicated");
        router.push(`${basePath}/automation/${data.automation.id}`);
      } else {
        const errData = await response.json().catch(() => ({}));
        toast.error("Failed to duplicate automation", errData.error || errData.message);
      }
    } catch (error: any) {
      logger.error("Failed to duplicate automation:", error);
      toast.error("Failed to duplicate automation", error?.message);
    }
  }, [automation.id, basePath, router]);

  // Handle delete

  // Handle delete trigger - opens custom in-app confirmation modal
  const handleDelete = useCallback(() => {
    setShowDeleteModal(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/automations/${automation.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        toast.success("Automation deleted", `"${automationName}" was successfully removed.`);
        router.push(`${basePath}/automation`);
      } else {
        const errData = await response.json().catch(() => ({}));
        toast.error("Failed to delete automation", errData.error || errData.message);
      }
    } catch (error: any) {
      logger.error("Failed to delete automation:", error);
      toast.error("Failed to delete automation", error?.message);
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  }, [automation.id, automationName, basePath, router]);

  // Handle name edit
  const handleNameEdit = useCallback(
    async (newName: string) => {
      setAutomationName(newName);
      try {
        const response = await fetch(`/api/automations/${automation.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName }),
        });

        if (!response.ok) {
          setAutomationName(automation.name);
          const errData = await response.json().catch(() => ({}));
          toast.error("Failed to update name", errData.error || errData.message);
        } else {
          toast.success("Name updated");
        }
      } catch (error: any) {
        logger.error("Name update error:", error);
        setAutomationName(automation.name);
        toast.error("Failed to update name", error?.message);
      }
    },
    [automation.id, automation.name]
  );

  return (
    <div className="flex flex-1 flex-col min-h-0 w-full overflow-hidden">
      <AutomationEditorHeader
        automation={{
          id: automation.id,
          name: automationName,
          status: automation.isActive ? "LIVE" : "DRAFT",
        }}
        basePath={basePath}
        activeView={activeView}
        onViewChange={setActiveView}
        isSaved={isSaved}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onPreview={(mode) => {
          setPreviewMode(mode ?? "mobile");
          setShowPreview(true);
        }}
        onSetLive={handleSetLive}
        onNameEdit={handleNameEdit}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
        onToggleSidebar={() => setShowSidebar((prev) => !prev)}
        isSidebarOpen={showSidebar}
        onOpenImportModal={() => setShowImportModal(true)}
      />
      {activeView === "analytics" ? (
        <AutomationAnalyticsView
          automation={automation}
          basePath={basePath}
        />
      ) : (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className={cn("w-72 h-full min-h-0 shrink-0 bg-white border-r border-slate-200 overflow-hidden shadow-sm z-10",
            !showSidebar && "hidden"
          )}>
            <NodeSidebar
              onAddNode={() => { }}
              onClose={() => setShowSidebar(false)}
              onOpenImportModal={() => setShowImportModal(true)}
            />
          </div>
          <div className="flex-1 min-h-0 relative overflow-hidden">
            <StickyNoteProvider nodes={nodes} setNodes={setNodes}>
              <FlowCanvas
                nodes={nodes}
                edges={edges}
                onNodesChange={(newNodes) => {
                  setNodes((currentNodes) => {
                    const currentNodesMap = new Map(
                      currentNodes.map((n) => [n.id, n])
                    );

                    return newNodes.map((newNode) => {
                      const currentNode = currentNodesMap.get(newNode.id);
                      if (!currentNode) return newNode;

                      if (newNode.type === "note") {
                        return {
                          ...newNode,
                          data: {
                            ...(currentNode.data as object),
                            ...(newNode.data as object),
                          },
                          style: newNode.style ?? currentNode.style,
                        };
                      }

                      const currentConfig = (currentNode.data as any)?.config || {};
                      const newConfig = (newNode.data as any)?.config || {};
                      const preservedConfig =
                        Object.keys(currentConfig).length > 0 ? currentConfig : newConfig;

                      return {
                        ...newNode,
                        data: {
                          ...newNode.data,
                          config: preservedConfig,
                        },
                      };
                    });
                  });
                }}
                onEdgesChange={setEdges}
                onNodeClick={handleNodeClick}
              />
            </StickyNoteProvider>
            {getExecutionNodes(nodes).length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center p-8 bg-white/90 rounded-2xl border border-slate-200/80 shadow-sm backdrop-blur-sm max-w-lg">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
                    <Workflow className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">
                    Your automation canvas is empty
                  </h3>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed max-w-sm mx-auto">
                    Drag nodes from the sidebar to build your automation workflow, or
                    import an existing flow sequence from your folders.
                  </p>
                  <div className="flex items-center justify-center gap-3 mb-5 pointer-events-auto">
                    <button
                      type="button"
                      onClick={() => setShowImportModal(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-md hover:from-blue-700 hover:to-indigo-700 transition-all cursor-pointer active:scale-95"
                    >
                      <FolderInput className="w-3.5 h-3.5" />
                      <span>Import Existing Flow</span>
                    </button>
                  </div>
                  <div className="flex items-center justify-center gap-6 text-xs text-slate-600 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-md bg-purple-50 text-purple-600 border border-purple-200">
                        <MessageSquare className="w-3.5 h-3.5" />
                      </span>
                      <span className="font-medium">Triggers start flow</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-md bg-blue-50 text-blue-600 border border-blue-200">
                        <Send className="w-3.5 h-3.5" />
                      </span>
                      <span className="font-medium">Actions execute steps</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <AnimatePresence>
        {selectedNode && (
          <NodeConfig
            key={selectedNode.id}
            node={selectedNode}
            onUpdate={updateNodeConfig}
            onClose={() => setSelectedNode(null)}
            instagramAccountId={automation.folder?.instagramAccount?.id}
            automationId={automation.id}
          />
        )}
      </AnimatePresence>
      <AutomationPreview
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        viewMode={previewMode}
        nodes={nodes}
        edges={edges}
        automationName={automationName}
        userName="instance"
      />
      <ImportFlowModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        currentAutomationId={automation.id}
        instagramAccountId={automation.folder?.instagramAccountId || automation.folder?.instagramAccount?.id}
        existingNodes={nodes}
        onImport={handleImportFlow}
      />
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => {
            if (!isDeleting) setShowDeleteModal(false);
          }}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">
                  Delete &ldquo;{automationName}&rdquo;?
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Are you sure you want to delete this automation? Its flow configuration, triggers, nodes, and past execution logs will be permanently deleted.
                </p>
                <p className="text-xs text-slate-500 mt-2 font-medium">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md shadow-red-200 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Automation</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
