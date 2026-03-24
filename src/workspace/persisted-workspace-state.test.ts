import { beforeEach, describe, expect, it, vi } from "vitest";
import { LOCAL_STORAGE_KEYS } from "@/constants";
import { useLayoutStore } from "@/stores/layout-store";
import { useWorkspaceStore } from "@/workspace/workspace-store";
import {
  flushWorkspacePersistenceForTests,
  initializeWorkspacePersistence,
  resetWorkspacePersistenceForTests,
} from "./persisted-workspace-state";

vi.mock("@/ipc/manager", () => ({
  ipc: {
    client: {
      terminal: {
        kill: vi.fn().mockResolvedValue(undefined),
      },
    },
  },
}));

class MemoryStorage implements Storage {
  private readonly storage = new Map<string, string>();

  get length() {
    return this.storage.size;
  }

  clear() {
    this.storage.clear();
  }

  getItem(key: string) {
    return this.storage.get(key) ?? null;
  }

  key(index: number) {
    return [...this.storage.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.storage.delete(key);
  }

  setItem(key: string, value: string) {
    this.storage.set(key, value);
  }
}

function seedPersistedState(value: unknown) {
  globalThis.localStorage.setItem(
    LOCAL_STORAGE_KEYS.WORKSPACE,
    JSON.stringify(value)
  );
}

describe("workspace persistence", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: new MemoryStorage(),
      writable: true,
    });

    resetWorkspacePersistenceForTests();
    useWorkspaceStore.setState(useWorkspaceStore.getInitialState(), true);
    useLayoutStore.setState(useLayoutStore.getInitialState(), true);
  });

  it("falls back to defaults when persisted payload is invalid", () => {
    globalThis.localStorage.setItem(LOCAL_STORAGE_KEYS.WORKSPACE, "not-json");

    initializeWorkspacePersistence();

    expect(useWorkspaceStore.getState().projects).toEqual([]);
    expect(useWorkspaceStore.getState().activeProjectId).toBeNull();
    expect(useWorkspaceStore.getState().activeCanvasId).toBeNull();
    expect(useLayoutStore.getState().layoutsByCanvas).toEqual({});
    expect(useLayoutStore.getState().layout.rows).toEqual([]);
  });

  it("drops orphaned layouts and transient picker tiles during hydration", () => {
    seedPersistedState({
      version: 1,
      workspace: {
        activeCanvasId: "missing-canvas",
        activeProjectId: "missing-project",
        projects: [
          {
            canvases: [
              {
                branch: "main",
                createdAt: 1,
                id: "canvas-1",
                lastActiveAt: 10,
                name: "Main",
                worktreePath: "/tmp/repo",
              },
            ],
            createdAt: 1,
            directory: "/tmp/repo",
            id: "project-1",
            name: "repo",
          },
        ],
      },
      layout: {
        layoutsByCanvas: {
          "canvas-1": {
            focusTick: 3,
            isOverviewOpen: true,
            lastColumnByRowId: {
              row1: 0,
              orphan: 4,
            },
            rows: [
              {
                id: "row1",
                items: [
                  { id: "picker-1", ref: { type: "picker" } },
                  { id: "terminal-1", ref: { type: "terminal" } },
                ],
              },
            ],
            selectedItemId: "picker-1",
          },
          orphaned: {
            focusTick: 0,
            isOverviewOpen: false,
            lastColumnByRowId: {},
            rows: [],
          },
        },
      },
    });

    initializeWorkspacePersistence();

    const workspaceState = useWorkspaceStore.getState();
    const layoutState = useLayoutStore.getState();

    expect(workspaceState.activeProjectId).toBe("project-1");
    expect(workspaceState.activeCanvasId).toBe("canvas-1");
    expect(Object.keys(layoutState.layoutsByCanvas)).toEqual(["canvas-1"]);
    expect(layoutState.layout.rows[0]?.items).toEqual([
      { id: "terminal-1", ref: { type: "terminal" } },
    ]);
    expect(layoutState.layout.selectedItemId).toBeUndefined();
    expect(layoutState.layout.lastColumnByRowId).toEqual({ row1: 0 });
  });

  it("persists workspace and restores the active canvas layout", () => {
    initializeWorkspacePersistence();

    const projectId = useWorkspaceStore.getState().createProject("/tmp/repo");
    const canvasId = useWorkspaceStore.getState().createCanvas(projectId, {
      branch: "main",
      name: "Main",
      worktreePath: "/tmp/repo",
    });

    useLayoutStore.getState().addItem({
      id: canvasId,
      ref: { type: "terminal" },
    });

    flushWorkspacePersistenceForTests();

    const raw = globalThis.localStorage.getItem(LOCAL_STORAGE_KEYS.WORKSPACE);
    expect(raw).toBeTruthy();

    resetWorkspacePersistenceForTests();
    useWorkspaceStore.setState(useWorkspaceStore.getInitialState(), true);
    useLayoutStore.setState(useLayoutStore.getInitialState(), true);

    initializeWorkspacePersistence();

    expect(useWorkspaceStore.getState().projects).toHaveLength(1);
    expect(useWorkspaceStore.getState().activeProjectId).toBe(projectId);
    expect(useWorkspaceStore.getState().activeCanvasId).toBe(canvasId);
    expect(useLayoutStore.getState().layout.rows[0]?.items).toEqual([
      { id: canvasId, ref: { type: "terminal" } },
    ]);
  });
});
