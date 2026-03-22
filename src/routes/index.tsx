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
import { BranchPicker } from "@/components/branch-picker";
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
import type {
  CommandHandlerMap,
  ShortcutMatchContext,
} from "@/keybindings/types";
import { useKeybindings } from "@/keybindings/useKeybindings";
import { useTilingLayout } from "@/layout/use-tiling-layout";
import { useWorkspaceActions } from "@/workspace/use-workspace-actions";
import { useWorkspaceStore } from "@/workspace/workspace-store";

interface CanvasKeybindingState {
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

function Canvas({
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
    }),
    [
      create,
      deleteSelectedNodes,
      focus,
      move,
      nodes,
      reactFlow,
      selectAllNodes,
      toggleTheme,
    ]
  );

  const getKeybindingContext = useCallback(() => {
    const selectedNode = nodes.find((node) => node.selected);
    const selectedType = selectedNode?.type;
    return {
      browserSelected: selectedType === "browser",
      canvasFocus: true,
      inputFocus: isInputFocused() || commandPaletteOpen || branchPickerOpen,
      pickerSelected: selectedType === "picker",
      terminalSelected: selectedType === "terminal",
      windowSelected: selectedType === "window",
    };
  }, [branchPickerOpen, commandPaletteOpen, isInputFocused, nodes]);

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
  }, [isActive, keybindingState, onKeybindingStateChange]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    return () => onKeybindingStateChange(null);
  }, [isActive, onKeybindingStateChange]);

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

function WelcomeScreen({ onOpenProject }: { onOpenProject: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
      <FolderOpen className="size-12 opacity-40" />
      <p className="text-sm">Open a project to get started</p>
      <Button onClick={onOpenProject} size="lg" variant="outline">
        <FolderOpen className="mr-2 size-4" />
        Open Project
      </Button>
    </div>
  );
}

interface WorkspaceContainerProps {
  branchPickerOpen: boolean;
  commandPaletteOpen: boolean;
  onKeybindingStateChange: (state: CanvasKeybindingState | null) => void;
}

function EmptyCanvasState() {
  return (
    <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
      Select a branch or create a new one to get started.
    </div>
  );
}

function WorkspaceContainer({
  branchPickerOpen,
  commandPaletteOpen,
  onKeybindingStateChange,
}: WorkspaceContainerProps) {
  const projects = useWorkspaceStore((s) => s.projects);
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const activeProject = projects.find(
    (project) => project.id === activeProjectId
  );

  return (
    <>
      {activeProject && activeProject.canvases.length === 0 ? (
        <EmptyCanvasState />
      ) : null}
      {projects.flatMap((project) =>
        project.canvases.map((canvas) => {
          const isProjectActive = project.id === activeProjectId;
          const isCanvasActive =
            isProjectActive && canvas.id === project.activeCanvasId;
          const effectiveDirectory = canvas.worktreePath ?? project.directory;

          return (
            <div
              className={isCanvasActive ? "absolute inset-0" : "hidden"}
              key={canvas.id}
            >
              <ReactFlowProvider>
                <Canvas
                  branchPickerOpen={branchPickerOpen}
                  canvasId={canvas.id}
                  commandPaletteOpen={commandPaletteOpen}
                  directory={effectiveDirectory}
                  isActive={isCanvasActive}
                  onKeybindingStateChange={onKeybindingStateChange}
                />
              </ReactFlowProvider>
            </div>
          );
        })
      )}
    </>
  );
}

interface WorkspaceCommandHandlersOptions {
  onCloseCanvas: (canvasId: string) => Promise<void>;
  onCreateCanvas: () => void;
  onOpenProject: () => Promise<void>;
}

