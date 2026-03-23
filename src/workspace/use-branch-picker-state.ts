import { useCallback, useMemo, useState } from "react";
import type { BranchPickerSelection } from "@/components/branch-picker";
import { ipc } from "@/ipc/manager";
import { useWorkspaceStore } from "@/workspace/workspace-store";

interface UseBranchPickerStateOptions {
  openBranch: (
    projectId: string,
    selection: BranchPickerSelection
  ) => Promise<void>;
}

export function useBranchPickerState({
  openBranch,
}: UseBranchPickerStateOptions) {
  const projects = useWorkspaceStore((s) => s.projects);
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const [branchPickerOpen, setBranchPickerOpen] = useState(false);
  const [branchPickerProjectId, setBranchPickerProjectId] = useState<
    string | null
  >(null);

  const openProjectAndPromptForBranch = useCallback(async () => {
    const result = await ipc.client.workspace.openDirectory();
    if (!result.directory) {
      return;
    }

    const projectId = useWorkspaceStore
      .getState()
      .createProject(result.directory);
    setBranchPickerProjectId(projectId);
    setBranchPickerOpen(true);
  }, []);

  const openBranchPicker = useCallback(() => {
    if (!activeProjectId) {
      return;
    }

    setBranchPickerProjectId(activeProjectId);
    setBranchPickerOpen(true);
  }, [activeProjectId]);

  const openBranchPickerForProject = useCallback((projectId: string) => {
    setBranchPickerProjectId(projectId);
    setBranchPickerOpen(true);
  }, []);

  const handleBranchPickerOpenChange = useCallback((open: boolean) => {
    setBranchPickerOpen(open);
    if (!open) {
      setBranchPickerProjectId(null);
    }
  }, []);

  const handleBranchSelected = useCallback(
    async (selection: BranchPickerSelection) => {
      if (!branchPickerProjectId) {
        return;
      }

      await openBranch(branchPickerProjectId, selection);
    },
    [branchPickerProjectId, openBranch]
  );

  const branchPickerProject = useMemo(
    () => projects.find((project) => project.id === branchPickerProjectId),
    [branchPickerProjectId, projects]
  );

  const canvasByBranch = useMemo(() => {
    if (!branchPickerProject) {
      return undefined;
    }

    const map = new Map<string, string>();
    for (const canvas of branchPickerProject.canvases) {
      if (canvas.branch) {
        map.set(canvas.branch, canvas.id);
      }
    }
    return map;
  }, [branchPickerProject]);

  return {
    branchPickerOpen,
    branchPickerProject,
    canvasByBranch,
    handleBranchPickerOpenChange,
    handleBranchSelected,
    openBranchPicker,
    openBranchPickerForProject,
    openProjectAndPromptForBranch,
  };
}
