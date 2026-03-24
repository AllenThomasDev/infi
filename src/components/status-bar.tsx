import { NotepadText, NotepadTextDashed } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StatusBarProps {
  hasNotes?: boolean;
  notesOpen?: boolean;
  onToggleNotes?: () => void;
  showNotesButton?: boolean;
}

export function StatusBar({
  hasNotes = false,
  notesOpen = false,
  onToggleNotes,
  showNotesButton = false,
}: StatusBarProps) {
  const Icon = hasNotes ? NotepadText : NotepadTextDashed;

  return (
    <div className="draglayer flex h-13 shrink-0 items-center border-sidebar-border border-b bg-sidebar px-2">
      {showNotesButton ? (
        <Button
          onClick={onToggleNotes}
          size="icon-sm"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          title="Notes"
          variant={notesOpen ? "secondary" : "ghost"}
        >
          <Icon className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
