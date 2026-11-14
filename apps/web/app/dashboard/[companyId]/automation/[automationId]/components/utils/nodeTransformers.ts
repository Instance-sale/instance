import { Node, Edge } from "@xyflow/react";
import { logger } from "@/lib/logger";
import type { PersistedStickyNote } from "../../../components/FlowBuilder/stickyNoteTypes";
import { getExecutionNodes, normalizeStickyNoteFontSize } from "../../../components/FlowBuilder/stickyNoteTypes";
import { formatActionDelayLabel } from "@/lib/automation/action-delay-steps";

/**
 * Node transformation utilities
 * Converts between database format and ReactFlow format
 */

export interface DatabaseNode {
  nodeId: string;
  type: string;
  position: { x: number; y: number };
  config: any;
  nextNodeIds: string[];
}

/**
 * Get ReactFlow node type from database node type
 */
export function getNodeType(type: string): string {
  if (type === "ACTION_CONDITION") return "flow";
  if (type.startsWith("TRIGGER_")) return "trigger";
  if (type.startsWith("ACTION_")) return "action";
  return "flow";
}

/**
 * Get node label from type
 */
export function getNodeLabel(type: string): string {
  const labels: Record<string, string> = {
    TRIGGER_DM: "DM Received",
    TRIGGER_COMMENT: "Comment",
    TRIGGER_STORY: "Story Reply",
    TRIGGER_FOLLOWER: "New Follower",
    ACTION_SEND_DM: "Send DM",
    ACTION_REPLY_DM: "Reply DM",
    ACTION_REPLY_COMMENT: "Reply Comment",
    ACTION_WAIT: "Wait (legacy)",
    ACTION_WAIT_FOR_REPLY: "Wait for Reply (legacy)",
    ACTION_CONDITION: "Condition",
    ACTION_SET_VARIABLE: "Set Variable",
    FLOW_SPLIT: "Split",
    FLOW_RANDOM: "Randomizer",
    FLOW_END: "End (legacy)",
  };
  return labels[type] || type.replace(/_/g, " ");
}

/** Short subtitle shown on action nodes in the canvas */
export function getNodeSubtitle(type: string, config: Record<string, unknown>): string | undefined {
  const parts: string[] = [];
  if (config?.delayEnabled) {
    parts.push(`Wait ${formatActionDelayLabel((config.delaySeconds as number) ?? 3)}`);
  }
  if (type === "ACTION_REPLY_DM" && config?.waitForReplyAfterSend === true) {
    parts.push("Waits for reply");
  }
  if (type === "TRIGGER_STORY") {
    const sType = String(config?.storyType || "").toLowerCase();
    if (sType === "reaction") {
      parts.push("Story Reaction");
    } else if (sType === "reply") {
      parts.push("Story Reply");
    } else {
      parts.push("Story Mention");
    }
  }
  if (type === "TRIGGER_FOLLOWER") {
    parts.push("Follower Gate");
  }
  if (config?.fuzzyMatch) {
    parts.push("Smart Typo");
  }
  if (config?.audienceFilter === "FIRST_TIME") {
    parts.push("First-time only");
  } else if (config?.audienceFilter === "RETURNING") {
    parts.push("Returning only");
  }
  if (Array.isArray(config?.messageVariations) && config.messageVariations.length > 0) {
    parts.push(`${config.messageVariations.length} variations`);
  }
  if (config?.autoLikeComment) {
    parts.push("Auto-like ❤️");
  }
  if (config?.autoHideNegative || config?.autoHideSpam) {
    parts.push("Shield");
  }
  if (config?.enableFollowerTier) {
    parts.push(`VIP > ${((config.followerThreshold as number) || 5000).toLocaleString()}`);
  }
  if (config?.generatePromoCode) {
    parts.push("Urgent Coupon");
  }
  if (config?.mediaType === "AUDIO") {
    parts.push("Voice Memo");
  } else if (config?.mediaType === "FILE") {
    parts.push("PDF Document");
  }
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

/**
 * Get node icon from type
 */
export function getNodeIcon(type: string): string {
  const icons: Record<string, string> = {
    // Triggers (match NODE_TYPES in lib/automation/nodes.ts)
    TRIGGER_DM: "message-circle",
    TRIGGER_COMMENT: "message-square",
    TRIGGER_STORY: "image",
    TRIGGER_FOLLOWER: "user-plus",
    // Actions
    ACTION_SEND_DM: "send",
    ACTION_REPLY_DM: "reply",
    ACTION_REPLY_COMMENT: "corner-down-left",
    ACTION_WAIT: "timer",
    ACTION_WAIT_FOR_REPLY: "clock",
    ACTION_SET_VARIABLE: "database",
    // Flow control
    ACTION_CONDITION: "git-branch",
    FLOW_RANDOM: "shuffle",
    FLOW_SPLIT: "share-2",
    FLOW_END: "flag",
  };
  return icons[type] || "settings";
}

/**
 * Convert database nodes to ReactFlow nodes
 */
export function dbNodesToFlowNodes(dbNodes: DatabaseNode[]): Node[] {
  return dbNodes.map((node) => {
    // Validate node data
    if (!node.nodeId) {
      logger.error("[nodeTransformers] Node missing nodeId:", node);
    }
    if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
      logger.warn("[nodeTransformers] Node missing position, using default:", node.nodeId);
      node.position = { x: 0, y: 0 };
    }

    // CRITICAL: Deep clone config to ensure it's preserved
    // Don't use node.config directly - it might be a Prisma JsonValue that needs parsing
    let nodeConfig = {};
    try {
      if (node.config) {
        // Handle Prisma JsonValue (could be object, array, or already parsed)
        if (typeof node.config === 'string') {
          nodeConfig = JSON.parse(node.config);
        } else if (typeof node.config === 'object') {
          nodeConfig = JSON.parse(JSON.stringify(node.config)); // Deep clone
        } else {
          nodeConfig = node.config;
        }
      }
    } catch (error) {
      logger.error(`[nodeTransformers] Failed to parse config for node ${node.nodeId}:`, error);
      nodeConfig = {};
    }

    // Log if config is being lost
    const originalConfigKeys = typeof node.config === 'object' && node.config !== null 
      ? Object.keys(node.config) 
      : [];
    const finalConfigKeys = Object.keys(nodeConfig);
    
    if (originalConfigKeys.length > 0 && finalConfigKeys.length === 0) {
      logger.error(`[nodeTransformers] ❌ Config loss for node ${node.nodeId}! Original had ${originalConfigKeys.length} keys, final has 0.`);
      logger.error(`[nodeTransformers]   Original config:`, node.config);
    }

    return {
      id: node.nodeId,
      type: getNodeType(node.type),
      position: node.position as { x: number; y: number },
      data: {
        label: getNodeLabel(node.type),
        description: getNodeSubtitle(node.type, nodeConfig as Record<string, unknown>),
        icon: getNodeIcon(node.type),
        type: node.type,
        config: nodeConfig, // Use parsed/cloned config
      },
    };
  });
}

