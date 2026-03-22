import { ReactFlowProvider } from "@xyflow/react";
import { Canvas, type CanvasKeybindingState } from "@/routes/components/canvas";
import { EmptyCanvasState } from "@/routes/components/empty-canvas-state";
import { useWorkspaceStore } from "@/workspace/workspace-store";

interface WorkspaceContainerProps {
  branchPickerOpen: boolean;
  commandPaletteOpen: boolean;
  onKeybindingStateChange: (state: CanvasKeybindingState | null) => void;
}

export function WorkspaceContainer({
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
          const directory = canvas.worktreePath ?? project.directory;

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
