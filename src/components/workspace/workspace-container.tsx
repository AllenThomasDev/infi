import { ReactFlowProvider } from "@xyflow/react";
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
        <EmptyCanvasState onCreateCanvas={onCreateCanvas} />
      )}
      {projects.flatMap((project) =>
        project.canvases.map((canvas) => {
          const isCanvasActive = canvas.id === activeCanvasId;
          const directory = canvas.worktreePath ?? project.directory;

          return (
            <div
              className={isCanvasActive ? "absolute inset-0" : "hidden"}
              key={canvas.id}
            >
              <ReactFlowProvider>
                <Canvas
                  branchPickerOpen={branchPickerOpen}
                  commandPaletteOpen={commandPaletteOpen}
                  directory={directory}
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
