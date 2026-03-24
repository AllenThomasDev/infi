import type { ComponentType } from "react";
import {
  Activity,
  FolderTree,
  GitBranch,
  LayoutPanelTop,
  ScanSearch,
  Sparkles,
  TerminalSquare,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/utils/tailwind";

interface StatusPillProps {
  className?: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}

function StatusPill({
  className,
  icon: Icon,
  label,
  value,
}: StatusPillProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-md border border-border/60 bg-card/70 px-2.5 py-1.5 text-xs shadow-sm backdrop-blur-sm",
        className
      )}
    >
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="shrink-0 uppercase tracking-[0.2em] text-[10px] text-muted-foreground">
        {label}
      </span>
      <span className="truncate font-medium text-foreground">{value}</span>
    </div>
  );
}

export function StatusBar() {
  return (
    <div className="border-t border-border/70 bg-background/90 px-3 py-2 backdrop-blur-md">
      <div className="flex min-h-10 flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <StatusPill
            icon={FolderTree}
            label="Project"
            value="Placeholder Project"
          />
          <StatusPill
            icon={LayoutPanelTop}
            label="Canvas"
            value="Main Canvas"
          />
          <StatusPill
            icon={GitBranch}
            label="Branch"
            value="feature/status-bar"
          />
        </div>

        <div className="hidden h-5 md:block">
          <Separator orientation="vertical" />
        </div>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 md:justify-center">
          <StatusPill
            icon={TerminalSquare}
            label="Pane"
            value="Terminal 1 selected"
          />
          <StatusPill
            icon={ScanSearch}
            label="Mode"
            value="Placeholder context"
          />
        </div>

        <div className="hidden h-5 md:block">
          <Separator orientation="vertical" />
        </div>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 md:justify-end">
          <StatusPill
            className="border-primary/20 bg-primary/5"
            icon={Activity}
            label="Status"
            value="Waiting for real signals"
          />
          <StatusPill
            icon={Sparkles}
            label="Next"
            value="Decide what belongs here"
          />
        </div>
      </div>
    </div>
  );
}
