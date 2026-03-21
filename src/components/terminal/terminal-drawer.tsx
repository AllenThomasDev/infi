import { X } from "lucide-react";
import TerminalView from "./terminal-view";

export interface TerminalSession {
  id: string;
  title: string;
}

interface TerminalDrawerProps {
  activeTerminalId: string | null;
  onCloseTerminal: (id: string) => void;
  terminals: TerminalSession[];
}

export default function TerminalDrawer({
  activeTerminalId,
  onCloseTerminal,
  terminals,
}: TerminalDrawerProps) {
  if (terminals.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {terminals.map((terminal, index) => {
        const isActive = terminal.id === activeTerminalId;

        return (
          <div
            className="pointer-events-none absolute right-4 bottom-4 h-[420px] w-[min(720px,calc(100%-2rem))]"
            key={terminal.id}
            style={{
              transform: `translate(${-index * 20}px, ${-index * 20}px)`,
              zIndex: isActive ? terminals.length + 1 : index + 1,
            }}
          >
            <div className="pointer-events-auto flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-2xl">
              <div className="flex items-center justify-between border-b px-3 py-1.5">
                <span className="font-medium text-muted-foreground text-xs">
                  {terminal.title}
                </span>
                <button
                  aria-label={`Close ${terminal.title}`}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => onCloseTerminal(terminal.id)}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1 p-1">
                <TerminalView terminalId={terminal.id} visible={true} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
