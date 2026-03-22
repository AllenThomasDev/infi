import { FolderOpen, Plus, X } from "lucide-react";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ipc } from "@/ipc/manager";
import { cn } from "@/utils/tailwind";
import { useWorkspaceStore } from "@/workspace/workspace-store";

function ProjectTab({
  active,
  name,
  onClick,
  onClose,
}: {
  active: boolean;
  name: string;
  onClick: () => void;
  onClose: () => void;
}) {
  return (
    <button
      className={cn(
        "group flex h-full items-center gap-1.5 border-b-2 px-3 text-xs transition-colors",
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      )}
      onClick={onClick}
      type="button"
    >
      <FolderOpen className="size-3" />
      <span className="max-w-32 truncate">{name}</span>
      <button
        className="rounded-sm p-0.5 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        tabIndex={-1}
        type="button"
      >
        <X className="size-2.5" />
      </button>
    </button>
  );
}

function CanvasTab({
  active,
  name,
  onClick,
  onClose,
}: {
  active: boolean;
  name: string;
  onClick: () => void;
  onClose: () => void;
}) {
  return (
    <button
      className={cn(
        "group flex h-full items-center gap-1.5 rounded-t-sm px-2.5 text-xs transition-colors",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
      onClick={onClick}
      type="button"
    >
      <span className="max-w-24 truncate">{name}</span>
      <button
        className="rounded-sm p-0.5 opacity-0 transition-opacity hover:bg-background group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        tabIndex={-1}
        type="button"
      >
        <X className="size-2.5" />
      </button>
    </button>
  );
}

export function WorkspaceBar() {
  const projects = useWorkspaceStore((s) => s.projects);
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const createProject = useWorkspaceStore((s) => s.createProject);
  const switchProject = useWorkspaceStore((s) => s.switchProject);
  const closeProject = useWorkspaceStore((s) => s.closeProject);
  const createCanvas = useWorkspaceStore((s) => s.createCanvas);
  const switchCanvas = useWorkspaceStore((s) => s.switchCanvas);
  const closeCanvas = useWorkspaceStore((s) => s.closeCanvas);

  const activeProject = projects.find((p) => p.id === activeProjectId);
  const activeCanvases = activeProject?.canvases ?? [];

  const handleNewProject = useCallback(async () => {
    const result = await ipc.client.workspace.openDirectory();
    if (result.directory) {
      createProject(result.directory);
    }
  }, [createProject]);

  const handleNewCanvas = useCallback(() => {
    if (activeProjectId) {
      createCanvas(activeProjectId);
    }
  }, [activeProjectId, createCanvas]);

  if (projects.length === 0) {
    return null;
  }

  return (
    <div className="flex h-8 shrink-0 items-stretch border-b bg-background">
      <div className="flex items-stretch border-r">
        {projects.map((project) => (
          <ProjectTab
            active={project.id === activeProjectId}
            key={project.id}
            name={project.name}
            onClick={() => switchProject(project.id)}
            onClose={() => closeProject(project.id)}
          />
        ))}
        <Button
          aria-label="Open project"
          className="mx-1 self-center"
          onClick={handleNewProject}
          size="icon-xs"
          variant="ghost"
        >
          <Plus />
        </Button>
      </div>

      <div className="flex items-stretch">
        {activeCanvases.map((canvas) => (
          <CanvasTab
            active={canvas.id === activeProject?.activeCanvasId}
            key={canvas.id}
            name={canvas.name}
            onClick={() => switchCanvas(canvas.id)}
            onClose={() => closeCanvas(canvas.id)}
          />
        ))}
        <Button
          aria-label="New canvas"
          className="mx-1 self-center"
          onClick={handleNewCanvas}
          size="icon-xs"
          variant="ghost"
        >
          <Plus />
        </Button>
      </div>
    </div>
  );
}
