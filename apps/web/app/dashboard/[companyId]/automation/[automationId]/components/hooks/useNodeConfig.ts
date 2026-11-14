import { useCallback, useRef } from "react";
import { Node, Edge } from "@xyflow/react";
import { flowNodesToDbNodes } from "../utils/nodeTransformers";
import { useSaveQueue } from "./useSaveQueue";
import { logger } from "@/lib/logger";
import { toast } from "@/lib/toast";

interface UseNodeConfigOptions {
  automationId: string;
  selectedNode: Node | null;
  nodes: Node[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setSelectedNode: React.Dispatch<React.SetStateAction<Node | null>>;
  onSaveSuccess?: (savedNodes: any[]) => void;
  onCancelAutoSave?: () => void;
}

/**
 * Hook for managing node configuration updates
 */
export function useNodeConfig({
  automationId,
  selectedNode,
  nodes,
  edges,
  setNodes,
  setSelectedNode,
  onSaveSuccess,
  onCancelAutoSave,
}: UseNodeConfigOptions) {
  const { queueSave } = useSaveQueue();
  const edgesRef = useRef<Edge[]>(edges);
  
  // Keep edges ref in sync
  if (edgesRef.current !== edges) {
    edgesRef.current = edges;
  }
  /**
   * Update node configuration and save to database
   */
  const updateNodeConfig = useCallback(
    async (config: any) => {
      if (!selectedNode) {
        logger.error("[useNodeConfig] ❌ No selected node to update");
        return;
      }

      logger.log("[useNodeConfig] 🔄 Saving config for node:", selectedNode.id);
      logger.log("[useNodeConfig] 📦 Config being saved:", JSON.stringify(config, null, 2));

      // Compute updatedNodes and dbNodes SYNCHRONOUSLY before any async operations
      // This ensures we capture the current state of ALL nodes before updating
      let updatedNodes: Node[] = [];
      let dbNodesToSave: any[] = [];

      // Use functional update to get latest state and compute everything in one go
      setNodes((prevNodes) => {
        logger.log("[useNodeConfig] 📊 Current nodes count:", prevNodes.length);

        // Compute updated nodes from the LATEST prevNodes state
        // This ensures we have the absolute latest configs for all nodes
        updatedNodes = prevNodes.map((node) => {
          if (node.id === selectedNode.id) {
            // Update the selected node with new config
            logger.log(`[useNodeConfig] 🔄 Updating node ${node.id} with new config`);
            return {
              ...node,
              data: {
                ...node.data,
                config: JSON.parse(JSON.stringify(config)), // Deep copy the new config
              },
            };
          } else {
            // CRITICAL: Preserve the existing node exactly as is, including its FULL config
            // Deep copy everything to prevent mutation
            const existingConfig = (node.data as any).config || {};
            return {
              ...node,
              data: {
                ...node.data,
                config: JSON.parse(JSON.stringify(existingConfig)), // Deep clone config
              },
            };
          }
        });

        // Compute dbNodes INSIDE the setNodes callback so we have the updated nodes
        // Convert ReactFlow nodes to database format - use edgesRef to get latest edges
        dbNodesToSave = flowNodesToDbNodes(updatedNodes, edgesRef.current);

        logger.log("[useNodeConfig] 💾 Prepared", dbNodesToSave.length, "nodes to save");

        return updatedNodes;
      });

      // Also update selectedNode to reflect the new config
      setSelectedNode((prev) => {
        if (!prev || prev.id !== selectedNode.id) return prev;
        return {
          ...prev,
          data: { ...prev.data, config: JSON.parse(JSON.stringify(config)) },
        };
      });

      // Cancel any pending auto-save to prevent race condition
      if (onCancelAutoSave) {
        onCancelAutoSave();
      }

      // Save to database using queue to prevent race conditions
      try {
        const saveFn = async (nodesToSave: Node[], edgesToSave: Edge[]) => {
          const dbNodes = flowNodesToDbNodes(nodesToSave, edgesToSave);
          const nodesResponse = await fetch(`/api/automations/${automationId}/nodes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nodes: dbNodes }),
          });

          if (!nodesResponse.ok) {
            const errorText = await nodesResponse.text();
            logger.error("[useNodeConfig] ❌ Failed to save:", errorText);
            throw new Error(`Failed to save node configuration: ${errorText}`);
          }

          return await nodesResponse.json();
        };

        const result = await queueSave(updatedNodes, edgesRef.current, saveFn);

        logger.log("[useNodeConfig] ✅ Successfully saved to database!");
        logger.log("[useNodeConfig] 📊 Saved nodes:", result.nodes?.length || 0);

        // Update ALL nodes in local state with saved configs from database
        // This ensures we're in sync with what's actually stored for ALL nodes
        setNodes((prevNodes) => {
          const updated = prevNodes.map((node) => {
            const savedNode = result.nodes?.find((n: any) => n.nodeId === node.id);
            if (savedNode) {
              return {
                ...node,
                data: {
                  ...node.data,
                  config: JSON.parse(JSON.stringify(savedNode.config || {})), // Deep clone from DB
                },
              };
            }
            return node;
          });
          return updated;
        });

        // Also update selectedNode with saved config
        const savedSelectedNode = result.nodes?.find((n: any) => n.nodeId === selectedNode.id);
        if (savedSelectedNode) {
          setSelectedNode((prev) => {
            if (!prev || prev.id !== selectedNode.id) return prev;
            return {
              ...prev,
              data: {
                ...prev.data,
                config: JSON.parse(JSON.stringify(savedSelectedNode.config || {})),
              },
            };
          });
        }

        if (onSaveSuccess && result.nodes) {
          onSaveSuccess(result.nodes);
        }
      } catch (error: any) {
        logger.error("[useNodeConfig] ❌ Error saving node config:", error);
        
        // Show user-friendly error message
        const errorMessage = error?.message || "Failed to save node configuration";
        toast.error("Failed to save node configuration", `${errorMessage}. Please try again.`);
        
        // Re-throw to allow component to handle if needed
        throw error;
      }
    },
    [selectedNode, automationId, nodes, setNodes, setSelectedNode, onSaveSuccess, onCancelAutoSave, queueSave]
  );

  return {
    updateNodeConfig,
  };
}
