import { ChevronRight, FolderOpen, FolderPlus, GitBranchPlus, X } from "lucide-react";
import ModeToggle from "@/components/mode-toggle";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useWorkspaceStore } from "@/workspace/workspace-store";
import type { Canvas, Project } from "@/workspace/types";

interface WorkspaceSidebarProps {
  onCloseCanvas: (canvasId: string) => void | Promise<void>;
  onCloseProject: (projectId: string) => void;
  onCreateCanvas: (projectId: string) => void;
  onOpenProject: () => void | Promise<void>;
}

function ProjectItem({
  activeCanvasId,
  isActive,
  onClose,
  onCloseCanvas,
  onCreateCanvas,
  onSwitch,
  onSwitchCanvas,
  project,
}: {
  activeCanvasId: string | null;
  isActive: boolean;
  onClose: () => void;
  onCloseCanvas: (canvasId: string) => void | Promise<void>;
  onCreateCanvas: () => void;
  onSwitch: () => void;
  onSwitchCanvas: (canvasId: string) => void;
  project: Project;
}) {
  return (
    <Collapsible defaultOpen={isActive} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            className="group-hover/menu-item:bg-sidebar-accent group-hover/menu-item:text-sidebar-accent-foreground"
            onClick={onSwitch}
            tooltip={project.name}
          >
            <ChevronRight className="transition-transform group-data-[state=open]/collapsible:rotate-90" />
            <FolderOpen />
            <span>{project.name}</span>
          </SidebarMenuButton>
        </CollapsibleTrigger>

        <SidebarMenuAction
          className="hover:bg-foreground/10"
          onClick={(e) => {
            e.stopPropagation();
            onCreateCanvas();
          }}
        >
          <GitBranchPlus />
        </SidebarMenuAction>

        <CollapsibleContent>
          <SidebarMenuSub className="mr-0 pr-0">
            {project.canvases.map((canvas: Canvas) => (
              <CanvasItem
                canvas={canvas}
                isActive={isActive && canvas.id === activeCanvasId}
                key={canvas.id}
                onClose={() => {
                  Promise.resolve(onCloseCanvas(canvas.id)).catch(
                    console.error
                  );
                }}
                onSwitch={() => onSwitchCanvas(canvas.id)}
              />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

function CanvasItem({
  canvas,
  isActive,
  onClose,
  onSwitch,
}: {
  canvas: Canvas;
  isActive: boolean;
  onClose: () => void;
  onSwitch: () => void;
}) {
  return (
    <SidebarMenuSubItem className="group/canvas-item">
      <SidebarMenuSubButton asChild isActive={isActive} className="w-full">
        <button onClick={onSwitch} type="button">
          <span>{canvas.name}</span>
        </button>
      </SidebarMenuSubButton>
      <button
        className="absolute top-1 right-1 rounded-sm p-0.5 opacity-0 transition-opacity hover:bg-sidebar-accent group-hover/canvas-item:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        type="button"
      >
        <X className="size-3" />
      </button>
    </SidebarMenuSubItem>
  );
}

export function WorkspaceSidebar({
  onCloseCanvas,
  onCloseProject,
  onCreateCanvas,
  onOpenProject,
}: WorkspaceSidebarProps) {
  const projects = useWorkspaceStore((s) => s.projects);
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const switchProject = useWorkspaceStore((s) => s.switchProject);
  const switchCanvas = useWorkspaceStore((s) => s.switchCanvas);

  return (
    <Sidebar collapsible="offcanvas" side="left">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Projects</SidebarGroupLabel>
          <SidebarGroupAction
            onClick={() => {
              Promise.resolve(onOpenProject()).catch(console.error);
            }}
            title="Open Project"
          >
            <FolderPlus />
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              {projects.map((project) => (
                <ProjectItem
                  activeCanvasId={project.activeCanvasId}
                  isActive={project.id === activeProjectId}
                  key={project.id}
                  onClose={() => onCloseProject(project.id)}
                  onCloseCanvas={onCloseCanvas}
                  onCreateCanvas={() => onCreateCanvas(project.id)}
                  onSwitch={() => switchProject(project.id)}
                  onSwitchCanvas={switchCanvas}
                  project={project}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <ModeToggle />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
