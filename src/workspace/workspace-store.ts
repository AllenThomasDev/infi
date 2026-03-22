import path from "pathe";
import { create } from "zustand";
import type { Canvas, Project } from "./types";

interface WorkspaceState {
  activeProjectId: string | null;
  canvases: Record<string, Canvas>;
  closeCanvas: (canvasId: string) => void;
  closeProject: (projectId: string) => void;

  createCanvas: (projectId: string, name?: string) => string;

  createProject: (directory: string) => string;
  projects: Project[];
  switchCanvas: (canvasId: string) => void;
  switchProject: (projectId: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  projects: [],
  activeProjectId: null,
  canvases: {},

  createProject: (directory: string) => {
    const now = Date.now();
    const projectId = crypto.randomUUID();
    const canvasId = crypto.randomUUID();

    const canvas: Canvas = {
      id: canvasId,
      projectId,
      name: "Canvas 1",
      branch: null,
      worktreePath: null,
      createdAt: now,
      lastActiveAt: now,
    };

    const project: Project = {
      id: projectId,
      name: path.basename(directory),
      directory,
      canvasIds: [canvasId],
      activeCanvasId: canvasId,
      createdAt: now,
      lastActiveAt: now,
    };

    set((state) => ({
      projects: [...state.projects, project],
      activeProjectId: projectId,
      canvases: { ...state.canvases, [canvasId]: canvas },
    }));

    return projectId;
  },

  switchProject: (projectId: string) => {
    set((state) => ({
      activeProjectId: projectId,
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, lastActiveAt: Date.now() } : p
      ),
    }));
  },

  closeProject: (projectId: string) => {
    set((state) => {
      const project = state.projects.find((p) => p.id === projectId);
      if (!project) {
        return state;
      }

      const newCanvases = { ...state.canvases };
      for (const cid of project.canvasIds) {
        delete newCanvases[cid];
      }

      const remaining = state.projects.filter((p) => p.id !== projectId);
      const newActiveId =
        state.activeProjectId === projectId
          ? (remaining.at(-1)?.id ?? null)
          : state.activeProjectId;

      return {
        projects: remaining,
        activeProjectId: newActiveId,
        canvases: newCanvases,
      };
    });
  },

  createCanvas: (projectId: string, name?: string) => {
    const now = Date.now();
    const canvasId = crypto.randomUUID();
    const project = get().projects.find((p) => p.id === projectId);
    if (!project) {
      return "";
    }

    const canvasNumber = project.canvasIds.length + 1;
    const canvas: Canvas = {
      id: canvasId,
      projectId,
      name: name ?? `Canvas ${canvasNumber}`,
      branch: null,
      worktreePath: null,
      createdAt: now,
      lastActiveAt: now,
    };

    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              canvasIds: [...p.canvasIds, canvasId],
              activeCanvasId: canvasId,
            }
          : p
      ),
      canvases: { ...state.canvases, [canvasId]: canvas },
    }));

    return canvasId;
  },

  switchCanvas: (canvasId: string) => {
    const canvas = get().canvases[canvasId];
    if (!canvas) {
      return;
    }

    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === canvas.projectId ? { ...p, activeCanvasId: canvasId } : p
      ),
      canvases: {
        ...state.canvases,
        [canvasId]: { ...canvas, lastActiveAt: Date.now() },
      },
    }));
  },

  closeCanvas: (canvasId: string) => {
    const canvas = get().canvases[canvasId];
    if (!canvas) {
      return;
    }

    set((state) => {
      const project = state.projects.find((p) => p.id === canvas.projectId);
      if (!project) {
        return state;
      }

      const newCanvasIds = project.canvasIds.filter((id) => id !== canvasId);

      // Don't close the last canvas — close the project instead
      if (newCanvasIds.length === 0) {
        get().closeProject(canvas.projectId);
        return state;
      }

      const newActiveCanvasId =
        project.activeCanvasId === canvasId
          ? (newCanvasIds.at(-1) ?? newCanvasIds[0])
          : project.activeCanvasId;

      const newCanvases = { ...state.canvases };
      delete newCanvases[canvasId];

      return {
        projects: state.projects.map((p) =>
          p.id === canvas.projectId
            ? {
                ...p,
                canvasIds: newCanvasIds,
                activeCanvasId: newActiveCanvasId,
              }
            : p
        ),
        canvases: newCanvases,
      };
    });
  },
}));
