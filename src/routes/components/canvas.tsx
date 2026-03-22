import {
  Background,
  BackgroundVariant,
  Controls,
  type OnSelectionChangeFunc,
  ReactFlow,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  flowNodeTypes,
  type NodeType,
  nodeRegistry,
} from "@/components/flow/node-registry";
import type { FlowNode } from "@/components/flow/types";
import { useCanvasNodeActions } from "@/components/flow/use-canvas-node-actions";
import { TileActionsContext } from "@/components/flow/use-tile-actions";
import { useTheme } from "@/components/theme-provider";
import { WorkspaceContext } from "@/components/workspace/workspace-context";
import type {
  CommandHandlerMap,
  ShortcutMatchContext,
} from "@/keybindings/types";
import { useTilingLayout } from "@/layout/use-tiling-layout";

function isInputFocused() {
  return (
    document.activeElement?.tagName === "INPUT" ||
    document.activeElement?.tagName === "TEXTAREA"
  );
}

export interface CanvasKeybindingState {
  context: () => Partial<ShortcutMatchContext>;
  handlers: CommandHandlerMap;
}

interface CanvasProps {
  branchPickerOpen: boolean;
  canvasId: string;
  commandPaletteOpen: boolean;
  directory?: string;
  isActive?: boolean;
  onKeybindingStateChange: (state: CanvasKeybindingState | null) => void;
}

export function Canvas({
  branchPickerOpen,
  canvasId,
  commandPaletteOpen,
  directory,
  isActive = true,
  onKeybindingStateChange,
}: CanvasProps) {
  const [nodes, setNodes] = useNodesState<FlowNode>([]);
  const defaultEdgeOptions = useMemo(() => ({ selectable: false }), []);
  const reactFlow = useReactFlow();
  const { resolvedTheme, toggleTheme } = useTheme();

  const createNode = useCallback(
    (type: string, col: number, row: number, items: readonly FlowNode[]) =>
      nodeRegistry[type as NodeType].create(col, row, items),
    []
  );

  const { create, remove, replace, focus, move } = useTilingLayout(
    setNodes,
    createNode
  );

  const tileActions = useMemo(() => ({ remove, replace }), [remove, replace]);

  const lastFocusedId = useRef<string | null>(null);
  const pendingMoveViewportId = useRef<string | null>(null);
  const fitNodeIntoView = useCallback(
    (nodeId: string) => {
      lastFocusedId.current = nodeId;
      reactFlow.fitView({
        nodes: [{ id: nodeId }],
        duration: 300,
        maxZoom: 1.4,
        padding: 0.1,
      });
    },
    [reactFlow]
  );
  const onSelectionChange: OnSelectionChangeFunc = useCallback(
    ({ nodes: selectedNodes }) => {
      if (selectedNodes.length !== 1) {
        lastFocusedId.current = null;
        return;
      }
      if (selectedNodes[0].id === lastFocusedId.current) {
        return;
      }
      fitNodeIntoView(selectedNodes[0].id);
    },
    [fitNodeIntoView]
  );

  useEffect(() => {
    if (!pendingMoveViewportId.current) {
      return;
    }

    const selectedNode = nodes.find((node) => node.selected);
    if (!selectedNode || selectedNode.id !== pendingMoveViewportId.current) {
      return;
    }

    pendingMoveViewportId.current = null;
    fitNodeIntoView(selectedNode.id);
  }, [fitNodeIntoView, nodes]);

  const { deleteSelectedNodes, onNodesChange, selectAllNodes } =
    useCanvasNodeActions({ nodes, reactFlow, setNodes });

  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  const moveWithViewport = useCallback(
    (dx: number, dy: number) => {
      const selectedNode = nodesRef.current.find((node) => node.selected);
      if (!selectedNode) {
        return;
      }
      pendingMoveViewportId.current = selectedNode.id;
      move(dx, dy);
    },
    [move]
  );

  const canvasHandlers = useMemo<CommandHandlerMap>(
    () => ({
      "canvas.fitView": () => reactFlow.fitView(),
      "canvas.zoomIn": () => reactFlow.zoomIn(),
      "canvas.zoomOut": () => reactFlow.zoomOut(),
      "canvas.selectAll": selectAllNodes,
      "canvas.deleteSelected": deleteSelectedNodes,
      "tiling.createLeft": () => create(-1, 0, "terminal"),
      "tiling.createRight": () => create(1, 0, "terminal"),
      "tiling.createUp": () => create(0, -1, "terminal"),
      "tiling.createDown": () => create(0, 1, "terminal"),
      "tiling.insertLeft": () => create(-1, 0, "picker"),
      "tiling.insertRight": () => create(1, 0, "picker"),
      "tiling.insertUp": () => create(0, -1, "picker"),
      "tiling.insertDown": () => create(0, 1, "picker"),
      "tiling.focusLeft": () => focus(-1, 0),
      "tiling.focusRight": () => focus(1, 0),
      "tiling.focusUp": () => focus(0, -1),
      "tiling.focusDown": () => focus(0, 1),
      "tiling.moveLeft": () => moveWithViewport(-1, 0),
      "tiling.moveRight": () => moveWithViewport(1, 0),
      "tiling.moveUp": () => moveWithViewport(0, -1),
      "tiling.moveDown": () => moveWithViewport(0, 1),
      "theme.toggle": toggleTheme,
    }),
    [
      create,
      deleteSelectedNodes,
      focus,
      moveWithViewport,
      reactFlow,
      selectAllNodes,
      toggleTheme,
    ]
  );

  const getKeybindingContext = useCallback(() => {
    const selectedNode = nodesRef.current.find((node) => node.selected);
    const selectedType = selectedNode?.type;
    return {
      browserSelected: selectedType === "browser",
      canvasFocus: true,
      inputFocus: isInputFocused() || commandPaletteOpen || branchPickerOpen,
      pickerSelected: selectedType === "picker",
      terminalSelected: selectedType === "terminal",
      windowSelected: selectedType === "window",
    };
  }, [branchPickerOpen, commandPaletteOpen]);

  const keybindingState = useMemo<CanvasKeybindingState>(
    () => ({
      context: getKeybindingContext,
      handlers: canvasHandlers,
    }),
    [canvasHandlers, getKeybindingContext]
  );

  useEffect(() => {
    if (!isActive) {
      return;
    }

    onKeybindingStateChange(keybindingState);
    return () => onKeybindingStateChange(null);
  }, [isActive, keybindingState, onKeybindingStateChange]);

  return (
    <WorkspaceContext.Provider value={{ directory }}>
      <TileActionsContext.Provider value={tileActions}>
        <ReactFlow
          colorMode={resolvedTheme}
          defaultEdgeOptions={defaultEdgeOptions}
          id={canvasId}
          maxZoom={1.8}
          minZoom={0.1}
          nodes={nodes}
          nodeTypes={flowNodeTypes}
          onNodesChange={onNodesChange}
          onSelectionChange={onSelectionChange}
          panOnDrag={[1, 2]}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={24} size={1} variant={BackgroundVariant.Dots} />
          <Controls position="bottom-right" showInteractive={false} />
        </ReactFlow>
      </TileActionsContext.Provider>
    </WorkspaceContext.Provider>
  );
}