/**
 * Convert database nodes to ReactFlow edges
 */
export function dbNodesToFlowEdges(dbNodes: DatabaseNode[]): Edge[] {
  const edges: Edge[] = [];
  
  dbNodes.forEach((node) => {
    if (node.nextNodeIds && Array.isArray(node.nextNodeIds) && node.nextNodeIds.length > 0) {
      if (node.type === "ACTION_CONDITION") {
        const configPaths = (node.config as any)?.conditionPaths;
        const truePath = configPaths?.true ?? (node.nextNodeIds[0] && node.nextNodeIds[0] !== "__EMPTY__" ? node.nextNodeIds[0] : null);
        const falsePath = configPaths?.false ?? (node.nextNodeIds[1] && node.nextNodeIds[1] !== "__EMPTY__" ? node.nextNodeIds[1] : null);
        
        if (truePath) {
          edges.push({
            id: `${node.nodeId}-true-${truePath}`,
            source: node.nodeId,
            target: truePath,
            sourceHandle: "true",
            style: { stroke: "#10b981" },
          });
        }
        
        if (falsePath) {
          edges.push({
            id: `${node.nodeId}-false-${falsePath}`,
            source: node.nodeId,
            target: falsePath,
            sourceHandle: "false",
            style: { stroke: "#ef4444" },
          });
        }
      } else if (node.type === "FLOW_RANDOM") {
        const randomPaths = (node.config as any)?.randomPaths;
        const splitBranches = (node.config as any)?.splitBranches;
        if (Array.isArray(splitBranches) && splitBranches.length > 0) {
          splitBranches.forEach((sb: any, idx: number) => {
            if (sb.target && sb.target !== "__EMPTY__") {
              const branchIdx = sb.branchIndex ?? idx;
              edges.push({
                id: `${node.nodeId}-branch-${branchIdx}-${sb.target}`,
                source: node.nodeId,
                target: sb.target,
                sourceHandle: `branch-${branchIdx}`,
                style: { stroke: "#3b82f6" },
              });
            }
          });
        } else {
          node.nextNodeIds.forEach((nextId: string, idx: number) => {
            if (nextId && nextId !== "__EMPTY__") {
              edges.push({
                id: `${node.nodeId}-branch-${idx}-${nextId}`,
                source: node.nodeId,
                target: nextId,
                sourceHandle: `branch-${idx}`,
                style: { stroke: "#3b82f6" },
              });
            }
          });
        }
      } else if (node.type === "ACTION_SEND_DM" || node.type === "ACTION_REPLY_DM") {
        const buttonPaths = (node.config as any)?.buttonPaths;
        const defaultPath = (node.config as any)?.defaultPath;
        const buttons = Array.isArray((node.config as any)?.buttons) ? (node.config as any).buttons : [];

        let hasExplicitPath = false;

        // 1. Button branch edges
        if (buttonPaths && typeof buttonPaths === "object") {
          Object.entries(buttonPaths).forEach(([idxStr, targetId]) => {
            if (targetId && typeof targetId === "string" && targetId !== "__EMPTY__") {
              const idx = parseInt(idxStr, 10);
              const btn = !isNaN(idx) ? buttons[idx] : undefined;
              if (btn && btn.type !== "link" && btn.enableBranch) {
                hasExplicitPath = true;
                edges.push({
                  id: `${node.nodeId}-button-${idxStr}-${targetId}`,
                  source: node.nodeId,
                  target: targetId,
                  sourceHandle: `button-${idxStr}`,
                  data: {
                    label: btn?.title || `Option ${(!isNaN(idx) ? idx : 0) + 1}`,
                  },
                });
              }
            }
          });
        }

        // 2. Default path edge
        if (defaultPath && defaultPath !== "__EMPTY__") {
          hasExplicitPath = true;
          edges.push({
            id: `${node.nodeId}-default-${defaultPath}`,
            source: node.nodeId,
            target: defaultPath,
            sourceHandle: "default",
          });
        }

        // 3. Fallback for legacy flows without buttonPaths/defaultPath
        if (!hasExplicitPath && Array.isArray(node.nextNodeIds)) {
          node.nextNodeIds.forEach((nextId: string) => {
            if (nextId && nextId !== "__EMPTY__") {
              edges.push({
                id: `${node.nodeId}-${nextId}`,
                source: node.nodeId,
                target: nextId,
                sourceHandle: "default",
              });
            }
          });
        }
      } else {
        // Regular nodes: just collect all targets
        node.nextNodeIds.forEach((nextId: string) => {
          if (nextId && nextId !== "__EMPTY__") {
            edges.push({
              id: `${node.nodeId}-${nextId}`,
              source: node.nodeId,
              target: nextId,
            });
          }
        });
      }
    }
  });

  return edges;
}

