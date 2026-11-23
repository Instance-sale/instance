import { useState, useEffect, useRef, useCallback } from "react";
import { Node, Edge } from "@xyflow/react";
import { flowNodesToDbNodes, flowNodesToStickyNotes } from "../utils/nodeTransformers";
import { useSaveQueue } from "./useSaveQueue";
import { logger } from "@/lib/logger";

interface UseAutoSaveOptions {
  automationId: string;
  nodes: Node[];
  edges: Edge[];
  initialFlowData?: unknown;
  debounceMs?: number;
  onSaveSuccess?: (savedNodes: any[]) => void;
  onSaveError?: (error: Error) => void;
  maxRetries?: number;
}

/**
 * Hook for auto-saving automation nodes with retry mechanism
 */
export function useAutoSave({
  automationId,
  nodes,
  edges,
  initialFlowData,
  debounceMs = 2000,
  onSaveSuccess,
  onSaveError,
  maxRetries = 3,
}: UseAutoSaveOptions) {
  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveRef = useRef<string>("");
  const nodesRef = useRef<Node[]>(nodes);
  const edgesRef = useRef<Edge[]>(edges);
  const flowDataRef = useRef<unknown>(initialFlowData ?? null);
  const retryCountRef = useRef(0);
  const { queueSave, cancelPending: cancelQueuePending, isSaving } = useSaveQueue();

  useEffect(() => {
    if (initialFlowData !== undefined) {
      flowDataRef.current = initialFlowData;
    }
  }, [initialFlowData]);

  // Keep refs in sync with state to avoid stale closures
  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  /**
   * Save nodes to database with retry mechanism
   */
  const saveNodesInternal = useCallback(
    async (nodesToSave: Node[], edgesToSave: Edge[], retryAttempt = 0): Promise<any> => {
      try {
        // CRITICAL: Validate nodes before saving - check for config loss
        const nodesWithEmptyConfigs = nodesToSave.filter((node) => {
          const config = (node.data as any)?.config || {};
          const nodeType = (node.data as any)?.type || '';
          // Check if trigger/action nodes have empty configs (might indicate data loss)
          return (nodeType.startsWith("TRIGGER_") || nodeType.startsWith("ACTION_")) && 
                 Object.keys(config).length === 0;
        });
        
        if (nodesWithEmptyConfigs.length > 0) {
          logger.warn(`[useAutoSave] ⚠️ WARNING: ${nodesWithEmptyConfigs.length} nodes have empty configs:`, 
            nodesWithEmptyConfigs.map(n => ({ id: n.id, type: (n.data as any)?.type })));
        }
        
        // Convert ReactFlow nodes to database format
        const dbNodes = flowNodesToDbNodes(nodesToSave, edgesToSave);

        logger.log(`[useAutoSave] 💾 Saving ${dbNodes.length} nodes${retryAttempt > 0 ? ` (retry ${retryAttempt}/${maxRetries})` : ""}`);
        
        // Log each node's config status
        dbNodes.forEach((node) => {
          const configKeys = Object.keys(node.config || {});
          const hasConfig = configKeys.length > 0;
          logger.log(`[useAutoSave]   - ${node.nodeId} (${node.type}): ${hasConfig ? `✅ Config (${configKeys.join(", ")})` : "⚠️ EMPTY CONFIG"}`);
        });

        // Save nodes with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        try {
          const nodesResponse = await fetch(`/api/automations/${automationId}/nodes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nodes: dbNodes }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!nodesResponse.ok) {
            const errorText = await nodesResponse.text();
            let errorMessage = "Failed to save nodes";
            try {
              const errorJson = JSON.parse(errorText);
              errorMessage = errorJson.error || errorMessage;
            } catch {
              errorMessage = errorText || errorMessage;
            }
            throw new Error(errorMessage);
          }

          const result = await nodesResponse.json();

          // Persist sticky notes in flowData (annotations only — not execution nodes)
          const stickyNotes = flowNodesToStickyNotes(nodesToSave);
          const existingFlowData =
            flowDataRef.current && typeof flowDataRef.current === "object"
              ? (flowDataRef.current as Record<string, unknown>)
              : {};
          const flowData = {
            ...existingFlowData,
            stickyNotes,
          };

          const flowDataResponse = await fetch(`/api/automations/${automationId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ flowData }),
          });

          if (!flowDataResponse.ok) {
            throw new Error("Failed to save sticky notes");
          }

          flowDataRef.current = flowData;

          // Extract trigger node config and sync to Automation table
          const triggerNode = nodesToSave.find((node) => {
            const nodeType = typeof (node.data as any).type === 'string' ? (node.data as any).type : '';
            return nodeType.startsWith("TRIGGER_");
          });

          if (triggerNode) {
            const triggerConfig = ((triggerNode.data as any).config || {}) as any;
            const triggerNodeType = typeof (triggerNode.data as any).type === 'string' ? (triggerNode.data as any).type : '';

            const automationUpdate: any = {};

            if (triggerNodeType === "TRIGGER_COMMENT") {
              automationUpdate.triggerKeywords = triggerConfig.keywords || [];
              automationUpdate.triggerMatchType = triggerConfig.fuzzyMatch ? "FUZZY" : (triggerConfig.matchType || "CONTAINS");

              if (triggerConfig.selectedMediaId) {
                automationUpdate.mediaId = triggerConfig.selectedMediaId;
                automationUpdate.mediaType = triggerConfig.selectedMediaType || null;
              } else if (triggerConfig.mediaId) {
                automationUpdate.mediaId = triggerConfig.mediaId;
                automationUpdate.mediaType = triggerConfig.mediaType || null;
              }
              
              // Set triggerType based on selectedMediaType (REEL -> COMMENT_REEL, otherwise COMMENT_POST)
              const selectedMediaType = triggerConfig.selectedMediaType || triggerConfig.mediaType || '';
              automationUpdate.triggerType = (selectedMediaType === 'REEL' || selectedMediaType === 'REELS') ? 'COMMENT_REEL' : 'COMMENT_POST';
              
              logger.log(`[useAutoSave] Setting triggerType to ${automationUpdate.triggerType} based on selectedMediaType: ${selectedMediaType}`);
            } else if (triggerNodeType === "TRIGGER_DM") {
              automationUpdate.triggerKeywords = triggerConfig.keywords || [];
              automationUpdate.triggerMatchType = triggerConfig.fuzzyMatch ? "FUZZY" : (triggerConfig.matchType || "CONTAINS");
              automationUpdate.triggerType = 'DM_RECEIVED';
            } else if (triggerNodeType === "TRIGGER_STORY") {
              automationUpdate.triggerKeywords = triggerConfig.keywords || [];
              automationUpdate.triggerMatchType = triggerConfig.fuzzyMatch ? "FUZZY" : (triggerConfig.matchType || "CONTAINS");
              // TRIGGER_STORY could be STORY_MENTION or STORY_REPLY (including reaction)
              const storyType = String(triggerConfig.storyType || '').toLowerCase();
              const isReplyOrReaction = storyType === 'reply' || storyType === 'reaction';
              automationUpdate.triggerType = isReplyOrReaction ? 'STORY_REPLY' : 'STORY_MENTION';
              
              // Sync story ID if selected
              if (triggerConfig.selectedMediaId) {
                automationUpdate.mediaId = triggerConfig.selectedMediaId;
                automationUpdate.mediaType = triggerConfig.selectedMediaType || "STORY";
              } else {
                automationUpdate.mediaId = null;
                automationUpdate.mediaType = null;
              }
            } else if (triggerNodeType === "TRIGGER_FOLLOWER") {
              automationUpdate.triggerType = 'NEW_FOLLOWER';
            }

            if (Object.keys(automationUpdate).length > 0) {
              logger.log(`[useAutoSave] Updating automation with:`, automationUpdate);
              await fetch(`/api/automations/${automationId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(automationUpdate),
              });
            }
          }

          lastSaveRef.current = JSON.stringify({ nodes: nodesToSave, edges: edgesToSave });
          retryCountRef.current = 0; // Reset retry count on success
          setIsSaved(true);
          
          if (onSaveSuccess && result.nodes) {
            onSaveSuccess(result.nodes);
          }

          return result.nodes;
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          throw fetchError;
        }
      } catch (error: any) {
        // Retry logic with exponential backoff
        if (retryAttempt < maxRetries && !error.message?.includes("aborted")) {
          const delay = Math.min(1000 * Math.pow(2, retryAttempt), 10000); // Max 10 seconds
          logger.log(`[useAutoSave] ⚠️ Save failed, retrying in ${delay}ms...`);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return saveNodesInternal(nodesToSave, edgesToSave, retryAttempt + 1);
        }

        // Max retries reached or non-retryable error
        logger.error("[useAutoSave] ❌ Auto-save failed after retries:", error);
        setIsSaved(false);
        retryCountRef.current = retryAttempt;
        
        if (onSaveError) {
          onSaveError(error);
        }
        
        throw error;
      }
    },
    [automationId, maxRetries, onSaveSuccess, onSaveError]
  );

  /**
   * Save nodes (queued to prevent race conditions)
   */
  const saveNodes = useCallback(
    async (nodesToSave: Node[], edgesToSave: Edge[]) => {
      if (isSaving()) {
        logger.log("[useAutoSave] ⏳ Save already in progress, queuing...");
      }
      
      setSaving(true);
      try {
        const result = await queueSave(nodesToSave, edgesToSave, saveNodesInternal);
        return result;
      } catch (error: any) {
        // Error already handled in saveNodesInternal
        return null;
      } finally {
        setSaving(false);
      }
    },
    [queueSave, saveNodesInternal, isSaving]
  );

  /**
   * Auto-save with debounce
   * Uses refs to get latest state and avoid stale closures
   */
  useEffect(() => {
    const currentState = JSON.stringify({ nodes: nodesRef.current, edges: edgesRef.current });
    if (currentState === lastSaveRef.current) {
      setIsSaved(true);
      return;
    }

    setIsSaved(false);

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Auto-save after debounce period - use refs to get latest state
    saveTimeoutRef.current = setTimeout(() => {
      saveNodes(nodesRef.current, edgesRef.current);
    }, debounceMs);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [nodes, edges, debounceMs, saveNodes]);

  /**
   * Cancel pending auto-save (both debounce timeout and queued operations)
   */
  const cancelPending = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    cancelQueuePending();
  }, [cancelQueuePending]);

  /**
   * Manual save (immediate)
   */
  const manualSave = useCallback(async () => {
    // Clear any pending auto-save
    cancelPending();
    // Use refs to get latest state
    return await saveNodes(nodesRef.current, edgesRef.current);
  }, [saveNodes, cancelPending]);

  return {
    saving,
    isSaved,
    saveNodes,
    manualSave,
    cancelPending,
  };
}
