import { createContext, useContext } from "react";

interface WorkspaceContextValue {
  directory?: string;
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(
  null
);

export function useWorkspaceContext() {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error(
      "useWorkspaceContext must be used within a WorkspaceContext"
    );
  }

  return context;
}
