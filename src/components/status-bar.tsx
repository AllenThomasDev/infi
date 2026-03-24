import type { ReactNode } from "react";

interface StatusBarProps {
  children?: ReactNode;
}

export function StatusBar({ children }: StatusBarProps) {
  return (
    <div className="draglayer flex h-13 shrink-0 items-center border-sidebar-border border-b bg-sidebar px-2">
      {children}
    </div>
  );
}
