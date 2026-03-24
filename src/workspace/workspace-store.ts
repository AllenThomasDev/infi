import path from "pathe";
import { create } from "zustand";
import { ipc } from "@/ipc/manager";
import type { NiriCanvasLayout } from "@/layout/layout-types";
import { useLayoutStore } from "@/stores/layout-store";
import type { Canvas, Project } from "./types";

function killTerminalItems(layout?: NiriCanvasLayout) {
  if (!layout) {
    return;
  }

  for (const row of layout.rows) {
    for (const item of row.items) {
      if (item.ref.type === "terminal") {
        ipc.client.terminal.kill({ id: item.id }).catch(console.error);
      }
    }
  }
}

interface CreateCanvasOptions {
  branch?: string | null;
  name?: string;
  worktreePath: string;
}

interface WorkspaceState {
  activeCanvasId: string | null;
  activeProjectId: string | null;
  closeCanvas: (canvasId: string) => void;
  closeProject: (projectId: string) => void;

  createCanvas: (projectId: string, options: CreateCanvasOptions) => string;

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

    useLayoutStore.getState().setActiveCanvas(null);
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

    useLayoutStore.getState().setActiveCanvas(mostRecentCanvasId);
    set({
      activeProjectId: projectId,
      activeCanvasId: mostRecentCanvasId,
    });
  },

  closeProject: (projectId: string) => {
    const state = get();
    const project = state.projects.find((p) => p.id === projectId);
    if (!project) {
      return;
    }

    const layoutState = useLayoutStore.getState();
    for (const canvas of project.canvases) {
      const layout =
        layoutState.layoutsByCanvas[canvas.id] ??
        (layoutState.activeCanvasId === canvas.id
          ? layoutState.layout
          : undefined);
      killTerminalItems(layout);
      useLayoutStore.getState().removeCanvasLayout(canvas.id);
    }

    if (state.activeProjectId === projectId) {
      useLayoutStore.getState().setActiveCanvas(null);
    }

    set((prev) => {
      const remaining = prev.projects.filter((p) => p.id !== projectId);

      if (prev.activeProjectId !== projectId) {
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
      name: options.name ?? "Canvas",
      branch: options.branch ?? null,
      worktreePath: options.worktreePath,
      createdAt: now,
      lastActiveAt: now,
    };

    useLayoutStore.getState().setActiveCanvas(canvasId);
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

    useLayoutStore.getState().setActiveCanvas(canvasId);
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
    const state = get();
    const project = state.projects.find((p) =>
      p.canvases.some((canvas) => canvas.id === canvasId)
    );
    if (!project) {
      return;
    }

    const isClosingActive = state.activeCanvasId === canvasId;
    if (isClosingActive) {
      const nextCanvases = project.canvases.filter(
        (canvas) => canvas.id !== canvasId
      );
      const fallbackCanvasId =
        nextCanvases.slice().sort((a, b) => b.lastActiveAt - a.lastActiveAt)[0]
          ?.id ?? null;
      useLayoutStore.getState().setActiveCanvas(fallbackCanvasId);
    }

    const layoutState = useLayoutStore.getState();
    const layout =
      layoutState.layoutsByCanvas[canvasId] ??
      (layoutState.activeCanvasId === canvasId
        ? layoutState.layout
        : undefined);
    killTerminalItems(layout);
    useLayoutStore.getState().removeCanvasLayout(canvasId);

    set((prev) => {
      const nextCanvases = project.canvases.filter(
        (canvas) => canvas.id !== canvasId
      );
      const fallbackCanvasId = nextCanvases
        .slice()
        .sort((a, b) => b.lastActiveAt - a.lastActiveAt)[0]?.id;

      return {
        activeCanvasId: isClosingActive
          ? (fallbackCanvasId ?? null)
          : prev.activeCanvasId,
        projects: prev.projects.map((p) =>
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
