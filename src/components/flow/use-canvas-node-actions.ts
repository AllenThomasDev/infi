import type { NodeChange, ReactFlowInstance } from "@xyflow/react";
import { applyNodeChanges } from "@xyflow/react";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useMemo } from "react";
import type { FlowNode, GroupFlowNode } from "@/components/flow/types";

const GROUP_PADDING = 24;

function isGroupNode(node: FlowNode): node is GroupFlowNode {
  return node.type === "group";
}

const isSelectedTopLevel = (node: FlowNode) =>
  node.selected && !node.parentId && !isGroupNode(node);

const isSelectedGrouped = (node: FlowNode) =>
  node.selected && !!node.parentId && !isGroupNode(node);

const isSelectedGroup = (node: FlowNode) =>
  node.selected && isGroupNode(node);

function reparentNode(node: FlowNode, parentId: string): FlowNode {
  return {
    ...node,
    expandParent: true,
    parentId,
    extent: "parent" as const,
    selected: false,
  };
}

function buildChildrenIndex(nodes: FlowNode[]): Map<string, FlowNode[]> {
  const index = new Map<string, FlowNode[]>();
  for (const node of nodes) {
    if (node.parentId) {
      const children = index.get(node.parentId);
      if (children) {
        children.push(node);
      } else {
        index.set(node.parentId, [node]);
      }
    }
  }
  return index;
}

function getDescendantNodeIds(
  childrenIndex: Map<string, FlowNode[]>,
  parentId: string
): Set<string> {
  const descendantIds = new Set<string>();
  const stack = [parentId];

  while (stack.length > 0) {
    const currentParentId = stack.pop()!;
    const children = childrenIndex.get(currentParentId);
    if (!children) continue;

    for (const child of children) {
      if (!descendantIds.has(child.id)) {
        descendantIds.add(child.id);
        stack.push(child.id);
      }
    }
  }

  return descendantIds;
}

function removeEmptyGroups(nodes: FlowNode[]): FlowNode[] {
  const childrenIndex = buildChildrenIndex(nodes);
  const filtered = nodes.filter(
    (node) => !isGroupNode(node) || childrenIndex.has(node.id)
  );
  return filtered.length === nodes.length ? nodes : filtered;
}

interface UseCanvasNodeActionsOptions {
  nodes: FlowNode[];
  reactFlow: ReactFlowInstance;
  setNodes: Dispatch<SetStateAction<FlowNode[]>>;
}

export function useCanvasNodeActions({
  nodes,
  reactFlow,
  setNodes: rawSetNodes,
}: UseCanvasNodeActionsOptions) {
  const setNodes: Dispatch<SetStateAction<FlowNode[]>> = useCallback(
    (update) => {
      rawSetNodes((curr) => {
        const next = typeof update === "function" ? update(curr) : update;
        return removeEmptyGroups(next);
      });
    },
    [rawSetNodes]
  );

  const {
    selectedTopLevelNodes,
    selectedGroupedNodes,
    selectedGroupNodes,
    hasSelectedNodes,
  } = useMemo(() => {
    const topLevel: FlowNode[] = [];
    const grouped: FlowNode[] = [];
    const groups: FlowNode[] = [];
    let hasSelected = false;

    for (const node of nodes) {
      if (!node.selected) continue;
      hasSelected = true;
      if (isGroupNode(node)) {
        groups.push(node);
      } else if (node.parentId) {
        grouped.push(node);
      } else {
        topLevel.push(node);
      }
    }

    return {
      selectedTopLevelNodes: topLevel,
      selectedGroupedNodes: grouped,
      selectedGroupNodes: groups,
      hasSelectedNodes: hasSelected,
    };
  }, [nodes]);

  const selectAllNodes = useCallback(() => {
    setNodes((currentNodes) =>
      currentNodes.map((node) => ({ ...node, selected: true }))
    );
  }, [setNodes]);

  const deleteSelectedNodes = useCallback(() => {
    setNodes((currentNodes) => {
      const childrenIndex = buildChildrenIndex(currentNodes);
      const idsToDelete = new Set(
        currentNodes
          .filter((node) => node.selected)
          .flatMap((node) => {
            const descendantIds = isGroupNode(node)
              ? Array.from(getDescendantNodeIds(childrenIndex, node.id))
              : [];

            return [node.id, ...descendantIds];
          })
      );

      return currentNodes.filter((node) => !idsToDelete.has(node.id));
    });
  }, [setNodes]);

  const groupSelectedNodes = useCallback(() => {
    setNodes((currentNodes) => {
      const topLevel = currentNodes.filter(isSelectedTopLevel);

      if (topLevel.length === 0) return currentNodes;

      const selectedGroups = currentNodes.filter(isSelectedGroup);
      const selectedChildren = currentNodes.filter(isSelectedGrouped);

      const targetGroupIds = new Set<string>();
      for (const group of selectedGroups) {
        targetGroupIds.add(group.id);
      }
      for (const child of selectedChildren) {
        if (child.parentId) targetGroupIds.add(child.parentId);
      }

      if (targetGroupIds.size > 1) return currentNodes;

      const targetGroupId =
        targetGroupIds.size === 1
          ? targetGroupIds.values().next().value
          : undefined;

      if (targetGroupId) {
        const group = currentNodes.find((node) => node.id === targetGroupId);
        if (!group) return currentNodes;

        const addIds = new Set(topLevel.map((node) => node.id));
        return currentNodes.map((node) =>
          addIds.has(node.id) ? reparentNode(node, targetGroupId) : node
        );
      }

      if (topLevel.length < 2) return currentNodes;

      const bounds = reactFlow.getNodesBounds(topLevel);
      const groupId = `group-${crypto.randomUUID()}`;

      const groupPosition = {
        x: bounds.x - GROUP_PADDING,
        y: bounds.y - GROUP_PADDING,
      };

      const groupNode: GroupFlowNode = {
        id: groupId,
        type: "group",
        position: groupPosition,
        style: {
          width: bounds.width + GROUP_PADDING * 2,
          height: bounds.height + GROUP_PADDING * 2,
        },
        data: {},
      };

      const selectedIds = new Set(topLevel.map((node) => node.id));
      const nextNodes = currentNodes.map((node) =>
        selectedIds.has(node.id) ? reparentNode(node, groupId) : node
      );

      return [groupNode, ...nextNodes];
    });
  }, [reactFlow, setNodes]);

  const ungroupSelectedNodes = useCallback(() => {
    setNodes((currentNodes) => {
      const ungroupIds = new Set(
        currentNodes.filter(isSelectedGrouped).map((node) => node.id)
      );

      if (ungroupIds.size === 0) return currentNodes;

      return currentNodes.map((node) => {
        if (!ungroupIds.has(node.id)) return node;

        const { expandParent: _, parentId: __, extent: ___, ...rest } = node;
        return {
          ...rest,
          selected: false,
        };
      });
    });
  }, [setNodes]);

  const onNodesChange = useCallback(
    (changes: NodeChange<FlowNode>[]) => {
      setNodes((curr) => applyNodeChanges(changes, curr));
    },
    [setNodes]
  );

  return {
    deleteSelectedNodes,
    groupSelectedNodes,
    hasSelectedNodes,
    onNodesChange,
    selectedGroupNodes,
    selectedGroupedNodes,
    selectedTopLevelNodes,
    selectAllNodes,
    ungroupSelectedNodes,
  };
}
