import { GitBranchPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyCanvasStateProps {
  onCreateCanvas?: () => void;
}

export function EmptyCanvasState({ onCreateCanvas }: EmptyCanvasStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
      <GitBranchPlus className="size-12 opacity-40" />
      <p className="text-sm">
        Select a branch or create a new one to get started
      </p>
      {onCreateCanvas ? (
        <Button onClick={onCreateCanvas} size="lg" variant="outline">
          <GitBranchPlus className="mr-2 size-4" />
          New Branch
        </Button>
      ) : null}
    </div>
  );
}
