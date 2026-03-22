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

  return useMemo<CommandHandlerMap>(
    () => ({
      "workspace.newCanvas": onCreateCanvas,
      "workspace.openProject": () => {
        onOpenProject().catch(console.error);
      },
      "workspace.closeCanvas": () => {
        if (activeProject?.activeCanvasId) {
          Promise.resolve(onCloseCanvas(activeProject.activeCanvasId)).catch(
            console.error
          );
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
}
