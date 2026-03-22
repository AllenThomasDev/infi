import type { NodeChange, ReactFlowInstance } from "@xyflow/react";
import { applyNodeChanges } from "@xyflow/react";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useMemo } from "react";
import type { FlowNode } from "@/components/flow/types";

interface UseCanvasNodeActionsOptions {
  nodes: FlowNode[];
  reactFlow: ReactFlowInstance;
  setNodes: Dispatch<SetStateAction<FlowNode[]>>;
}

export function useCanvasNodeActions({
  nodes,
  reactFlow,
  setNodes,
}: UseCanvasNodeActionsOptions) {
  const hasSelectedNodes = useMemo(
    () => nodes.some((node) => node.selected),
    [nodes],
  );

  const selectAllNodes = useCallback(() => {
    setNodes((currentNodes) =>
      currentNodes.map((node) => ({ ...node, selected: true }))
    );
  }, [setNodes]);

  const deleteSelectedNodes = useCallback(() => {
    setNodes((currentNodes) =>
      currentNodes.filter((node) => !node.selected)
    );
  }, [setNodes]);

  const onNodesChange = useCallback(
    (changes: NodeChange<FlowNode>[]) => {
      setNodes((curr) => applyNodeChanges(changes, curr));
    },
    [setNodes]
  );

  return {
    deleteSelectedNodes,
    hasSelectedNodes,
    onNodesChange,
    selectAllNodes,
  };
}
