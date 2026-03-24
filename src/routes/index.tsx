import { createFileRoute } from "@tanstack/react-router";
import { FolderGit2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { BranchPicker } from "@/components/branch-picker";
import { CommandPalette } from "@/components/command-palette";
import { NotesEditor, useHasNotes } from "@/components/notes-editor";
import { ShortcutKbd } from "@/components/shortcut-tooltip";
import { StatusBar } from "@/components/status-bar";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { SidebarProvider } from "@/components/ui/sidebar";
import type { CanvasKeybindingState } from "@/components/workspace/canvas";
import { WorkspaceContainer } from "@/components/workspace/workspace-container";
import { WorkspaceSidebar } from "@/components/workspace-sidebar";
import { useConfirm } from "@/hooks/use-confirm";
import type { CommandHandlerMap } from "@/keybindings/types";
import { useKeybindings } from "@/keybindings/use-keybindings";
import { useBranchPickerState } from "@/workspace/use-branch-picker-state";
import { useWorkspaceActions } from "@/workspace/use-workspace-actions";
import { useWorkspaceCommandHandlers } from "@/workspace/use-workspace-command-handlers";
import { useWorkspaceStore } from "@/workspace/workspace-store";

function WelcomeScreen({ onOpenProject }: { onOpenProject: () => void }) {
  return (
    <Empty className="h-full border-0">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FolderGit2 />
        </EmptyMedia>
        <EmptyTitle>No projects yet</EmptyTitle>
        <EmptyDescription>
          Open a project to start creating canvases and worktrees.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={onOpenProject} size="lg" variant="outline">
          <FolderGit2 data-icon="inline-start" />
          Open Project
          <ShortcutKbd command="workspace.openProject" />
        </Button>
      </EmptyContent>
    </Empty>
  );
}

function HomePage() {
  const closeProjectAction = useWorkspaceStore((s) => s.closeProject);
  const activeCanvasId = useWorkspaceStore((s) => s.activeCanvasId);
  const hasProjects = useWorkspaceStore((s) => s.projects.length > 0);
  const projects = useWorkspaceStore((s) => s.projects);

  const activeCanvas = activeCanvasId
    ? projects.flatMap((p) => p.canvases).find((c) => c.id === activeCanvasId)
    : null;

  const initialHasNotes = useHasNotes(activeCanvas?.worktreePath);
  const [hasNotesOverride, setHasNotesOverride] = useState<boolean | null>(null);
  const hasNotes = hasNotesOverride ?? initialHasNotes ?? false;

  const { confirm, confirmDialog, confirmWithCheckbox } = useConfirm();
  const { closeCanvas, openBranch } = useWorkspaceActions({
    confirmWithCheckbox,
  });
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [canvasKeybindingState, setCanvasKeybindingState] =
    useState<CanvasKeybindingState | null>(null);

  const toggleNotes = useCallback(() => setNotesOpen((prev) => !prev), []);

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

  async function closeProject(projectId: string) {
    const project = projects.find((entry) => entry.id === projectId);
    if (!project) {
      return;
    }

    const shouldClose = await confirm({
      title: "Unregister project?",
      description: `Remove ${project.name} from the workspace? Open canvases will close, but the repository and any worktrees stay on disk.`,
      confirmLabel: "Unregister Project",
    });

    if (!shouldClose) {
      return;
    }

    closeProjectAction(projectId);
  }

  return (
    <SidebarProvider>
      <WorkspaceSidebar
        onCloseCanvas={closeCanvas}
        onCloseProject={closeProject}
        onCreateCanvas={openBranchPickerForProject}
        onOpenProject={openProjectAndPromptForBranch}
      />
      <div className="flex h-full w-full min-w-0 flex-col overflow-hidden">
        <StatusBar
          hasNotes={hasNotes}
          notesOpen={notesOpen}
          onToggleNotes={toggleNotes}
          showNotesButton={!!activeCanvas}
        />
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {!hasProjects ? (
            <WelcomeScreen onOpenProject={openProjectAndPromptForBranch} />
          ) : notesOpen && activeCanvas ? (
            // eslint-disable-next-line jsx-a11y/no-static-element-interactions
            <div
              className="absolute inset-0 overflow-auto bg-background"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  setNotesOpen(false);
                }
              }}
            >
              <NotesEditor
                className="milkdown px-4 py-4"
                key={activeCanvas.id}
                onContentChange={setHasNotesOverride}
                worktreePath={activeCanvas.worktreePath}
              />
            </div>
          ) : (
            <WorkspaceContainer
              branchPickerOpen={branchPickerOpen}
              commandPaletteOpen={commandPaletteOpen}
              onCreateCanvas={openBranchPicker}
              onKeybindingStateChange={setCanvasKeybindingState}
            />
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
