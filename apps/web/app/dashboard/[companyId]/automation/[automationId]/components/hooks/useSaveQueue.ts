import { useRef, useCallback } from "react";
import { Node, Edge } from "@xyflow/react";

/**
 * Save queue to prevent race conditions between auto-save and config updates
 * Ensures only one save operation happens at a time
 */
export function useSaveQueue() {
  const isSavingRef = useRef(false);
  const pendingSaveRef = useRef<{
    nodes: Node[];
    edges: Edge[];
    resolve: (value: any) => void;
    reject: (error: Error) => void;
  } | null>(null);

  /**
   * Queue a save operation
   * If a save is in progress, queue this one to run after
   */
  const queueSave = useCallback(
    async (
      nodes: Node[],
      edges: Edge[],
      saveFn: (nodes: Node[], edges: Edge[]) => Promise<any>
    ): Promise<any> => {
      return new Promise((resolve, reject) => {
        // If already saving, queue this save
        if (isSavingRef.current) {
          pendingSaveRef.current = { nodes, edges, resolve, reject };
          return;
        }

        // Execute save immediately
        isSavingRef.current = true;
        saveFn(nodes, edges)
          .then((result) => {
            isSavingRef.current = false;
            resolve(result);

            // Process pending save if any
            if (pendingSaveRef.current) {
              const pending = pendingSaveRef.current;
              pendingSaveRef.current = null;
              queueSave(pending.nodes, pending.edges, saveFn)
                .then(pending.resolve)
                .catch(pending.reject);
            }
          })
          .catch((error) => {
            isSavingRef.current = false;
            reject(error);

            // Process pending save if any (even after error)
            if (pendingSaveRef.current) {
              const pending = pendingSaveRef.current;
              pendingSaveRef.current = null;
              queueSave(pending.nodes, pending.edges, saveFn)
                .then(pending.resolve)
                .catch(pending.reject);
            }
          });
      });
    },
    []
  );

  /**
   * Cancel pending save
   */
  const cancelPending = useCallback(() => {
    if (pendingSaveRef.current) {
      pendingSaveRef.current.reject(new Error("Save cancelled"));
      pendingSaveRef.current = null;
    }
  }, []);

  /**
   * Check if currently saving
   */
  const isSaving = useCallback(() => {
    return isSavingRef.current;
  }, []);

  return {
    queueSave,
    cancelPending,
    isSaving,
  };
}
