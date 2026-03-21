import TerminalView from "./terminal-view";

interface TerminalDrawerProps {
  open: boolean;
}

export default function TerminalDrawer({ open }: TerminalDrawerProps) {
  return (
    <div
      className={`border-t bg-card transition-[height] duration-200 ${open ? "h-[40%]" : "h-0"}`}
      style={{ overflow: "hidden" }}
    >
      {open && (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b px-3 py-1.5">
            <span className="text-muted-foreground text-xs font-medium">
              Terminal
            </span>
          </div>
          <div className="min-h-0 flex-1 p-1">
            <TerminalView visible={open} />
          </div>
        </div>
      )}
    </div>
  );
}
