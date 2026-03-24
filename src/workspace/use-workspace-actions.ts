import path from "pathe";
import { useCallback } from "react";
import type { BranchPickerSelection } from "@/components/branch-picker";
import { ipc } from "@/ipc/manager";
import { useWorkspaceStore } from "@/workspace/workspace-store";

interface UseWorkspaceActionsOptions {
  confirmWithCheckbox: (options: {
    checkboxDescription?: string;
    checkboxLabel: string;
    confirmLabel?: string;
    description: string;
    title: string;
    variant?: "default" | "destructive";
  }) => Promise<{ checked: boolean; confirmed: boolean }>;
}

function getWorktreeRoot(directory: string) {
  return `${directory}-worktrees`;
}

function getProjectWorktreePath(directory: string, branch: string) {
  return path.join(getWorktreeRoot(directory), branch);
}

function isManagedWorktree(directory: string, worktreePath: string) {
  return worktreePath.startsWith(getWorktreeRoot(directory) + path.sep);
}

function getOrphanedWorktreePath(
  projects: readonly {
    canvases: readonly { id: string; worktreePath: string }[];
    directory: string;
  }[],
  canvasId: string
): { projectDirectory: string; worktreePath: string } | null {
  for (const project of projects) {
    const canvas = project.canvases.find((c) => c.id === canvasId);
    if (!canvas) {
      continue;
    }

    if (!isManagedWorktree(project.directory, canvas.worktreePath)) {
      return null;
    }

    const isShared = project.canvases.some(
      (other) =>
        other.id !== canvasId && other.worktreePath === canvas.worktreePath
    );

    return isShared
      ? null
      : {
          projectDirectory: project.directory,
          worktreePath: canvas.worktreePath,
        };
  }

  return null;
}

export function useWorkspaceActions({
  confirmWithCheckbox,
}: UseWorkspaceActionsOptions) {
  const projects = useWorkspaceStore((s) => s.projects);
  const createCanvasAction = useWorkspaceStore((s) => s.createCanvas);
  const closeCanvasAction = useWorkspaceStore((s) => s.closeCanvas);
  const switchCanvasAction = useWorkspaceStore((s) => s.switchCanvas);

  const closeCanvas = useCallback(
    async (canvasId: string) => {
      const orphan = getOrphanedWorktreePath(projects, canvasId);

      if (orphan) {
        const result = await confirmWithCheckbox({
          title: "Close canvas?",
          description: `Close this canvas for worktree "${path.basename(orphan.worktreePath)}"?`,
          checkboxLabel: "Also delete this worktree",
          confirmLabel: "Close Canvas",
        });

        if (!result.confirmed) {
          return;
        }

        if (result.checked) {
          try {
            await ipc.client.git.removeWorktree({
              cwd: orphan.projectDirectory,
              path: orphan.worktreePath,
            });
          } catch (error) {
            console.error("Failed to remove worktree", error);
          }
        }
      }

      closeCanvasAction(canvasId);
    },
    [closeCanvasAction, confirmWithCheckbox, projects]
  );

  const openBranch = useCallback(
    async (projectId: string, selection: BranchPickerSelection) => {
      const project = projects.find((p) => p.id === projectId);
      if (!project) {
        return;
      }

      const existingCanvas = project.canvases.find(
        (c) => c.branch === selection.branch
      );
      if (existingCanvas) {
        switchCanvasAction(existingCanvas.id);
        return;
      }

      if (selection.worktreePath) {
        createCanvasAction(projectId, {
          branch: selection.branch,
          name: selection.branch,
          worktreePath: selection.worktreePath,
        });
        return;
      }

      if (selection.branch === selection.currentBranch) {
        createCanvasAction(projectId, {
          branch: selection.branch,
          name: selection.branch,
          worktreePath: project.directory,
        });
        return;
      }

      const worktreePath = getProjectWorktreePath(
        project.directory,
        selection.branch
      );
      const result = await ipc.client.git.createWorktree({
        branch: selection.branch,
        cwd: project.directory,
        path: worktreePath,
      });

      createCanvasAction(projectId, {
        branch: selection.branch,
        name: selection.branch,
        worktreePath: result.path,
      });
    },
    [createCanvasAction, projects, switchCanvasAction]
  );

  return { closeCanvas, openBranch };
}
