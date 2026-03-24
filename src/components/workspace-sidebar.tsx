import {
  ChevronRight,
  FolderGit2,
  GitBranch,
  GitBranchPlus,
  Import,
  Minus,
  X,
} from "lucide-react";
import ModeToggle from "@/components/mode-toggle";
import { ShortcutTooltip } from "@/components/shortcut-tooltip";
import { Button } from "@/components/ui/button";
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
import { isMacPlatform } from "@/keybindings/match";
import type { Canvas, Project } from "@/workspace/types";
import { useWorkspaceStore } from "@/workspace/workspace-store";

interface WorkspaceSidebarProps {
  onCloseCanvas: (canvasId: string) => void | Promise<void>;
  onCloseProject: (projectId: string) => void;
  onCreateCanvas: (projectId: string) => void;
  onOpenProject: () => void | Promise<void>;
}

function ProjectItem({
  activeCanvasId,
  isActive,
  onCloseCanvas,
  onCloseProject,
  onCreateCanvas,
  onSwitch,
  onSwitchCanvas,
  project,
}: {
  activeCanvasId: string | null;
  isActive: boolean;
  onCloseCanvas: (canvasId: string) => void | Promise<void>;
  onCloseProject: () => void | Promise<void>;
  onCreateCanvas: () => void;
  onSwitch: () => void;
  onSwitchCanvas: (canvasId: string) => void;
  project: Project;
}) {
  return (
    <Collapsible className="group/collapsible" defaultOpen={isActive}>
      <SidebarMenuItem>
        <SidebarMenuButton className="relative" onClick={onSwitch}>
          {isActive ? (
            <div className="absolute top-1/2 left-0 h-4 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-primary" />
          ) : null}
          <CollapsibleTrigger asChild onClick={(e) => e.stopPropagation()}>
            <ChevronRight className="transition-transform group-data-[state=open]/collapsible:rotate-90" />
          </CollapsibleTrigger>
          <FolderGit2 />
          <span>{project.name}</span>
        </SidebarMenuButton>

        <SidebarMenuAction
          className="right-7"
          onClick={(e) => {
            e.stopPropagation();
            onSwitch();
            onCreateCanvas();
          }}
          showOnHover
          title="New Branch"
        >
          <GitBranchPlus />
        </SidebarMenuAction>

        <SidebarMenuAction
          onClick={(e) => {
            e.stopPropagation();
            Promise.resolve(onCloseProject()).catch(console.error);
          }}
          showOnHover
          title="Unregister Project"
        >
          <Minus />
        </SidebarMenuAction>

        <CollapsibleContent>
          <SidebarMenuSub className="mx-0 ml-4 pr-0 pl-2">
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
    <SidebarMenuSubItem>
      <SidebarMenuSubButton
        asChild
        className={
          isActive
            ? "w-full pr-8 [&>svg]:text-inherit"
            : "w-full pr-8 text-sidebar-foreground/70 [&>svg]:text-inherit"
        }
        isActive={isActive}
      >
        <button onClick={onSwitch} type="button">
          <GitBranch className="size-3.5" />
          <span>{canvas.name}</span>
        </button>
      </SidebarMenuSubButton>
      <ShortcutTooltip command="workspace.closeCanvas" label="Close Canvas">
        <Button
          className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-[calc(var(--radius-sm)-2px)] p-0 text-sidebar-foreground opacity-0 transition-[color,opacity,background-color] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring group-focus-within/menu-sub-item:opacity-100 group-hover/menu-sub-item:opacity-100 md:opacity-0"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          type="button"
          variant="ghost"
        >
          <X className="size-3" />
        </Button>
      </ShortcutTooltip>
    </SidebarMenuSubItem>
  );
}

export function WorkspaceSidebar({
  onCloseCanvas,
  onCloseProject,
  onCreateCanvas,
  onOpenProject,
}: WorkspaceSidebarProps) {
  const isMac = isMacPlatform();
  const projects = useWorkspaceStore((s) => s.projects);
  const activeCanvasId = useWorkspaceStore((s) => s.activeCanvasId);
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const switchProject = useWorkspaceStore((s) => s.switchProject);
  const switchCanvas = useWorkspaceStore((s) => s.switchCanvas);

  return (
    <Sidebar
      className="border-sidebar-border border-r"
      collapsible="offcanvas"
      side="left"
    >
      <SidebarContent>
        <SidebarGroup className={isMac ? "pt-14" : undefined}>
          <SidebarGroupLabel>Projects</SidebarGroupLabel>
          <ShortcutTooltip command="workspace.openProject" label="Open Project" side="right">
            <SidebarGroupAction
              onClick={() => {
                Promise.resolve(onOpenProject()).catch(console.error);
              }}
              type="button"
            >
              <Import className="size-4" />
            </SidebarGroupAction>
          </ShortcutTooltip>
          <SidebarGroupContent>
            <SidebarMenu>
              {projects.map((project) => (
                <ProjectItem
                  activeCanvasId={activeCanvasId}
                  isActive={project.id === activeProjectId}
                  key={project.id}
                  onCloseCanvas={onCloseCanvas}
                  onCloseProject={() => onCloseProject(project.id)}
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
