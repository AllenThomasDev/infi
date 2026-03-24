import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLayoutStore } from "@/stores/layout-store";

vi.mock("@/ipc/manager", () => ({
  ipc: {
    client: {
      terminal: {
        kill: vi.fn().mockResolvedValue(undefined),
      },
    },
  },
}));

import { useWorkspaceStore } from "./workspace-store";

describe("useWorkspaceStore", () => {
  beforeEach(() => {
    useWorkspaceStore.setState(useWorkspaceStore.getInitialState(), true);
    useLayoutStore.setState(useLayoutStore.getInitialState(), true);
  });

  it("reuses an existing project for the same directory", () => {
    const firstId = useWorkspaceStore.getState().createProject("/tmp/repo");

    useWorkspaceStore.getState().createCanvas(firstId, {
      branch: "main",
      name: "main",
      worktreePath: "/tmp/repo",
    });

    const secondId = useWorkspaceStore.getState().createProject("/tmp/repo");
    const state = useWorkspaceStore.getState();

    expect(secondId).toBe(firstId);
    expect(state.projects).toHaveLength(1);
    expect(state.activeProjectId).toBe(firstId);
    expect(state.activeCanvasId).toBe(state.projects[0]?.canvases[0]?.id);
  });
});
