import { useState, useCallback, useEffect } from "react";
import { Node, Edge } from "@xyflow/react";

interface HistoryState {
  nodes: Node[];
  edges: Edge[];
}

/**
 * Hook for managing undo/redo history
 */
export function useNodeHistory(initialNodes: Node[], initialEdges: Edge[]) {
  const [history, setHistory] = useState<HistoryState[]>([
    { nodes: initialNodes, edges: initialEdges },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Reset history when initial state changes significantly
  useEffect(() => {
    const initialState: HistoryState = { nodes: initialNodes, edges: initialEdges };
    const currentState = history[historyIndex];
    
    // Only reset if the initial state is significantly different (e.g., loaded from DB)
    if (
      currentState.nodes.length !== initialNodes.length ||
      currentState.edges.length !== initialEdges.length
    ) {
      setHistory([initialState]);
      setHistoryIndex(0);
    }
  }, [initialNodes.length, initialEdges.length]); // Only depend on lengths to avoid excessive resets

  /**
   * Add a new state to history
   */
  const addToHistory = useCallback((nodes: Node[], edges: Edge[]) => {
    const currentState = JSON.stringify({ nodes, edges });
    const lastState = history.length > 0 ? JSON.stringify(history[historyIndex]) : "";

    // Only add to history if state actually changed
    if (currentState !== lastState) {
      // Remove any future history if we're not at the end
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push({ nodes, edges });
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  }, [history, historyIndex]);

  /**
   * Reset history with new initial state
   */
  const resetHistory = useCallback((nodes: Node[], edges: Edge[]) => {
    const initialState: HistoryState = { nodes, edges };
    setHistory([initialState]);
    setHistoryIndex(0);
  }, []);

  /**
   * Get previous state (undo)
   */
  const undo = useCallback((): HistoryState | null => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      return history[newIndex];
    }
    return null;
  }, [history, historyIndex]);

  /**
   * Get next state (redo)
   */
  const redo = useCallback((): HistoryState | null => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      return history[newIndex];
    }
    return null;
  }, [history, historyIndex]);

  /**
   * Check if undo is possible
   */
  const canUndo = historyIndex > 0;

  /**
   * Check if redo is possible
   */
  const canRedo = historyIndex < history.length - 1;

  return {
    addToHistory,
    resetHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    historyIndex,
    historyLength: history.length,
  };
}
