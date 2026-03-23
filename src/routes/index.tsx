import { createFileRoute } from "@tanstack/react-router";
import { FolderGit2 } from "lucide-react";
import { useMemo, useState } from "react";
import { BranchPicker } from "@/components/branch-picker";
import { CommandPalette } from "@/components/command-palette";
import { StatusBar } from "@/components/status-bar";
import { Button } from "@/components/ui/button";
import { SidebarProvider } from "@/components/ui/sidebar";
import type { CanvasKeybindingState } from "@/components/workspace/canvas";
import { WorkspaceContainer } from "@/components/workspace/workspace-container";
import { WorkspaceSidebar } from "@/components/workspace-sidebar";
import { useConfirm } from "@/hooks/use-confirm";
import type { CommandHandlerMap } from "@/keybindings/types";
import { useKeybindings } from "@/keybindings/useKeybindings";
import { useBranchPickerState } from "@/workspace/use-branch-picker-state";
import { useWorkspaceActions } from "@/workspace/use-workspace-actions";
import { useWorkspaceCommandHandlers } from "@/workspace/use-workspace-command-handlers";
import { useWorkspaceStore } from "@/workspace/workspace-store";

function WelcomeScreen({ onOpenProject }: { onOpenProject: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
      <FolderGit2 className="size-12 opacity-40" />
      <p className="text-sm">Open a project to get started</p>
      <Button onClick={onOpenProject} size="lg" variant="outline">
        <FolderGit2 className="mr-2 size-4" />
        Open Project
      </Button>
    </div>
  );
}

function HomePage() {
  const closeProject = useWorkspaceStore((s) => s.closeProject);
  const hasProjects = useWorkspaceStore((s) => s.projects.length > 0);

  const { confirm, confirmDialog } = useConfirm();
  const { closeCanvas, openBranch } = useWorkspaceActions({ confirm });
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [canvasKeybindingState, setCanvasKeybindingState] =
    useState<CanvasKeybindingState | null>(null);

  const {
    branchPickerOpen,
    branchPickerProject,
    canvasByBranch,
    handleBranchPickerOpenChange,
    handleBranchSelected,
    openBranchPicker,
    openBranchPickerForProject,
    openProjectAndPromptForBranch,
  } = useBranchPickerState({ openBranch });

  const workspaceHandlers = useWorkspaceCommandHandlers({
    onCloseCanvas: closeCanvas,
    onCreateCanvas: openBranchPicker,
    onOpenProject: openProjectAndPromptForBranch,
  });

  const commandHandlers = useMemo<CommandHandlerMap>(
    () => ({
      "app.commandPalette": () => setCommandPaletteOpen((prev) => !prev),
      ...workspaceHandlers,
      ...canvasKeybindingState?.handlers,
    }),
    [canvasKeybindingState?.handlers, workspaceHandlers]
  );

  const { keybindings } = useKeybindings({
    handlers: commandHandlers,
    context: canvasKeybindingState?.context,
  });

  return (
    <SidebarProvider>
      <WorkspaceSidebar
        onCloseCanvas={closeCanvas}
        onCloseProject={closeProject}
        onCreateCanvas={openBranchPickerForProject}
        onOpenProject={openProjectAndPromptForBranch}
      />
      <div className="flex h-full w-full min-w-0 flex-col overflow-hidden">
        <StatusBar />
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {hasProjects ? (
            <WorkspaceContainer
              branchPickerOpen={branchPickerOpen}
              commandPaletteOpen={commandPaletteOpen}
              onCreateCanvas={openBranchPicker}
              onKeybindingStateChange={setCanvasKeybindingState}
            />
          ) : (
            <WelcomeScreen onOpenProject={openProjectAndPromptForBranch} />
          )}
          <CommandPalette
            handlers={commandHandlers}
            keybindings={keybindings}
            onOpenChange={setCommandPaletteOpen}
            open={commandPaletteOpen}
          />
          <BranchPicker
            canvasByBranch={canvasByBranch}
            directory={branchPickerProject?.directory}
            onOpenChange={handleBranchPickerOpenChange}
            onSelectBranch={handleBranchSelected}
            open={branchPickerOpen}
            projectName={branchPickerProject?.name}
          />
          {confirmDialog}
        </div>
      </div>
    </SidebarProvider>
  );
}

export const Route = createFileRoute("/")({
  component: HomePage,
});
