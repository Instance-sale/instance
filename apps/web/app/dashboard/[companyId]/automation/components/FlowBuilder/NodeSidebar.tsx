"use client";

import { useCallback } from "react";
import { Node } from "@xyflow/react";
import { X, FolderInput, ArrowRight } from "lucide-react";
import { NODE_TYPES, AutomationNodeType } from "@/lib/automation/nodes";
import { NodeIcon } from "./node-icons";

interface NodeSidebarProps {
  onAddNode: (node: Node) => void;
  onClose?: () => void;
  onOpenImportModal?: () => void;
}

export default function NodeSidebar({ onAddNode, onClose, onOpenImportModal }: NodeSidebarProps) {
  const handleDragStart = useCallback(
    (event: React.DragEvent, nodeType: AutomationNodeType, label: string, icon: string) => {
      event.dataTransfer.setData("application/reactflow", JSON.stringify({
        type: getNodeCategory(nodeType),
        nodeType,
        label,
        icon,
      }));
      event.dataTransfer.effectAllowed = "move";
    },
    []
  );

  const getNodeCategory = (type: AutomationNodeType): string => {
    if (type === AutomationNodeType.ACTION_CONDITION || (type as string) === "ACTION_CONDITION") return "flow";
    if (type.startsWith("TRIGGER_")) return "trigger";
    if (type.startsWith("ACTION_")) return "action";
    return "flow";
  };

  return (
    <div className="w-full lg:w-72 h-full min-h-0 shrink-0 bg-white border-r border-slate-200 overflow-y-auto overflow-x-hidden shadow-sm z-10">
      <div className="p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-slate-900 text-lg">Add Nodes</h3>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Reusable Flow Template Import Card */}
        {onOpenImportModal && (
          <div className="mb-6 p-3.5 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-white shadow-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <FolderInput className="w-3.5 h-3.5 text-blue-600" />
                Import Flow
              </span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100/80 text-blue-700">
                Templates
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-2.5 leading-relaxed">
              Pull a pre-built sequence from another automation into your canvas.
            </p>
            <button
              type="button"
              onClick={onOpenImportModal}
              className="w-full py-1.5 px-3 rounded-lg bg-white border border-blue-200 text-blue-700 hover:bg-blue-50/80 hover:border-blue-300 text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Choose from Library</span>
              <ArrowRight className="w-3 h-3 text-blue-500" />
            </button>
          </div>
        )}

        {/* Triggers */}
        <div className="mb-8">
          <h4 className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 px-1">Triggers</h4>
          <div className="space-y-3">
            {NODE_TYPES.trigger.map((node) => (
              <div
                key={node.type}
                draggable
                onDragStart={(e) => handleDragStart(e, node.type, node.label, node.icon)}
                className="group p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-md hover:shadow-blue-500/5 cursor-grab active:cursor-grabbing transition-all duration-200"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-600 group-hover:scale-110 transition-transform flex items-center justify-center">
                    <NodeIcon icon={node.icon} size={20} />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-slate-900 group-hover:text-amber-700 transition-colors">{node.label}</div>
                    <div className="text-[11px] text-slate-500 leading-tight mt-0.5">{node.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="mb-8">
          <h4 className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 px-1">Actions</h4>
          <div className="space-y-3">
            {NODE_TYPES.action.map((node) => (
              <div
                key={node.type}
                draggable
                onDragStart={(e) => handleDragStart(e, node.type, node.label, node.icon)}
                className="group p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-md hover:shadow-blue-500/5 cursor-grab active:cursor-grabbing transition-all duration-200"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform flex items-center justify-center">
                    <NodeIcon icon={node.icon} size={20} />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-slate-900 group-hover:text-blue-700 transition-colors">{node.label}</div>
                    <div className="text-[11px] text-slate-500 leading-tight mt-0.5">{node.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Flow Control */}
        <div>
          <h4 className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 px-1">Flow Control</h4>
          <div className="space-y-3">
            {NODE_TYPES.flow.map((node) => (
              <div
                key={node.type}
                draggable
                onDragStart={(e) => handleDragStart(e, node.type, node.label, node.icon)}
                className="group p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-md hover:shadow-blue-500/5 cursor-grab active:cursor-grabbing transition-all duration-200"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-slate-100 text-slate-600 group-hover:bg-slate-200 group-hover:scale-110 transition-transform flex items-center justify-center">
                    <NodeIcon icon={node.icon} size={20} />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-slate-900 group-hover:text-slate-800 transition-colors">{node.label}</div>
                    <div className="text-[11px] text-slate-500 leading-tight mt-0.5">{node.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
