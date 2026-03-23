import { useCallback, useMemo } from "react";
import type { CommandHandlerMap } from "@/keybindings/types";
import { useWorkspaceStore } from "@/workspace/workspace-store";

interface WorkspaceCommandHandlersOptions {
  onCloseCanvas: (canvasId: string) => void | Promise<void>;
  onCreateCanvas: () => void;
  onOpenProject: () => Promise<void>;
}

export function useWorkspaceCommandHandlers({
  onCloseCanvas,
  onCreateCanvas,
  onOpenProject,
}: WorkspaceCommandHandlersOptions) {
  const projects = useWorkspaceStore((s) => s.projects);
  const activeCanvasId = useWorkspaceStore((s) => s.activeCanvasId);
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const switchCanvas = useWorkspaceStore((s) => s.switchCanvas);
  const switchProject = useWorkspaceStore((s) => s.switchProject);
  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null;

  const switchCanvasByOffset = useCallback(
    (offset: number) => {
      if (!activeCanvasId || !activeProject) {
        return;
      }

      const idx = activeProject.canvases.findIndex(
        (canvas) => canvas.id === activeCanvasId
      );
      if (idx < 0) {
        return;
      }

      const next = activeProject.canvases[idx + offset];
      if (next) {
        switchCanvas(next.id);
      }
    },
    [activeCanvasId, activeProject, switchCanvas]
  );

  const switchProjectByIndex = useCallback(
    (index: number) => {
      const project = projects[index];
      if (project) {
        switchProject(project.id);
      }
    },
    [projects, switchProject]
  );

  return useMemo<CommandHandlerMap>(
    () => ({
      "workspace.newCanvas": onCreateCanvas,
      "workspace.openProject": () => {
        onOpenProject().catch(console.error);
      },
      "workspace.closeCanvas": () => {
        if (activeCanvasId) {
          Promise.resolve(onCloseCanvas(activeCanvasId)).catch(
            console.error
          );
        }
      },
      "workspace.prevCanvas": () => switchCanvasByOffset(-1),
      "workspace.nextCanvas": () => switchCanvasByOffset(1),
      "workspace.project1": () => switchProjectByIndex(0),
      "workspace.project2": () => switchProjectByIndex(1),
      "workspace.project3": () => switchProjectByIndex(2),
      "workspace.project4": () => switchProjectByIndex(3),
      "workspace.project5": () => switchProjectByIndex(4),
      "workspace.project6": () => switchProjectByIndex(5),
      "workspace.project7": () => switchProjectByIndex(6),
      "workspace.project8": () => switchProjectByIndex(7),
      "workspace.project9": () => switchProjectByIndex(8),
    }),
    [
      activeCanvasId,
      onCloseCanvas,
      onCreateCanvas,
      onOpenProject,
      switchCanvasByOffset,
      switchProjectByIndex,
    ]
  );
}
