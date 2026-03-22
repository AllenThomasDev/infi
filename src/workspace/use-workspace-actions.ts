import path from "pathe";
import { useCallback } from "react";
import { ipc } from "@/ipc/manager";
import { useWorkspaceStore } from "@/workspace/workspace-store";

interface CreateCanvasFromBranchOptions {
  branch: string;
  currentBranch: string | null;
  projectId: string;
  worktreePath: string | null;
}

function getProjectWorktreePath(directory: string, branch: string) {
  return path.join(`${directory}-worktrees`, branch);
}

async function removeWorktreeOrThrow(cwd: string, worktreePath: string) {
  try {
    await ipc.client.git.removeWorktree({
      cwd,
      path: worktreePath,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to remove worktree at ${worktreePath}: ${message}`);
  }
}

export function useWorkspaceActions() {
  const projects = useWorkspaceStore((s) => s.projects);
  const createCanvas = useWorkspaceStore((s) => s.createCanvas);
  const closeCanvas = useWorkspaceStore((s) => s.closeCanvas);
  const closeProject = useWorkspaceStore((s) => s.closeProject);

  const closeCanvasWithCleanup = useCallback(
    async (canvasId: string) => {
      const project = projects.find((candidate) =>
        candidate.canvases.some((canvas) => canvas.id === canvasId)
      );
      const canvas = project?.canvases.find(
        (candidate) => candidate.id === canvasId
      );
      if (!(project && canvas)) {
        return;
      }

      if (canvas.managedWorktree && canvas.worktreePath) {
        await removeWorktreeOrThrow(project.directory, canvas.worktreePath);
      }

      closeCanvas(canvasId);
    },
    [closeCanvas, projects]
  );

  const closeProjectWithCleanup = useCallback(
    async (projectId: string) => {
      const project = projects.find((candidate) => candidate.id === projectId);
      if (!project) {
        return;
      }

      for (const canvas of project.canvases) {
        if (!(canvas.managedWorktree && canvas.worktreePath)) {
          continue;
        }

        await removeWorktreeOrThrow(project.directory, canvas.worktreePath);
      }

      closeProject(projectId);
    },
    [closeProject, projects]
  );

  const createCanvasFromBranch = useCallback(
    async ({
      branch,
      currentBranch,
      projectId,
      worktreePath: existingWorktreePath,
    }: CreateCanvasFromBranchOptions) => {
      const project = projects.find((candidate) => candidate.id === projectId);
      if (!project) {
        return "";
      }

      if (branch === currentBranch) {
        return createCanvas(projectId, {
          branch,
          managedWorktree: false,
          name: branch,
          worktreePath: null,
        });
      }

      if (existingWorktreePath) {
        return createCanvas(projectId, {
          branch,
          managedWorktree: false,
          name: branch,
          worktreePath: existingWorktreePath,
        });
      }

      const worktreePath = getProjectWorktreePath(project.directory, branch);
      const result = await ipc.client.git.createWorktree({
        branch,
        cwd: project.directory,
        path: worktreePath,
      });

      try {
        const canvasId = createCanvas(projectId, {
          branch,
          managedWorktree: true,
          name: branch,
          worktreePath: result.path,
        });
        if (!canvasId) {
          throw new Error(`Failed to create canvas for branch ${branch}`);
        }
        return canvasId;
      } catch (error) {
        await removeWorktreeOrThrow(project.directory, result.path).catch(
          console.error
        );
        throw error;
      }
    },
    [createCanvas, projects]
  );

  return {
    closeCanvasWithCleanup,
    closeProjectWithCleanup,
    createCanvasFromBranch,
  };
}
