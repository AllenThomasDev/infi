import type { BuiltInNode, ReactFlowInstance } from "@xyflow/react";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useMemo } from "react";
import type { WindowFlowNode } from "@/components/flow/window-node";

export type GroupFlowNode = BuiltInNode & { type: "group" };
export type FlowNode = WindowFlowNode | GroupFlowNode;

const GROUP_PADDING = 24;

function isGroupNode(node: FlowNode): node is GroupFlowNode {
  return node.type === "group";
}

function getDescendantNodeIds(
  nodes: FlowNode[],
  parentId: string
): Set<string> {
  const descendantIds = new Set<string>();
  const stack = [parentId];

  while (stack.length > 0) {
    const currentParentId = stack.pop();
    if (!currentParentId) {
      continue;
    }

    for (const node of nodes) {
      if (node.parentId !== currentParentId || descendantIds.has(node.id)) {
        continue;
      }
      descendantIds.add(node.id);
      stack.push(node.id);
    }
  }

  return descendantIds;
}

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
  const selectedTopLevelNodes = useMemo(
    () =>
      nodes.filter(
        (node) => node.selected && !node.parentId && !isGroupNode(node)
      ),
    [nodes]
  );

  const selectedGroupNodes = useMemo(
    () => nodes.filter((node) => node.selected && isGroupNode(node)),
    [nodes]
  );

  const hasSelectedNodes = useMemo(
    () => nodes.some((node) => node.selected),
    [nodes]
  );

  const selectAllNodes = useCallback(() => {
    setNodes((currentNodes) =>
      currentNodes.map((node) => ({ ...node, selected: true }))
    );
  }, [setNodes]);

  const deleteSelectedNodes = useCallback(() => {
    setNodes((currentNodes) => {
      const idsToDelete = new Set(
        currentNodes
          .filter((node) => node.selected)
          .flatMap((node) => {
            const descendantIds = isGroupNode(node)
              ? Array.from(getDescendantNodeIds(currentNodes, node.id))
              : [];

            return [node.id, ...descendantIds];
          })
      );

      return currentNodes.filter((node) => !idsToDelete.has(node.id));
    });
  }, [setNodes]);

  const groupSelectedNodes = useCallback(() => {
    if (selectedTopLevelNodes.length < 2) {
      return;
    }

    const bounds = reactFlow.getNodesBounds(selectedTopLevelNodes);
    const groupId = `group-${crypto.randomUUID()}`;

    const groupNode: GroupFlowNode = {
      id: groupId,
      type: "group",
      position: {
        x: bounds.x - GROUP_PADDING,
        y: bounds.y - GROUP_PADDING,
      },
      style: {
        width: bounds.width + GROUP_PADDING * 2,
        height: bounds.height + GROUP_PADDING * 2,
        borderRadius: 8,
        border: "1px dashed var(--color-border)",
        background: "color-mix(in oklab, var(--color-muted) 35%, transparent)",
      },
      data: {},
    };

    setNodes((currentNodes) => {
      const selectedIds = new Set(selectedTopLevelNodes.map((node) => node.id));
      const nextNodes = currentNodes.map((node) => {
        if (!selectedIds.has(node.id)) {
          return node;
        }

        return {
          ...node,
          expandParent: true,
          parentId: groupId,
          extent: "parent" as const,
          position: {
            x: node.position.x - groupNode.position.x,
            y: node.position.y - groupNode.position.y,
          },
          selected: false,
        };
      });

      return [groupNode, ...nextNodes];
    });
  }, [reactFlow, selectedTopLevelNodes, setNodes]);

  const ungroupSelectedNodes = useCallback(() => {
    if (selectedGroupNodes.length === 0) {
      return;
    }

    setNodes((currentNodes) => {
      const selectedGroupIds = new Set(
        selectedGroupNodes.map((node) => node.id)
      );
      const groupLookup = new Map(
        selectedGroupNodes.map((node) => [node.id, node])
      );

      return currentNodes.flatMap((node) => {
        if (selectedGroupIds.has(node.id)) {
          return [];
        }

        const parentGroup = node.parentId
          ? groupLookup.get(node.parentId)
          : undefined;
        if (!parentGroup) {
          return [node];
        }

        return [
          {
            ...node,
            expandParent: undefined,
            parentId: undefined,
            extent: undefined,
            position: {
              x: parentGroup.position.x + node.position.x,
              y: parentGroup.position.y + node.position.y,
            },
            selected: false,
          },
        ];
      });
    });
  }, [selectedGroupNodes, setNodes]);

  return {
    deleteSelectedNodes,
    groupSelectedNodes,
    hasSelectedNodes,
    selectedGroupNodes,
    selectedTopLevelNodes,
    selectAllNodes,
    ungroupSelectedNodes,
  };
}
