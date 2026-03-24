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

  return (
    <>
      {activeCanvasId ? null : (
        <EmptyCanvasState
          actionCommand="workspace.newCanvas"
          actionLabel={onCreateCanvas ? "New Branch" : undefined}
          description="Select a branch or create a new one to get started."
          onAction={onCreateCanvas}
          title="No worktrees yet"
        />
      )}
      {projects.flatMap((project) =>
        project.canvases.map((canvas) => {
          const isCanvasActive = canvas.id === activeCanvasId;
          const directory = canvas.worktreePath;

          return (
            <div
              className={isCanvasActive ? "absolute inset-0" : "hidden"}
              key={canvas.id}
            >
              <Canvas
                branchPickerOpen={branchPickerOpen}
                canvasId={canvas.id}
                commandPaletteOpen={commandPaletteOpen}
                directory={directory}
                isActive={isCanvasActive}
                onKeybindingStateChange={onKeybindingStateChange}
              />
            </div>
          );
        })
      )}
    </>
  );
}
