"use client";

import { useCallback, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  Connection,
  Edge,
  Node,
  applyEdgeChanges,
  applyNodeChanges,
  MarkerType,
  ConnectionLineType,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import TriggerNode from "./nodes/TriggerNode";
import ActionNode from "./nodes/ActionNode";
import FlowNode from "./nodes/FlowNode";
import StickyNoteNode from "./nodes/StickyNoteNode";
import AutomationEdge from "./AutomationEdge";
import { logger } from "@/lib/logger";
import { toast } from "@/lib/toast";
import { getExecutionNodes } from "./stickyNoteTypes";
import { AlertTriangle } from "lucide-react";

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  flow: FlowNode,
  note: StickyNoteNode,
};

const edgeTypes = {
  automation: AutomationEdge,
};

/** Max workflow nodes allowed — sticky notes are excluded */
const MAX_NODES = 50;

const defaultEdgeOptions = {
  type: "automation",
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 20,
    height: 20,
  },
  style: {
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  },
};

interface FlowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (nodes: Node[]) => void;
  onEdgesChange: (edges: Edge[]) => void;
  onNodeClick?: (node: Node) => void;
}

export default function FlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onNodeClick,
}: FlowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const updated = applyNodeChanges(changes, nodes).map((node) => {
        if (node.type !== "note") return node;
        const dimChange = changes.find(
          (c) => c.type === "dimensions" && "id" in c && c.id === node.id
        );
        if (dimChange && dimChange.type === "dimensions" && dimChange.dimensions) {
          const flowNode = node as Node;
          return {
            ...flowNode,
            style: {
              ...(flowNode.style ?? {}),
              width: dimChange.dimensions.width,
              height: dimChange.dimensions.height,
            },
            data: {
              ...flowNode.data,
              width: dimChange.dimensions.width,
              height: dimChange.dimensions.height,
            },
          };
        }
        return node;
      });
      onNodesChange(updated);
    },
    [nodes, onNodesChange]
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(applyEdgeChanges(changes, edges));
    },
    [edges, onEdgesChange]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      let edgeParams: any = params;
      if (params.sourceHandle?.startsWith("button-")) {
        const sourceNode = nodes.find((n) => n.id === params.source);
        const buttons = (sourceNode?.data as any)?.config?.buttons;
        if (Array.isArray(buttons)) {
          const btnIdx = parseInt(params.sourceHandle.replace("button-", ""), 10);
          if (!isNaN(btnIdx) && buttons[btnIdx]?.title) {
            edgeParams = {
              ...params,
              data: { label: buttons[btnIdx].title },
            };
          }
        }
      }
      onEdgesChange(addEdge(edgeParams, edges));
    },
    [edges, nodes, onEdgesChange]
  );

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      onNodeClick?.(node);
    },
    [onNodeClick]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const data = event.dataTransfer.getData("application/reactflow");

      if (!data || !reactFlowBounds) return;

      try {
        const nodeData = JSON.parse(data);
        const executionCount = getExecutionNodes(nodes).length;

        if (executionCount >= MAX_NODES) {
          const msg = `You've reached the maximum of ${MAX_NODES} nodes. Please remove a node before adding more.`;
          setLimitMessage(msg);
          toast.warning("Node limit reached", msg);
          setTimeout(() => setLimitMessage(null), 5000);
          return;
        }

        const position = {
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        };

        const uniqueId = `${nodeData.nodeType}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        const resolvedType =
          nodeData.nodeType === "ACTION_CONDITION" ? "flow" : nodeData.type;

        const newNode: Node = {
          id: uniqueId,
          type: resolvedType,
          position,
          data: {
            label: nodeData.label,
            icon: nodeData.icon,
            type: nodeData.nodeType,
            config: {},
          },
        };

        onNodesChange([...nodes, newNode]);
      } catch (error: any) {
        logger.error("Error adding node:", error);
        toast.error("Failed to add node", error?.message || "Invalid node format.");
      }
    },
    [nodes, onNodesChange]
  );

  return (
    <div className="h-full w-full relative z-0" ref={reactFlowWrapper}>
      {limitMessage && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 bg-amber-500 text-white text-sm font-medium rounded-lg shadow-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-white" />
          <span>{limitMessage}</span>
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionLineType={ConnectionLineType.Bezier}
        connectionLineStyle={{
          stroke: "#94a3b8",
          strokeWidth: 3,
          strokeLinecap: "round",
          strokeLinejoin: "round",
        }}
        nodesConnectable
        elementsSelectable
        fitView
        className="bg-slate-50/50"
      >
        <Background gap={20} size={1} color="#e2e8f0" />
        <Controls className="bg-white border-slate-200 shadow-sm rounded-lg" />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === "note") return "#fbbf24";
            if (node.type === "trigger") return "#8b5cf6";
            if (node.type === "action") return "#3b82f6";
            return "#94a3b8";
          }}
          className="bg-white border-slate-200 shadow-sm rounded-lg"
        />
      </ReactFlow>
    </div>
  );
}
