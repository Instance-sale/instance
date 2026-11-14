"use client";

import { createContext, useContext, useCallback, type ReactNode } from "react";
import { Node } from "@xyflow/react";
import {
  createStickyNoteId,
  DEFAULT_STICKY_NOTE,
  type StickyNoteData,
} from "./stickyNoteTypes";

interface StickyNoteContextValue {
  addStickyNoteNearNode: (linkedNodeId: string) => void;
  updateStickyNote: (noteId: string, updates: Partial<StickyNoteData>) => void;
  deleteStickyNote: (noteId: string) => void;
}

const StickyNoteContext = createContext<StickyNoteContextValue | null>(null);

export function useStickyNoteContext() {
  const ctx = useContext(StickyNoteContext);
  if (!ctx) {
    throw new Error("useStickyNoteContext must be used within StickyNoteProvider");
  }
  return ctx;
}

/** Safe hook for nodes that may render outside provider during SSR */
export function useStickyNoteContextOptional() {
  return useContext(StickyNoteContext);
}

interface StickyNoteProviderProps {
  nodes: Node[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  children: ReactNode;
}

const BASE_OFFSET = { x: 48, y: 24 };
const STACK_OFFSET = { x: 28, y: 28 };

export function StickyNoteProvider({
  nodes,
  setNodes,
  children,
}: StickyNoteProviderProps) {
  const addStickyNoteNearNode = useCallback(
    (linkedNodeId: string) => {
      const linkedNode = nodes.find((n) => n.id === linkedNodeId);
      if (!linkedNode || linkedNode.type === "note") return;

      const existingNotesForNode = nodes.filter(
        (n) =>
          n.type === "note" &&
          (n.data as unknown as StickyNoteData).linkedNodeId === linkedNodeId
      ).length;

      const position = {
        x:
          linkedNode.position.x +
          BASE_OFFSET.x +
          existingNotesForNode * STACK_OFFSET.x,
        y:
          linkedNode.position.y +
          BASE_OFFSET.y +
          existingNotesForNode * STACK_OFFSET.y,
      };

      const noteId = createStickyNoteId();
      const newNote: Node = {
        id: noteId,
        type: "note",
        position,
        selected: true,
        draggable: true,
        connectable: false,
        data: {
          ...DEFAULT_STICKY_NOTE,
          linkedNodeId,
        },
        style: {
          width: DEFAULT_STICKY_NOTE.width,
          height: DEFAULT_STICKY_NOTE.height,
        },
        zIndex: 1000,
      };

      setNodes((prev) => [
        ...prev.map((n) => ({ ...n, selected: false })),
        newNote,
      ]);
    },
    [nodes, setNodes]
  );

  const updateStickyNote = useCallback(
    (noteId: string, updates: Partial<StickyNoteData>) => {
      setNodes((prev) =>
        prev.map((node) => {
          if (node.id !== noteId || node.type !== "note") return node;
          const data = { ...(node.data as unknown as StickyNoteData), ...updates };
          const style =
            updates.width !== undefined || updates.height !== undefined
              ? {
                  width:
                    updates.width ??
                    (node.style as { width?: number })?.width ??
                    data.width,
                  height:
                    updates.height ??
                    (node.style as { height?: number })?.height ??
                    data.height,
                }
              : node.style;
          if (updates.autoFocus === undefined && "autoFocus" in data) {
            delete (data as { autoFocus?: boolean }).autoFocus;
          }
          return { ...node, data, style };
        })
      );
    },
    [setNodes]
  );

  const deleteStickyNote = useCallback(
    (noteId: string) => {
      setNodes((prev) => prev.filter((n) => n.id !== noteId));
    },
    [setNodes]
  );

  return (
    <StickyNoteContext.Provider
      value={{ addStickyNoteNearNode, updateStickyNote, deleteStickyNote }}
    >
      {children}
    </StickyNoteContext.Provider>
  );
}
