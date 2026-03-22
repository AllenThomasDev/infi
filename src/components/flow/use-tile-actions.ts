import { createContext, useContext } from "react";
import type { NodeType } from "@/components/flow/node-factories";

export interface TileActions {
  remove: (nodeId: string) => void;
  replace: (nodeId: string, type: NodeType) => void;
}

export const TileActionsContext = createContext<TileActions | null>(null);

export function useTileActions(): TileActions {
  const ctx = useContext(TileActionsContext);
  if (!ctx) throw new Error("TileActionsContext: no provider found");
  return ctx;
}