/**
 * Parse sticky notes from Automation.flowData
 */
export function parseStickyNotesFromFlowData(flowData: unknown): PersistedStickyNote[] {
  if (!flowData || typeof flowData !== "object") return [];
  const stickyNotes = (flowData as { stickyNotes?: PersistedStickyNote[] }).stickyNotes;
  return Array.isArray(stickyNotes) ? stickyNotes : [];
}

/**
 * Convert persisted sticky notes to React Flow note nodes
 */
export function stickyNotesToFlowNodes(stickyNotes: PersistedStickyNote[]): Node[] {
  return stickyNotes.map((note) => ({
    id: note.id,
    type: "note",
    position: note.position,
    data: {
      content: note.content,
      color: note.color,
      width: note.width,
      height: note.height,
      fontSize: normalizeStickyNoteFontSize(note.fontSize),
      linkedNodeId: note.linkedNodeId,
    },
    style: {
      width: note.width,
      height: note.height,
    },
    draggable: true,
    connectable: false,
    zIndex: 1000,
  }));
}

/**
 * Convert React Flow note nodes to persisted sticky notes
 */
export function flowNodesToStickyNotes(nodes: Node[]): PersistedStickyNote[] {
  return nodes
    .filter((node) => node.type === "note")
    .map((node) => {
      const data = node.data as {
        content?: string;
        color?: PersistedStickyNote["color"];
        width?: number;
        height?: number;
        fontSize?: number | string;
        linkedNodeId?: string;
      };
      const style = node.style as { width?: number; height?: number } | undefined;
      return {
        id: node.id,
        position: node.position,
        width: data.width ?? style?.width ?? 220,
        height: data.height ?? style?.height ?? 140,
        content: data.content ?? "",
        color: data.color ?? "yellow",
        fontSize: normalizeStickyNoteFontSize(data.fontSize),
        linkedNodeId: data.linkedNodeId,
      };
    });
}

export { getExecutionNodes };

