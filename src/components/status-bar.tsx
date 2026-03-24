import type { ReactNode } from "react";

interface StatusBarProps {
  children?: ReactNode;
}

export function StatusBar({ children }: StatusBarProps) {
  return (
    <div className="draglayer flex h-10 shrink-0 items-center border-sidebar-border border-b bg-sidebar px-3 text-xs text-muted-foreground">
      {children}
    </div>
  );
}
