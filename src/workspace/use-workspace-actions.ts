import path from "pathe";
import { useCallback } from "react";
import { ipc } from "@/ipc/manager";
import { useWorkspaceStore } from "@/workspace/workspace-store";

interface CreateCanvasFromBranchOptions {
  branch: string;
  currentBranch: string | null;
  projectId: string;
}

function getProjectWorktreePath(directory: string, branch: string) {
  return path.join(`${directory}-worktrees`, branch);
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

      if (canvas.worktreePath) {
        await ipc.client.git.removeWorktree({
          cwd: project.directory,
          path: canvas.worktreePath,
        });
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
        if (!canvas.worktreePath) {
          continue;
        }

        await ipc.client.git.removeWorktree({
          cwd: project.directory,
          path: canvas.worktreePath,
        });
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
    }: CreateCanvasFromBranchOptions) => {
      const project = projects.find((candidate) => candidate.id === projectId);
      if (!project) {
        return "";
      }

      if (branch === currentBranch) {
        return createCanvas(projectId, {
          branch,
          name: branch,
          worktreePath: null,
        });
      }

      const worktreePath = getProjectWorktreePath(project.directory, branch);
      const result = await ipc.client.git.createWorktree({
        branch,
        cwd: project.directory,
        path: worktreePath,
      });

      return createCanvas(projectId, {
        branch,
        name: branch,
        worktreePath: result.path,
      });
    },
    [createCanvas, projects]
  );

  return {
    closeCanvasWithCleanup,
    closeProjectWithCleanup,
    createCanvasFromBranch,
  };
}
