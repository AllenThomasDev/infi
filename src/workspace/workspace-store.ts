import path from "pathe";
import { create } from "zustand";
import type { Canvas, Project } from "./types";

interface WorkspaceState {
  activeProjectId: string | null;
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

  createProject: (directory: string) => {
    const now = Date.now();
    const projectId = crypto.randomUUID();
    const canvasId = crypto.randomUUID();

    const canvas: Canvas = {
      id: canvasId,
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
      canvases: [canvas],
      activeCanvasId: canvasId,
      createdAt: now,
      lastActiveAt: now,
    };

    set((state) => ({
      projects: [...state.projects, project],
      activeProjectId: projectId,
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

      const remaining = state.projects.filter((p) => p.id !== projectId);
      const newActiveId =
        state.activeProjectId === projectId
          ? (remaining.at(-1)?.id ?? null)
          : state.activeProjectId;

      return {
        projects: remaining,
        activeProjectId: newActiveId,
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

    const canvasNumber = project.canvases.length + 1;
    const canvas: Canvas = {
      id: canvasId,
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
              canvases: [...p.canvases, canvas],
              activeCanvasId: canvasId,
            }
          : p
      ),
    }));

    return canvasId;
  },

  switchCanvas: (canvasId: string) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.canvases.some((canvas) => canvas.id === canvasId)
          ? {
              ...p,
              activeCanvasId: canvasId,
              canvases: p.canvases.map((canvas) =>
                canvas.id === canvasId
                  ? { ...canvas, lastActiveAt: Date.now() }
                  : canvas
              ),
            }
          : p
      ),
    }));
  },

  closeCanvas: (canvasId: string) => {
    set((state) => {
      const project = state.projects.find((p) =>
        p.canvases.some((canvas) => canvas.id === canvasId)
      );
      if (!project) {
        return state;
      }

      const nextCanvases = project.canvases.filter(
        (canvas) => canvas.id !== canvasId
      );

      // Closing the last canvas closes the whole project.
      if (nextCanvases.length === 0) {
        const remainingProjects = state.projects.filter(
          (p) => p.id !== project.id
        );
        return {
          projects: remainingProjects,
          activeProjectId:
            state.activeProjectId === project.id
              ? (remainingProjects.at(-1)?.id ?? null)
              : state.activeProjectId,
        };
      }

      const newActiveCanvasId =
        project.activeCanvasId === canvasId
          ? (nextCanvases.at(-1)?.id ??
            nextCanvases[0]?.id ??
            project.activeCanvasId)
          : project.activeCanvasId;

      return {
        projects: state.projects.map((p) =>
          p.id === project.id
            ? {
                ...p,
                canvases: nextCanvases,
                activeCanvasId: newActiveCanvasId,
              }
            : p
        ),
      };
    });
  },
}));
