import { FolderOpen, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/tailwind";
import { useWorkspaceStore } from "@/workspace/workspace-store";

interface WorkspaceBarProps {
  onCloseCanvas: (canvasId: string) => void | Promise<void>;
  onCloseProject: (projectId: string) => void | Promise<void>;
  onCreateCanvas: () => void;
  onOpenProject: () => void | Promise<void>;
}

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

export function WorkspaceBar({
  onCloseCanvas,
  onCloseProject,
  onCreateCanvas,
  onOpenProject,
}: WorkspaceBarProps) {
  const projects = useWorkspaceStore((s) => s.projects);
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const switchProject = useWorkspaceStore((s) => s.switchProject);
  const switchCanvas = useWorkspaceStore((s) => s.switchCanvas);

  const activeProject = projects.find((p) => p.id === activeProjectId);
  const activeCanvases = activeProject?.canvases ?? [];

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
            onClose={() => {
              Promise.resolve(onCloseProject(project.id)).catch(console.error);
            }}
          />
        ))}
        <Button
          aria-label="Open project"
          className="mx-1 self-center"
          onClick={() => {
            Promise.resolve(onOpenProject()).catch(console.error);
          }}
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
            onClose={() => {
              Promise.resolve(onCloseCanvas(canvas.id)).catch(console.error);
            }}
          />
        ))}
        <Button
          aria-label="New canvas"
          className="mx-1 self-center"
          onClick={onCreateCanvas}
          size="icon-xs"
          variant="ghost"
        >
          <Plus />
        </Button>
      </div>
    </div>
  );
}
