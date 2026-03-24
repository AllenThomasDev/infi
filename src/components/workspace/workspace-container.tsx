import {
  Canvas,
  type CanvasKeybindingState,
} from "@/components/workspace/canvas";
import { EmptyCanvasState } from "@/components/workspace/empty-canvas-state";
import { useWorkspaceStore } from "@/workspace/workspace-store";

interface WorkspaceContainerProps {
  branchPickerOpen: boolean;
  commandPaletteOpen: boolean;
  onCreateCanvas?: () => void;
  onKeybindingStateChange: (state: CanvasKeybindingState | null) => void;
}

export function WorkspaceContainer({
  branchPickerOpen,
  commandPaletteOpen,
  onCreateCanvas,
  onKeybindingStateChange,
}: WorkspaceContainerProps) {
  const projects = useWorkspaceStore((s) => s.projects);
  const activeCanvasId = useWorkspaceStore((s) => s.activeCanvasId);

  const activeCanvas = activeCanvasId
    ? projects
        .flatMap((p) => p.canvases)
        .find((c) => c.id === activeCanvasId)
    : null;

  if (!activeCanvas) {
    return (
      <EmptyCanvasState
        actionCommand="workspace.newCanvas"
        actionLabel={onCreateCanvas ? "New Branch" : undefined}
        description="Select a branch or create a new one to get started."
        onAction={onCreateCanvas}
        title="No worktrees yet"
      />
    );
  }

  return (
    <Canvas
      branchPickerOpen={branchPickerOpen}
      canvasId={activeCanvas.id}
      commandPaletteOpen={commandPaletteOpen}
      directory={activeCanvas.worktreePath}
      key={activeCanvas.id}
      onKeybindingStateChange={onKeybindingStateChange}
    />
  );
}
