import { useState, useEffect, useCallback } from "react";
import { Node, Edge } from "@xyflow/react";
import {
  dbNodesToFlowNodes,
  dbNodesToFlowEdges,
  parseStickyNotesFromFlowData,
  stickyNotesToFlowNodes,
} from "../utils/nodeTransformers";
import { logger } from "@/lib/logger";

interface DatabaseNode {
  nodeId: string;
  type: string;
  position: { x: number; y: number };
  config: any;
  nextNodeIds: string[];
}

interface UseAutomationStateOptions {
  automation: {
    id: string;
    name: string;
    nodes?: DatabaseNode[];
    flowData?: unknown;
    mediaId?: string | null;
    mediaType?: string | null;
  };
}

/**
 * Hook for managing automation state (nodes and edges)
 */
export function useAutomationState({ automation }: UseAutomationStateOptions) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  /**
   * Initialize state from database nodes
   */
  useEffect(() => {
    logger.log("[useAutomationState] Loading automation:", automation.id);
    logger.log("[useAutomationState] Automation name:", automation.name);
    logger.log("[useAutomationState] Nodes from database:", automation.nodes?.length || 0);

    const stickyNotes = parseStickyNotesFromFlowData(automation.flowData);
    const noteNodes = stickyNotesToFlowNodes(stickyNotes);

    if (!automation.nodes || automation.nodes.length === 0) {
      logger.warn("[useAutomationState] No execution nodes in database for automation:", automation.id);
      setNodes(noteNodes);
      setEdges([]);
      setIsInitialized(true);
      return;
    }

    // Convert database nodes to ReactFlow nodes
    const flowNodes = [...dbNodesToFlowNodes(automation.nodes), ...noteNodes];
    const flowEdges = dbNodesToFlowEdges(automation.nodes);

    // CRITICAL: Validate that configs are preserved
    flowNodes.forEach((node, index) => {
      const dbNode = automation.nodes?.[index];
      const config = (node.data as any)?.config || {};
      const configKeys = Object.keys(config);
      const dbConfigKeys = Object.keys(dbNode?.config || {});
      
      if (dbConfigKeys.length > 0 && configKeys.length === 0) {
        logger.error(`[useAutomationState] ❌ Config loss detected for node ${node.id}! DB has ${dbConfigKeys.length} keys but flow node has 0.`);
        logger.error(`[useAutomationState]   DB config:`, dbNode?.config);
        logger.error(`[useAutomationState]   Flow config:`, config);
      } else if (configKeys.length > 0) {
        logger.log(`[useAutomationState] ✅ Node ${node.id} (${(node.data as any)?.type}) has config: ${configKeys.join(", ")}`);
      }
    });

    // Sync automation.mediaId to story trigger node config if present
    if (automation.mediaId && automation.mediaType === "STORY") {
      const storyTriggerNode = flowNodes.find(
        (node) => (node.data as any)?.type === "TRIGGER_STORY"
      );
      if (storyTriggerNode) {
        logger.log(`[useAutomationState] Syncing automation.mediaId (${automation.mediaId}) to story trigger node config`);
        const nodeData = storyTriggerNode.data as any;
        nodeData.config = {
          ...nodeData.config,
          selectedMediaId: automation.mediaId,
          selectedMediaType: automation.mediaType,
        };
      }
    }

    logger.log(
      "[useAutomationState] Created",
      flowNodes.length,
      "nodes and",
      flowEdges.length,
      "edges"
    );

    setNodes(flowNodes);
    setEdges(flowEdges);
    setIsInitialized(true);
  }, [automation.id, automation.nodes, automation.flowData]);

  /**
   * Handle node click
   */
  const handleNodeClick = useCallback(
    (node: Node) => {
      if (node.type === "note") {
        return;
      }
      // Always get the latest node from the nodes array to ensure we have the latest config
      const latestNode = nodes.find((n) => n.id === node.id) || node;
      logger.log("[useAutomationState] Node clicked:", latestNode.id, "Config:", latestNode.data.config);
      setSelectedNode(latestNode);
    },
    [nodes]
  );

  /**
   * Sync nodes from database response
   */
  const syncNodesFromDatabase = useCallback((savedNodes: DatabaseNode[]) => {
    setNodes((prevNodes) => {
      return prevNodes.map((node) => {
        if (node.type === "note") {
          return node;
        }
        const savedNode = savedNodes.find((n) => n.nodeId === node.id);
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
    });
  }, []);

  return {
    nodes,
    edges,
    selectedNode,
    isInitialized,
    setNodes,
    setEdges,
    setSelectedNode,
    handleNodeClick,
    syncNodesFromDatabase,
  };
}
