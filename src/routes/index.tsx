import { createFileRoute } from "@tanstack/react-router";
import { FolderGit2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Maximize, Minimize, NotepadText, NotepadTextDashed, Plus, Terminal } from "lucide-react";
import { BranchPicker } from "@/components/branch-picker";
import { CommandPalette } from "@/components/command-palette";
import { NotesEditor } from "@/components/notes-editor";
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
import { useLayoutStore } from "@/stores/layout-store";
import { useTerminalTitleStore } from "@/stores/terminal-title-store";
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
  const isFullscreenMode = useLayoutStore((s) => s.layout.isFullscreenMode);
  const notesOpen = useLayoutStore((s) => s.layout.isNotesOpen);
  const selectedItemId = useLayoutStore((s) => s.layout.selectedItemId);
  const rows = useLayoutStore((s) => s.layout.rows);
  const toggleFullscreenMode = useLayoutStore((s) => s.toggleFullscreenMode);
  const toggleNotes = useLayoutStore((s) => s.toggleNotes);
  const selectItem = useLayoutStore((s) => s.selectItem);
  const addItem = useLayoutStore((s) => s.addItem);
  const terminalTitles = useTerminalTitleStore((s) => s.titles);

  const activeCanvas = activeCanvasId
    ? projects.flatMap((p) => p.canvases).find((c) => c.id === activeCanvasId)
    : null;

  const { confirm, confirmDialog, confirmWithCheckbox } = useConfirm();
  const { closeCanvas, openBranch } = useWorkspaceActions({
    confirmWithCheckbox,
  });
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [hasNotes, setHasNotes] = useState(false);
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
        <StatusBar />
        {activeCanvas ? (
          <div className="flex h-9 shrink-0 items-center gap-1 border-sidebar-border border-b bg-sidebar px-2">
            <Button
              onClick={toggleNotes}
              size="icon-xs"
              variant={notesOpen ? "secondary" : "ghost"}
            >
              {hasNotes ? <NotepadText /> : <NotepadTextDashed />}
            </Button>
            {rows.flatMap((row, rowIndex) =>
              row.items.map((item, colIndex) => (
                <Button
                  className="gap-1.5 text-xs"
                  key={item.id}
                  onClick={() => {
                    if (notesOpen) toggleNotes();
                    selectItem(item.id, { scroll: true });
                  }}
                  size="xs"
                  variant={!notesOpen && selectedItemId === item.id ? "secondary" : "ghost"}
                >
                  <Terminal className="size-3.5" />
                  <span className="max-w-32 truncate">{terminalTitles[item.id]?.trim() || "Terminal"}</span>
                  <span className="text-muted-foreground">{rowIndex + 1}.{colIndex + 1}</span>
                </Button>
              ))
            )}
            <Button
              onClick={() => {
                if (notesOpen) toggleNotes();
                addItem({
                  id: `terminal-item-${crypto.randomUUID()}`,
                  ref: { type: "terminal" },
                });
              }}
              size="icon-xs"
              variant="ghost"
            >
              <Plus />
            </Button>
            <div className="ml-auto">
              <Button
                onClick={toggleFullscreenMode}
                size="icon-xs"
                variant={isFullscreenMode ? "secondary" : "ghost"}
              >
                {isFullscreenMode ? <Minimize /> : <Maximize />}
              </Button>
            </div>
          </div>
        ) : null}
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {!hasProjects ? (
            <WelcomeScreen onOpenProject={openProjectAndPromptForBranch} />
          ) : (
            <>
              <div className={notesOpen ? "hidden" : "h-full w-full"}>
                <WorkspaceContainer
                  branchPickerOpen={branchPickerOpen}
                  commandPaletteOpen={commandPaletteOpen}
                  onCreateCanvas={openBranchPicker}
                  onKeybindingStateChange={setCanvasKeybindingState}
                />
              </div>
              {notesOpen && activeCanvas && (
                <NotesEditor
                  key={activeCanvas.id}
                  onClose={toggleNotes}
                  onContentChange={setHasNotes}
                  worktreePath={activeCanvas.worktreePath}
                />
              )}
            </>
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