/**
 * Convert ReactFlow nodes and edges to database format
 */
export function flowNodesToDbNodes(nodes: Node[], edges: Edge[]): DatabaseNode[] {
  return getExecutionNodes(nodes).map((node) => {
    // Find connected nodes using edges
    const connectedEdges = edges.filter((e) => e.source === node.id);
    
    // Deep clone config to preserve it
    const nodeConfig = JSON.parse(JSON.stringify((node.data as any)?.config || {}));
    const nodeType = ((node.data as any)?.type || (node.data as any)?.nodeType || node.type || "") as string;
    let nextNodeIds: string[] = [];

    if (nodeType === "ACTION_CONDITION") {
      const isFollowerGate = Boolean(nodeConfig.isFollowerGate) || (!nodeConfig.conditionGroups?.length && (nodeConfig.condition?.fieldType === "follower" || nodeConfig.fieldType === "follower") && Boolean(nodeConfig.message));
      if (isFollowerGate) {
        const nextEdge = connectedEdges.find((e) => e.sourceHandle === "true") || connectedEdges[0];
        nodeConfig.conditionPaths = {
          true: nextEdge?.target || null,
          false: null,
        };
        nextNodeIds = nextEdge?.target ? [nextEdge.target] : [];
      } else {
        const trueEdge = connectedEdges.find((e) => e.sourceHandle === "true");
        const falseEdge = connectedEdges.find((e) => e.sourceHandle === "false");

        nodeConfig.conditionPaths = {
          true: trueEdge?.target || null,
          false: falseEdge?.target || null,
        };

        nextNodeIds = [
          trueEdge?.target || "__EMPTY__",
          falseEdge?.target || "__EMPTY__",
        ];
      }
    } else if (nodeType === "FLOW_RANDOM") {
      const randomEdges = connectedEdges.map((e, idx) => {
        const handle = e.sourceHandle || (e as any)?.sourceHandleId || "";
        const pathIndex = handle.startsWith("path-")
          ? parseInt(handle.replace("path-", ""), 10)
          : idx;
        return { pathIndex, target: e.target };
      }).sort((a, b) => a.pathIndex - b.pathIndex);
      nodeConfig.randomPaths = randomEdges;
      nextNodeIds = randomEdges.map((r) => r.target);
    } else if (nodeType === "FLOW_SPLIT") {
      const splitEdges = connectedEdges.map((e, idx) => {
        const branchIndex = e.sourceHandle?.startsWith("branch-")
          ? parseInt(e.sourceHandle.replace("branch-", ""), 10)
          : idx;
        return { branchIndex, target: e.target };
      });
      nodeConfig.splitBranches = splitEdges;
      nextNodeIds = splitEdges.map((s) => s.target);
    } else if (nodeType === "ACTION_SEND_DM" || nodeType === "ACTION_REPLY_DM") {
      const buttonPaths: Record<string, string> = {};
      let defaultPath: string | null = null;
      const allNextNodeIds: string[] = [];
      const buttons = Array.isArray(nodeConfig.buttons) ? nodeConfig.buttons : [];

      connectedEdges.forEach((e) => {
        const handle = e.sourceHandle || (e as any)?.sourceHandleId || "";
        if (handle.startsWith("button-")) {
          const idx = parseInt(handle.replace("button-", ""), 10);
          const btn = !isNaN(idx) ? buttons[idx] : undefined;
          if (btn && btn.type !== "link" && btn.enableBranch && e.target) {
            buttonPaths[String(idx)] = e.target;
            if (!allNextNodeIds.includes(e.target)) {
              allNextNodeIds.push(e.target);
            }
          }
        } else if (handle === "default" || !handle) {
          if (e.target) {
            defaultPath = e.target;
            if (!allNextNodeIds.includes(e.target)) {
              allNextNodeIds.unshift(e.target);
            }
          }
        } else if (e.target && !allNextNodeIds.includes(e.target)) {
          allNextNodeIds.push(e.target);
        }
      });

      if (Object.keys(buttonPaths).length > 0) {
        nodeConfig.buttonPaths = buttonPaths;
      } else {
        delete nodeConfig.buttonPaths;
      }

      if (defaultPath) {
        nodeConfig.defaultPath = defaultPath;
      } else {
        delete nodeConfig.defaultPath;
      }

      nextNodeIds = allNextNodeIds;
    } else {
      // Regular nodes: just collect all targets
      nextNodeIds = connectedEdges.map((e) => e.target);
    }

    return {
      nodeId: node.id,
      type: nodeType,
      position: node.position,
      config: nodeConfig,
      nextNodeIds,
    };
  });
}

