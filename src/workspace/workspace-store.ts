import path from "pathe";
import { create } from "zustand";
import type { Canvas, Project } from "./types";

interface CreateCanvasOptions {
  branch?: string | null;
  name?: string;
  worktreePath?: string | null;
}

interface WorkspaceState {
  activeCanvasId: string | null;
  activeProjectId: string | null;
  closeCanvas: (canvasId: string) => void;
  closeProject: (projectId: string) => void;

  createCanvas: (projectId: string, options?: CreateCanvasOptions) => string;

  createProject: (directory: string) => string;
  projects: Project[];
  switchCanvas: (canvasId: string) => void;
  switchProject: (projectId: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  projects: [],
  activeCanvasId: null,
  activeProjectId: null,

  createProject: (directory: string) => {
    const now = Date.now();
    const projectId = crypto.randomUUID();

    const project: Project = {
      id: projectId,
      name: path.basename(directory),
      directory,
      canvases: [],
      createdAt: now,
    };

    set((state) => ({
      projects: [...state.projects, project],
      activeProjectId: projectId,
      activeCanvasId: null,
    }));

    return projectId;
  },

  switchProject: (projectId: string) => {
    const mostRecentCanvasId =
      get()
        .projects.find((p) => p.id === projectId)
        ?.canvases.slice()
        .sort((a, b) => b.lastActiveAt - a.lastActiveAt)[0]?.id ?? null;

    set({
      activeProjectId: projectId,
      activeCanvasId: mostRecentCanvasId,
    });
  },

  closeProject: (projectId: string) => {
    set((state) => {
      const project = state.projects.find((p) => p.id === projectId);
      if (!project) {
        return state;
      }

      const remaining = state.projects.filter((p) => p.id !== projectId);

      if (state.activeProjectId !== projectId) {
        return { projects: remaining };
      }

      return {
        projects: remaining,
        activeProjectId: remaining[0]?.id ?? null,
        activeCanvasId: null,
      };
    });
  },

  createCanvas: (projectId: string, options) => {
    const now = Date.now();
    const canvasId = crypto.randomUUID();
    const project = get().projects.find((p) => p.id === projectId);
    if (!project) {
      return "";
    }

    const canvas: Canvas = {
      id: canvasId,
      name: options?.name ?? "Canvas",
      branch: options?.branch ?? null,
      worktreePath: options?.worktreePath ?? null,
      createdAt: now,
      lastActiveAt: now,
    };

    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              canvases: [...p.canvases, canvas],
            }
          : p
      ),
      activeProjectId: projectId,
      activeCanvasId: canvasId,
    }));

    return canvasId;
  },

  switchCanvas: (canvasId: string) => {
    if (canvasId === get().activeCanvasId) {
      return;
    }

    const now = Date.now();
    const ownerProjectId = get().projects.find((p) =>
      p.canvases.some((c) => c.id === canvasId)
    )?.id;

    set((state) => ({
      activeCanvasId: canvasId,
      activeProjectId: ownerProjectId ?? state.activeProjectId,
      projects: state.projects.map((p) =>
        p.id === ownerProjectId
          ? {
              ...p,
              canvases: p.canvases.map((canvas) =>
                canvas.id === canvasId
                  ? { ...canvas, lastActiveAt: now }
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
      const isClosingActive = state.activeCanvasId === canvasId;
      const fallbackCanvasId = nextCanvases
        .slice()
        .sort((a, b) => b.lastActiveAt - a.lastActiveAt)[0]?.id;

      return {
        activeCanvasId: isClosingActive
          ? (fallbackCanvasId ?? null)
          : state.activeCanvasId,
        projects: state.projects.map((p) =>
          p.id === project.id
            ? {
                ...p,
                canvases: nextCanvases,
              }
            : p
        ),
      };
    });
  },
}));