function useWorkspaceCommandHandlers({
  onCloseCanvas,
  onCreateCanvas,
  onOpenProject,
}: WorkspaceCommandHandlersOptions) {
  const projects = useWorkspaceStore((s) => s.projects);
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const switchProject = useWorkspaceStore((s) => s.switchProject);
  const switchCanvas = useWorkspaceStore((s) => s.switchCanvas);

  const activeProject = projects.find((p) => p.id === activeProjectId);

  const switchToCanvasByIndex = useCallback(
    (index: number) => {
      if (!activeProject) {
        return;
      }
      const canvasId = activeProject.canvases[index]?.id;
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
      "workspace.newCanvas": onCreateCanvas,
      "workspace.openProject": () => {
        onOpenProject().catch(console.error);
      },
      "workspace.closeCanvas": () => {
        if (activeProject?.activeCanvasId) {
          onCloseCanvas(activeProject.activeCanvasId).catch(console.error);
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
      onCloseCanvas,
      onCreateCanvas,
      onOpenProject,
      switchProjectByOffset,
      switchToCanvasByIndex,
    ]
  );

  return handlers;
}

function HomePage() {
  const projects = useWorkspaceStore((s) => s.projects);
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const hasProjects = projects.length > 0;
  const {
    closeCanvasWithCleanup,
    closeProjectWithCleanup,
    createCanvasFromBranch,
  } = useWorkspaceActions();
  const [branchPickerOpen, setBranchPickerOpen] = useState(false);
  const [branchPickerProjectId, setBranchPickerProjectId] = useState<
    string | null
  >(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [canvasKeybindingState, setCanvasKeybindingState] =
    useState<CanvasKeybindingState | null>(null);

  const openProjectAndPromptForBranch = useCallback(async () => {
    const result = await ipc.client.workspace.openDirectory();
    if (!result.directory) {
      return;
    }

    const projectId = useWorkspaceStore
      .getState()
      .createProject(result.directory);
    setBranchPickerProjectId(projectId);
    setBranchPickerOpen(true);
  }, []);

  const openBranchPicker = useCallback(() => {
    if (!activeProjectId) {
      return;
    }

    setBranchPickerProjectId(activeProjectId);
    setBranchPickerOpen(true);
  }, [activeProjectId]);

  const handleBranchPickerOpenChange = useCallback((open: boolean) => {
    setBranchPickerOpen(open);
    if (!open) {
      setBranchPickerProjectId(null);
    }
  }, []);

  const handleBranchSelected = useCallback(
    async ({
      branch,
      currentBranch,
      worktreePath,
    }: {
      branch: string;
      currentBranch: string | null;
      worktreePath: string | null;
    }) => {
      if (!branchPickerProjectId) {
        return;
      }

      await createCanvasFromBranch({
        branch,
        currentBranch,
        projectId: branchPickerProjectId,
        worktreePath,
      });
    },
    [branchPickerProjectId, createCanvasFromBranch]
  );

  const workspaceHandlers = useWorkspaceCommandHandlers({
    onCloseCanvas: closeCanvasWithCleanup,
    onCreateCanvas: openBranchPicker,
    onOpenProject: openProjectAndPromptForBranch,
  });

  const branchPickerProject = projects.find(
    (project) => project.id === branchPickerProjectId
  );

  const commandHandlers = useMemo<CommandHandlerMap>(
    () => ({
      "app.commandPalette": () => setCommandPaletteOpen((prev) => !prev),
      ...workspaceHandlers,
      ...canvasKeybindingState?.handlers,
    }),
    [canvasKeybindingState?.handlers, workspaceHandlers]
  );

  const { keybindings } = useKeybindings({
    handlers: commandHandlers,
    context: canvasKeybindingState?.context,
  });

  return (
    <section className="relative flex h-full flex-col overflow-hidden bg-background">
      {hasProjects ? (
        <WorkspaceBar
          onCloseCanvas={closeCanvasWithCleanup}
          onCloseProject={closeProjectWithCleanup}
          onCreateCanvas={openBranchPicker}
          onOpenProject={openProjectAndPromptForBranch}
        />
      ) : null}
      <div className="relative min-h-0 flex-1">
        <div className="absolute top-4 right-4 z-10">
          <ModeToggle />
        </div>
        {hasProjects ? (
          <WorkspaceContainer
            branchPickerOpen={branchPickerOpen}
            commandPaletteOpen={commandPaletteOpen}
            onKeybindingStateChange={setCanvasKeybindingState}
          />
        ) : (
          <WelcomeScreen onOpenProject={openProjectAndPromptForBranch} />
        )}
        <CommandPalette
          handlers={commandHandlers}
          keybindings={keybindings}
          onOpenChange={setCommandPaletteOpen}
          open={commandPaletteOpen}
        />
        <BranchPicker
          directory={branchPickerProject?.directory}
          onOpenChange={handleBranchPickerOpenChange}
          onSelectBranch={handleBranchSelected}
          open={branchPickerOpen}
          projectName={branchPickerProject?.name}
        />
      </div>
    </section>
  );
}

export const Route = createFileRoute("/")({
  component: HomePage,
});
