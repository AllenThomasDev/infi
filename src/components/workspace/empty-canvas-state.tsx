import { GitBranchPlus } from "lucide-react";
import { ShortcutKbd } from "@/components/shortcut-tooltip";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { KeybindingCommand } from "@/keybindings/types";

interface EmptyCanvasStateProps {
  actionCommand?: KeybindingCommand;
  actionLabel?: string;
  description: string;
  onAction?: () => void;
  title: string;
}

export function EmptyCanvasState({
  actionCommand,
  actionLabel,
  description,
  onAction,
  title,
}: EmptyCanvasStateProps) {
  return (
    <Empty className="h-full border-0">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <GitBranchPlus />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {actionLabel && onAction ? (
        <EmptyContent>
          <Button onClick={onAction} size="lg" variant="outline">
            <GitBranchPlus data-icon="inline-start" />
            {actionLabel}
            {actionCommand && <ShortcutKbd command={actionCommand} />}
          </Button>
        </EmptyContent>
      ) : null}
    </Empty>
  );
}
