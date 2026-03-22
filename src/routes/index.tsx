import { createFileRoute } from "@tanstack/react-router";
import {
  Background,
  BackgroundVariant,
  Controls,
  type OnSelectionChangeFunc,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import { FolderOpen } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CommandPalette } from "@/components/command-palette";
import {
  flowNodeTypes,
  type NodeType,
  nodeRegistry,
} from "@/components/flow/node-registry";
import type { FlowNode } from "@/components/flow/types";
import { useCanvasNodeActions } from "@/components/flow/use-canvas-node-actions";
import { TileActionsContext } from "@/components/flow/use-tile-actions";
import ModeToggle from "@/components/mode-toggle";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { WorkspaceContext } from "@/components/workspace/workspace-context";
import { WorkspaceBar } from "@/components/workspace-bar";
import { ipc } from "@/ipc/manager";
import type { CommandHandlerMap } from "@/keybindings/types";
import { useKeybindings } from "@/keybindings/useKeybindings";
import { useTilingLayout } from "@/layout/use-tiling-layout";
import { useWorkspaceStore } from "@/workspace/workspace-store";

interface CanvasProps {
  directory?: string;
  isActive?: boolean;
}

function Canvas({ directory, isActive = true }: CanvasProps) {
  const [nodes, setNodes] = useNodesState<FlowNode>([]);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const defaultEdgeOptions = useMemo(() => ({ selectable: false }), []);
  const reactFlow = useReactFlow();
  const { resolvedTheme, toggleTheme } = useTheme();

  const createNode = useCallback(
    (type: string, col: number, row: number, nodes: readonly FlowNode[]) =>
      nodeRegistry[type as NodeType].create(col, row, nodes),
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
    ({ nodes: sel }) => {
      if (sel.length !== 1) {
        lastFocusedId.current = null;
        return;
      }
      if (sel[0].id === lastFocusedId.current) {
        return;
      }
      fitNodeIntoView(sel[0].id);
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

  const isInputFocused = useCallback(
    () =>
      document.activeElement?.tagName === "INPUT" ||
      document.activeElement?.tagName === "TEXTAREA",
    []
  );

  const commandHandlers: CommandHandlerMap = {
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
    "tiling.moveLeft": () => {
      const selectedNode = nodes.find((node) => node.selected);
      if (!selectedNode) {
        return;
      }
      pendingMoveViewportId.current = selectedNode.id;
      move(-1, 0);
    },
    "tiling.moveRight": () => {
      const selectedNode = nodes.find((node) => node.selected);
      if (!selectedNode) {
        return;
      }
      pendingMoveViewportId.current = selectedNode.id;
      move(1, 0);
    },
    "tiling.moveUp": () => {
      const selectedNode = nodes.find((node) => node.selected);
      if (!selectedNode) {
        return;
      }
      pendingMoveViewportId.current = selectedNode.id;
      move(0, -1);
    },
    "tiling.moveDown": () => {
      const selectedNode = nodes.find((node) => node.selected);
      if (!selectedNode) {
        return;
      }
      pendingMoveViewportId.current = selectedNode.id;
      move(0, 1);
    },
    "theme.toggle": toggleTheme,
  };

  const getKeybindingContext = useCallback(() => {
    const selectedNode = nodes.find((node) => node.selected);
    const selectedType = selectedNode?.type;
    return {
      browserSelected: selectedType === "browser",
      canvasFocus: true,
      inputFocus: isInputFocused() || commandPaletteOpen,
      pickerSelected: selectedType === "picker",
      terminalSelected: selectedType === "terminal",
      windowSelected: selectedType === "window",
    };
  }, [commandPaletteOpen, isInputFocused, nodes]);

  const { keybindings } = useKeybindings({
    enabled: isActive,
    handlers: {
      ...commandHandlers,
      "app.commandPalette": () => setCommandPaletteOpen((prev) => !prev),
    },
    context: getKeybindingContext,
  });

  return (
    <WorkspaceContext.Provider value={{ directory }}>
      <TileActionsContext.Provider value={tileActions}>
        <ReactFlow
          colorMode={resolvedTheme}
          defaultEdgeOptions={defaultEdgeOptions}
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
        <CommandPalette
          handlers={commandHandlers}
          keybindings={keybindings}
          onOpenChange={setCommandPaletteOpen}
          open={commandPaletteOpen}
        />
      </TileActionsContext.Provider>
    </WorkspaceContext.Provider>
  );
}

function WelcomeScreen() {
  const createProject = useWorkspaceStore((s) => s.createProject);

  const handleOpen = useCallback(async () => {
    const result = await ipc.client.workspace.openDirectory();
    if (result.directory) {
      createProject(result.directory);
    }
  }, [createProject]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
      <FolderOpen className="size-12 opacity-40" />
      <p className="text-sm">Open a project to get started</p>
      <Button onClick={handleOpen} size="lg" variant="outline">
        <FolderOpen className="mr-2 size-4" />
        Open Project
      </Button>
    </div>
  );
}

function WorkspaceContainer() {
  const projects = useWorkspaceStore((s) => s.projects);
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const canvases = useWorkspaceStore((s) => s.canvases);

  return (
    <>
      {projects.flatMap((project) =>
        project.canvasIds.map((canvasId) => {
          const canvas = canvases[canvasId];
          if (!canvas) {
            return null;
          }

          const isProjectActive = project.id === activeProjectId;
          const isCanvasActive =
            isProjectActive && canvasId === project.activeCanvasId;
          const effectiveDirectory = canvas.worktreePath ?? project.directory;

          return (
            <div
              className={isCanvasActive ? "absolute inset-0" : "hidden"}
              key={canvasId}
            >
              <ReactFlowProvider>
                <Canvas
                  directory={effectiveDirectory}
                  isActive={isCanvasActive}
                />
              </ReactFlowProvider>
            </div>
          );
        })
      )}
    </>
  );
}

function useWorkspaceKeybindings() {
  const projects = useWorkspaceStore((s) => s.projects);
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const createProject = useWorkspaceStore((s) => s.createProject);
  const switchProject = useWorkspaceStore((s) => s.switchProject);
  const createCanvas = useWorkspaceStore((s) => s.createCanvas);
  const switchCanvas = useWorkspaceStore((s) => s.switchCanvas);
  const closeCanvas = useWorkspaceStore((s) => s.closeCanvas);

  const activeProject = projects.find((p) => p.id === activeProjectId);

  const switchToCanvasByIndex = useCallback(
    (index: number) => {
      if (!activeProject) {
        return;
      }
      const canvasId = activeProject.canvasIds[index];
      if (canvasId) {
        switchCanvas(canvasId);
      }
    },
    [activeProject, switchCanvas]
  );

  const switchProjectByOffset = useCallback(
    (offset: number) => {
      const idx = projects.findIndex((p) => p.id === activeProjectId);
      if (idx < 0) {
        return;
      }
      const next = projects[idx + offset];
      if (next) {
        switchProject(next.id);
      }
    },
    [activeProjectId, projects, switchProject]
  );

  const handlers: CommandHandlerMap = useMemo(
    () => ({
      "workspace.newCanvas": () => {
        if (activeProjectId) {
          createCanvas(activeProjectId);
        }
      },
      "workspace.openProject": async () => {
        const result = await ipc.client.workspace.openDirectory();
        if (result.directory) {
          createProject(result.directory);
        }
      },
      "workspace.closeCanvas": () => {
        if (activeProject) {
          closeCanvas(activeProject.activeCanvasId);
        }
      },
      "workspace.prevProject": () => switchProjectByOffset(-1),
      "workspace.nextProject": () => switchProjectByOffset(1),
      "workspace.canvas1": () => switchToCanvasByIndex(0),
      "workspace.canvas2": () => switchToCanvasByIndex(1),
      "workspace.canvas3": () => switchToCanvasByIndex(2),
      "workspace.canvas4": () => switchToCanvasByIndex(3),
      "workspace.canvas5": () => switchToCanvasByIndex(4),
      "workspace.canvas6": () => switchToCanvasByIndex(5),
      "workspace.canvas7": () => switchToCanvasByIndex(6),
      "workspace.canvas8": () => switchToCanvasByIndex(7),
      "workspace.canvas9": () => switchToCanvasByIndex(8),
    }),
    [
      activeProject,
      activeProjectId,
      closeCanvas,
      createCanvas,
      createProject,
      switchProjectByOffset,
      switchToCanvasByIndex,
    ]
  );

  useKeybindings({ handlers });
}

function HomePage() {
  const projects = useWorkspaceStore((s) => s.projects);
  const hasProjects = projects.length > 0;

  useWorkspaceKeybindings();

  return (
    <section className="relative flex h-full flex-col overflow-hidden bg-background">
      {hasProjects && <WorkspaceBar />}
      <div className="relative min-h-0 flex-1">
        <div className="absolute top-4 right-4 z-10">
          <ModeToggle />
        </div>
        {hasProjects ? <WorkspaceContainer /> : <WelcomeScreen />}
      </div>
    </section>
  );
}

export const Route = createFileRoute("/")({
  component: HomePage,
});
